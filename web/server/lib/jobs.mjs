// Background job workflow.
//
// Why: a whole-team answer is several Claude calls (Ava routes, 1-5 specialists answer,
// Ava combines). Together they can take minutes, far beyond Netlify's 60-second limit
// for normal/streaming functions. So the work runs in a Netlify *background* function
// (15-minute limit) and progress is saved to persistent storage (Netlify Blobs); the
// browser polls a fast status endpoint. Nothing depends on in-memory state shared
// between invocations.
import crypto from "node:crypto";
import { describeApiError, makeClient, modelIdFor, streamClaude } from "./anthropic.mjs";
import { limitsFrom, sign, verify } from "./security.mjs";
import {
  ORCHESTRATOR,
  expertSystemPrompt,
  indexAgents,
  individualMessages,
  routePlanSchema,
  routeSystemPrompt,
  synthesisSystemPrompt,
  synthesisUserMessage,
  teamExpertUserMessage,
} from "./prompts.mjs";

export const HEARTBEAT_MS = 2000;
export const STALE_MS = 120_000; // a running job with no heartbeat for 2 minutes has died
export const QUEUE_TIMEOUT_MS = 90_000; // a queued job that never started (worker not triggered)

export class JobError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const pollToken = (env, id) => sign(env, { kind: "poll", id });
export const runToken = (env, id) => sign(env, { kind: "run", id });
export const checkPollToken = (env, id, token) => verify(env, { kind: "poll", id }, token);
export const checkRunToken = (env, id, token) => verify(env, { kind: "run", id }, token);

export function newJob(kind, input, now = Date.now()) {
  return {
    id: crypto.randomUUID(),
    kind,
    status: "queued", // queued -> running -> done | failed
    stage: "queued", // expert: answering; team: routing -> experts -> synthesizing
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    input,
    plan: null,
    experts: null,
    final: null,
    answer: null,
    error: null,
  };
}

/** What the browser may see (no stored conversation history). */
export function publicView(job, now = Date.now()) {
  let { status, error } = job;
  if (status === "running" && now - job.updatedAt > STALE_MS) {
    status = "failed";
    error = { code: "job_stalled", message: "The background worker stopped responding. Please try again." };
  } else if (status === "queued" && now - job.createdAt > QUEUE_TIMEOUT_MS) {
    status = "failed";
    error = { code: "job_not_started", message: "The background worker never started this job. Please try again." };
  }
  return {
    id: job.id,
    kind: job.kind,
    status,
    stage: job.stage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    updatedAt: job.updatedAt,
    agent: job.input?.agent ?? null,
    plan: job.plan,
    experts: job.experts,
    final: job.final,
    answer: job.answer,
    error,
  };
}

function createFlusher(store, job, log) {
  let chain = Promise.resolve();
  const flush = () => {
    job.updatedAt = Date.now();
    const snapshot = JSON.stringify(job);
    chain = chain.then(() => store.set(job.id, JSON.parse(snapshot))).catch((e) => log("store write failed", e?.message));
    return chain;
  };
  const timer = setInterval(flush, HEARTBEAT_MS); // progress + heartbeat
  return {
    flush,
    async stop() {
      clearInterval(timer);
      await flush();
    },
  };
}

async function collect(client, opts, onDelta) {
  let final;
  for await (const ev of streamClaude(client, opts)) {
    if (ev.type === "delta") onDelta(ev.text);
    else final = ev;
  }
  return final;
}

/**
 * Run one job to completion. Called by the background function.
 * Safe against duplicate invocations: only a job in "queued" state is claimed.
 */
export async function runJob({ jobId, token, store, env, data, clientFactory = makeClient, logger = console }) {
  const log = (...a) => logger.error?.("[experts21 worker]", ...a);
  if (!jobId || !checkRunToken(env, jobId, token)) {
    log("rejected run request (bad token)");
    return { ran: false, reason: "bad_token" };
  }
  const job = await store.get(jobId);
  if (!job || job.status !== "queued") return { ran: false, reason: job ? `status_${job.status}` : "not_found" };

  const limits = limitsFrom(env);
  const { bySlug, specialists } = indexAgents(data);
  const specialistSlugs = specialists.map((a) => a.slug);
  const client = clientFactory(env, { timeoutMs: limits.callTimeoutMs });
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), limits.jobDeadlineMs);

  job.status = "running";
  job.startedAt = Date.now();
  const flusher = createFlusher(store, job, log);
  await flusher.flush();

  try {
    if (job.kind === "expert") {
      const agent = bySlug.get(job.input.agent);
      const modelId = modelIdFor(agent.model, env);
      job.stage = "answering";
      job.answer = { agent: agent.slug, model: agent.model, modelId, text: "", status: "running" };
      const final = await collect(
        client,
        {
          modelId,
          system: expertSystemPrompt(agent, data),
          messages: individualMessages(job.input.messages),
          maxTokens: limits.expertMaxTokens,
          effort: "medium",
          signal: deadline.signal,
        },
        (t) => (job.answer.text += t),
      );
      Object.assign(job.answer, finalInfo(final));
      job.answer.status = final.stopReason === "refusal" ? "refused" : "done";
    } else {
      await runTeam(job, { client, env, data, limits, bySlug, specialistSlugs, signal: deadline.signal, flusher, log });
    }
    job.stage = "done";
    job.status = "done";
  } catch (err) {
    const d = err instanceof JobError ? { code: err.code, message: err.message } : describeApiError(err);
    log("job failed", job.id, d.code, err?.status ?? "", err?.message ?? "");
    job.status = "failed";
    job.error = { code: d.code, message: d.message };
  } finally {
    clearTimeout(deadlineTimer);
    job.finishedAt = Date.now();
    await flusher.stop();
  }
  return { ran: true, status: job.status };
}

