// Request handling for /api/* (framework-free: takes a web Request, returns a Response,
// so the same code runs in Netlify Functions, the local server, and the tests).
import { describeApiError, makeClient, modelIdFor, streamClaude } from "./anthropic.mjs";
import {
  checkPassword,
  createRateLimiter,
  hashText,
  limitsFrom,
  sign,
  verify,
} from "./security.mjs";
import {
  ORCHESTRATOR,
  expertSystemPrompt,
  indexAgents,
  routePlanSchema,
  routeSystemPrompt,
  synthesisSystemPrompt,
  synthesisUserMessage,
  teamExpertUserMessage,
} from "./prompts.mjs";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const NDJSON_HEADERS = {
  "content-type": "application/x-ndjson; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const errorResponse = (e) =>
  json(e.status, { error: { code: e.code, message: e.message, ...e.extra } },
    e.extra?.retryAfter ? { "retry-after": String(e.extra.retryAfter) } : {});

function ndjson(events, log) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (ev) => controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      try {
        for await (const ev of events) send(ev);
      } catch (err) {
        const d = err instanceof HttpError ? { code: err.code, message: err.message } : describeApiError(err);
        log("stream error", d.code, err?.status ?? "", err?.message ?? "");
        send({ type: "error", code: d.code, message: d.message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { status: 200, headers: NDJSON_HEADERS });
}

function clientIp(req, ctx) {
  return (
    ctx?.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

async function readJson(req, limits) {
  const text = await req.text();
  if (Buffer.byteLength(text) > limits.maxBodyBytes) throw new HttpError(413, "payload_too_large", "Request is too large.");
  try {
    const body = JSON.parse(text || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch {
    throw new HttpError(400, "bad_request", "Request body must be a JSON object.");
  }
}

function requireString(v, name, max) {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, "bad_request", `"${name}" is required.`);
  if (v.length > max) throw new HttpError(400, "too_long", `"${name}" is too long (max ${max} characters).`);
  return v.trim();
}

function validateHistory(messages, limits) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError(400, "bad_request", `"messages" must be a non-empty array.`);
  }
  const recent = messages.slice(-limits.maxHistoryMessages);
  // The conversation sent to Claude must start with a user turn.
  while (recent.length && recent[0].role !== "user") recent.shift();
  let total = 0;
  const out = [];
  for (const [i, m] of recent.entries()) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) {
      throw new HttpError(400, "bad_request", "Each message needs a role (user/assistant) and text content.");
    }
    const isLast = i === recent.length - 1;
    if (isLast && m.role !== "user") throw new HttpError(400, "bad_request", "The last message must be from the user.");
    if (isLast && m.content.length > limits.maxQuestionChars) {
      throw new HttpError(400, "too_long", `Your question is too long (max ${limits.maxQuestionChars} characters).`);
    }
    total += m.content.length;
    out.push({ role: m.role, content: m.content });
  }
  if (total > limits.maxHistoryChars) throw new HttpError(400, "too_long", "The conversation is too long. Start a new chat.");
  if (!out.length) throw new HttpError(400, "bad_request", "No user message found.");
  return out;
}

export function createHandler({ data, env = process.env, clientFactory = makeClient, logger = console } = {}) {
  const { bySlug, specialists } = indexAgents(data);
  const specialistSlugs = specialists.map((a) => a.slug);
  const rateLimiter = createRateLimiter();
  const authLimiter = createRateLimiter();
  const log = (...args) => logger.error?.("[experts21]", ...args);

  function requirePassword(req) {
    if (!checkPassword(env, req.headers.get("x-app-password"))) {
      throw new HttpError(401, "unauthorized", "This app is password-protected. Enter the access password to continue.");
    }
  }

  // Runs after input validation, right before a billable Claude call.
  function guard(req, ctx, limits) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new HttpError(503, "missing_api_key",
        "The server has no ANTHROPIC_API_KEY. Add it in Netlify: Site configuration > Environment variables, then redeploy.");
    }
    const r = rateLimiter(clientIp(req, ctx), limits);
    if (!r.ok) {
      throw new HttpError(429, "rate_limited",
        r.scope === "global"
          ? "This site has reached its hourly request limit. Please try again later."
          : `You've reached the limit of ${limits.rateLimitPerHour} expert requests per hour. Please try again later.`,
        { retryAfter: r.retryAfter });
    }
  }

  // ---------------------------------------------------------------- POST /api/expert
  async function expert(req, ctx, limits) {
    const body = await readJson(req, limits);
    const slug = requireString(body.agent, "agent", 100);
    const agent = bySlug.get(slug);
    if (!agent) throw new HttpError(404, "unknown_agent", `No expert named "${slug}".`);
    if (slug === ORCHESTRATOR) {
      throw new HttpError(400, "use_team_endpoint", "Ava (orchestrator) answers through Ask the Whole Team.");
    }
    let messages;
    let teamInfo = null;
    if (body.team) {
      const { question, plan, planSignature } = body.team;
      requireString(question, "team.question", limits.maxQuestionChars);
      if (!plan || !verify(env, { kind: "plan", questionHash: hashText(question), plan }, planSignature)) {
        throw new HttpError(400, "invalid_plan", "The team plan is missing or was not issued by this server.");
      }
      const entry = plan.experts.find((e) => e.agent === slug);
      if (!entry) throw new HttpError(400, "not_in_plan", `${slug} is not part of this team plan.`);
      messages = [{ role: "user", content: teamExpertUserMessage(question, entry.brief) }];
      teamInfo = { questionHash: hashText(question) };
    } else {
      messages = validateHistory(body.messages, limits);
    }
    guard(req, ctx, limits);

    const modelId = modelIdFor(agent.model, env);
    const client = clientFactory(env);
    const system = expertSystemPrompt(agent, data, teamInfo ? "team" : "individual");
    async function* run() {
      yield { type: "meta", agent: slug, firstName: agent.firstName, title: agent.title, model: agent.model, modelId };
      let final;
      for await (const ev of streamClaude(client, {
        modelId, system, messages, maxTokens: limits.expertMaxTokens, effort: "medium",
      })) {
        if (ev.type === "delta") yield ev;
        else final = ev;
      }
      if (final.stopReason === "refusal") {
        yield { type: "refusal", message: "Claude declined to answer this request.", category: final.stopDetails?.category ?? null };
      }
      const done = {
        type: "done",
        stopReason: final.stopReason,
        model: final.model,
        fallbackUsed: final.fallbackUsed,
        usage: final.usage,
        truncated: final.stopReason === "max_tokens",
      };
      if (teamInfo && final.stopReason !== "refusal" && final.text.trim()) {
        done.signature = sign(env, { kind: "expert", agent: slug, questionHash: teamInfo.questionHash, answerHash: hashText(final.text) });
      }
      yield done;
    }
    return ndjson(run(), log);
  }

  // ---------------------------------------------------------------- POST /api/team/route
  async function route(req, ctx, limits) {
    const body = await readJson(req, limits);
    const question = requireString(body.question, "question", limits.maxQuestionChars);
    guard(req, ctx, limits);
    const ava = bySlug.get(ORCHESTRATOR);
    const modelId = modelIdFor(ava.model, env);
    const client = clientFactory(env);
    async function* run() {
      yield { type: "meta", stage: "route", agent: ORCHESTRATOR, firstName: ava.firstName, model: ava.model, modelId };
      let final;
      for await (const ev of streamClaude(client, {
        modelId,
        system: routeSystemPrompt(data, limits.maxTeamExperts),
        messages: [{ role: "user", content: `Owner's question:\n\n${question}` }],
        maxTokens: limits.routeMaxTokens,
        effort: "medium",
        outputFormat: { type: "json_schema", schema: routePlanSchema(specialistSlugs) },
      })) {
        if (ev.type === "final") final = ev;
        else yield { type: "progress" }; // keep the connection visibly alive
      }
      if (final.stopReason === "refusal") throw new HttpError(422, "refusal", "Claude declined to route this question.");
      let raw;
      try {
        raw = JSON.parse(final.text);
      } catch {
        throw new HttpError(502, "bad_plan", "The orchestrator returned an unreadable routing plan. Please try again.");
      }
      const seen = new Set();
      const experts = (raw.experts ?? [])
        .filter((e) => specialistSlugs.includes(e.agent) && !seen.has(e.agent) && seen.add(e.agent))
        .slice(0, limits.maxTeamExperts)
        .map((e) => ({ agent: e.agent, reason: String(e.reason ?? ""), brief: String(e.brief ?? "") }));
      if (!experts.length) throw new HttpError(502, "empty_plan", "The orchestrator did not select any experts. Try rephrasing the question.");
      const plan = {
        problems: (raw.problems ?? []).map((p) => ({ problem: String(p.problem ?? ""), implied: Boolean(p.implied) })),
        experts,
        left_out: (raw.left_out ?? []).filter((e) => specialistSlugs.includes(e.agent))
          .map((e) => ({ agent: e.agent, reason: String(e.reason ?? "") })),
        assumptions: String(raw.assumptions ?? ""),
      };
      const signature = sign(env, { kind: "plan", questionHash: hashText(question), plan });
      yield { type: "plan", plan, planSignature: signature, model: final.model, usage: final.usage };
    }
    return ndjson(run(), log);
  }

  // ---------------------------------------------------------------- POST /api/team/synthesize
  async function synthesize(req, ctx, limits) {
    const body = await readJson(req, limits);
    const question = requireString(body.question, "question", limits.maxQuestionChars);
    const { plan, planSignature } = body;
    if (!plan || !verify(env, { kind: "plan", questionHash: hashText(question), plan }, planSignature)) {
      throw new HttpError(400, "invalid_plan", "The team plan is missing or was not issued by this server.");
    }
    const planAgents = new Set(plan.experts.map((e) => e.agent));
    const contributions = [];
    for (const c of Array.isArray(body.contributions) ? body.contributions : []) {
      if (!c || !planAgents.has(c.agent) || typeof c.answer !== "string") {
        throw new HttpError(400, "invalid_contribution", "A contribution does not match the team plan.");
      }
      if (c.answer.length > limits.maxContributionChars) throw new HttpError(400, "too_long", "An expert answer is too long.");
      const ok = verify(env, { kind: "expert", agent: c.agent, questionHash: hashText(question), answerHash: hashText(c.answer) }, c.signature);
      if (!ok) {
        throw new HttpError(400, "unverified_contribution",
          `The answer attributed to ${c.agent} was not produced by this server's expert call, so it cannot be combined.`);
      }
      contributions.push({ agent: c.agent, answer: c.answer });
    }
    if (!contributions.length) throw new HttpError(400, "no_contributions", "No verified expert answers to combine.");
    guard(req, ctx, limits);
    const ava = bySlug.get(ORCHESTRATOR);
    const modelId = modelIdFor(ava.model, env);
    const client = clientFactory(env);
    async function* run() {
      yield {
        type: "meta", stage: "synthesize", agent: ORCHESTRATOR, firstName: ava.firstName, model: ava.model, modelId,
        contributors: contributions.map((c) => c.agent),
      };
      let final;
      for await (const ev of streamClaude(client, {
        modelId,
        system: synthesisSystemPrompt(data),
        messages: [{ role: "user", content: synthesisUserMessage(question, plan, contributions, bySlug) }],
        maxTokens: limits.synthMaxTokens,
        effort: "medium",
      })) {
        if (ev.type === "delta") yield ev;
        else final = ev;
      }
      if (final.stopReason === "refusal") {
        yield { type: "refusal", message: "Claude declined to combine these answers.", category: final.stopDetails?.category ?? null };
      }
      yield {
        type: "done", stopReason: final.stopReason, model: final.model, fallbackUsed: final.fallbackUsed,
        usage: final.usage, truncated: final.stopReason === "max_tokens", contributors: contributions.map((c) => c.agent),
      };
    }
    return ndjson(run(), log);
  }

  // ---------------------------------------------------------------- router
  return async function handle(req, ctx = {}) {
    const limits = limitsFrom(env);
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, "");
    try {
      if (req.method === "GET" && p === "/api/config") {
        return json(200, {
          apiKeyConfigured: Boolean(env.ANTHROPIC_API_KEY),
          passwordRequired: Boolean(env.APP_PASSWORD),
          experts: data.agents.length,
          limits: {
            maxQuestionChars: limits.maxQuestionChars,
            maxTeamExperts: limits.maxTeamExperts,
            rateLimitPerHour: limits.rateLimitPerHour,
          },
        });
      }
      if (req.method === "POST" && p === "/api/auth") {
        const r = authLimiter(clientIp(req, ctx), { ...limits, rateLimitPerHour: 20 });
        if (!r.ok) throw new HttpError(429, "rate_limited", "Too many password attempts. Try again later.", { retryAfter: r.retryAfter });
        if (!checkPassword(env, req.headers.get("x-app-password"))) {
          throw new HttpError(401, "unauthorized", "That password is not correct.");
        }
        return json(200, { ok: true });
      }
      const endpoints = { "/api/expert": expert, "/api/team/route": route, "/api/team/synthesize": synthesize };
      if (req.method === "POST" && endpoints[p]) {
        requirePassword(req); // first, before reading or validating anything
        return await endpoints[p](req, ctx, limits);
      }
      if (["/api/config", "/api/auth", "/api/expert", "/api/team/route", "/api/team/synthesize"].includes(p)) {
        throw new HttpError(405, "method_not_allowed", "Method not allowed.");
      }
      throw new HttpError(404, "not_found", "Unknown API endpoint.");
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err);
      log("unhandled", err?.message);
      return json(500, { error: { code: "internal_error", message: "Unexpected server error." } });
    }
  };
}