function finalInfo(final) {
  return {
    servedModel: final.model,
    stopReason: final.stopReason,
    truncated: final.stopReason === "max_tokens",
    fallbackUsed: final.fallbackUsed,
    usage: final.usage,
    refusal: final.stopReason === "refusal" ? "Claude declined to answer this request." : null,
  };
}

async function runTeam(job, { client, env, data, limits, bySlug, specialistSlugs, signal, flusher, log }) {
  const question = job.input.question;
  const ava = bySlug.get(ORCHESTRATOR);
  const avaModel = modelIdFor(ava.model, env);

  // 1. Ava routes the question by meaning (structured JSON plan).
  job.stage = "routing";
  await flusher.flush();
  const routed = await collect(
    client,
    {
      modelId: avaModel,
      system: routeSystemPrompt(data, limits.maxTeamExperts),
      messages: [{ role: "user", content: `Owner's question:\n\n${question}` }],
      maxTokens: limits.routeMaxTokens,
      effort: "medium",
      outputFormat: { type: "json_schema", schema: routePlanSchema(specialistSlugs) },
      signal,
    },
    () => {},
  );
  if (routed.stopReason === "refusal") throw new JobError("refusal", "Claude declined to route this question.");
  let raw;
  try {
    raw = JSON.parse(routed.text);
  } catch {
    throw new JobError(
      "bad_plan",
      routed.stopReason === "max_tokens"
        ? "Ava's routing plan was cut off. Please try again or shorten the question."
        : "Ava returned an unreadable routing plan. Please try again.",
    );
  }
  const seen = new Set();
  const experts = (raw.experts ?? [])
    .filter((e) => specialistSlugs.includes(e.agent) && !seen.has(e.agent) && seen.add(e.agent))
    .slice(0, limits.maxTeamExperts)
    .map((e) => ({ agent: e.agent, reason: String(e.reason ?? ""), brief: String(e.brief ?? "") }));
  if (!experts.length) throw new JobError("empty_plan", "Ava did not select any experts. Try rephrasing the question.");
  job.plan = {
    problems: (raw.problems ?? []).map((p) => ({ problem: String(p.problem ?? ""), implied: Boolean(p.implied) })),
    experts,
    left_out: (raw.left_out ?? []).filter((e) => specialistSlugs.includes(e.agent))
      .map((e) => ({ agent: e.agent, reason: String(e.reason ?? "") })),
    assumptions: String(raw.assumptions ?? ""),
    routeModel: routed.model,
  };
  job.experts = Object.fromEntries(
    experts.map((e) => {
      const a = bySlug.get(e.agent);
      return [e.agent, { status: "waiting", text: "", model: a.model, modelId: modelIdFor(a.model, env), error: null }];
    }),
  );

  // 2. Every selected specialist answers independently and concurrently,
  //    each with its own model, instructions, skills, knowledge folder and research.
  job.stage = "experts";
  await flusher.flush();
  await Promise.all(
    experts.map(async (e) => {
      const agent = bySlug.get(e.agent);
      const slot = job.experts[e.agent];
      slot.status = "running";
      slot.startedAt = Date.now();
      try {
        const final = await collect(
          client,
          {
            modelId: slot.modelId,
            system: expertSystemPrompt(agent, data),
            messages: [{ role: "user", content: teamExpertUserMessage(question, e.brief) }],
            maxTokens: limits.teamExpertMaxTokens,
            effort: "medium",
            signal,
          },
          (t) => (slot.text += t),
        );
        Object.assign(slot, finalInfo(final));
        if (final.stopReason === "refusal" || !slot.text.trim()) {
          slot.status = "failed";
          slot.error = { code: "refusal", message: slot.refusal || "No usable answer." };
        } else {
          slot.status = "done";
        }
      } catch (err) {
        if (signal.aborted) throw err;
        const d = describeApiError(err);
        log("expert failed", e.agent, d.code, err?.message ?? "");
        slot.status = "failed";
        slot.error = { code: d.code, message: d.message };
      } finally {
        slot.finishedAt = Date.now();
      }
    }),
  );
  const contributions = experts
    .filter((e) => job.experts[e.agent].status === "done")
    .map((e) => ({ agent: e.agent, answer: job.experts[e.agent].text }));
  if (!contributions.length) {
    const first = Object.values(job.experts).find((s) => s.error)?.error;
    throw new JobError(first?.code ?? "no_contributions",
      `None of the selected experts could answer${first ? `: ${first.message}` : "."}`);
  }

  // 3. Ava combines the real answers into one recommendation.
  job.stage = "synthesizing";
  job.final = { text: "", model: ava.model, modelId: avaModel, contributors: contributions.map((c) => c.agent) };
  await flusher.flush();
  const synth = await collect(
    client,
    {
      modelId: avaModel,
      system: synthesisSystemPrompt(data),
      messages: [{ role: "user", content: synthesisUserMessage(question, job.plan, contributions, bySlug) }],
      maxTokens: limits.synthMaxTokens,
      effort: "medium",
      signal,
    },
    (t) => (job.final.text += t),
  );
  Object.assign(job.final, finalInfo(synth));
}
