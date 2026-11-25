// HTTP handling for /api/* (framework-free: web Request in, Response out, so the same
// code runs in Netlify Functions, the local server, and the tests).
//
// Synchronous endpoints answer in milliseconds and never call Claude:
//   GET  /api/config            key configured? password required? limits
//   POST /api/auth              check APP_PASSWORD
//   POST /api/jobs              validate + rate-limit + store a job -> 202 { jobId, pollToken, runToken }
//   GET  /api/jobs/:id?token=   job status, progress and partial/final text (from storage)
// The Claude work runs in the background function POST /api/run-job (see createWorker).
import { checkPassword, createRateLimiter, limitsFrom } from "./security.mjs";
import { ORCHESTRATOR, indexAgents } from "./prompts.mjs";
import { checkPollToken, newJob, pollToken, publicView, runJob, runToken } from "./jobs.mjs";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

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
  while (recent.length && recent[0].role !== "user") recent.shift(); // must start with a user turn
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

/** Synchronous API handler. `getStore` returns the persistent job store. */
export function createHandler({ data, env = process.env, getStore, logger = console } = {}) {
  const { bySlug } = indexAgents(data);
  const rateLimiter = createRateLimiter();
  const authLimiter = createRateLimiter();
  const log = (...args) => logger.error?.("[experts21]", ...args);

  function requirePassword(req) {
    if (!checkPassword(env, req.headers.get("x-app-password"))) {
      throw new HttpError(401, "unauthorized", "This app is password-protected. Enter the access password to continue.");
    }
  }

  // Runs after input validation, right before work that will be billed.
  function guard(req, ctx, limits, cost) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new HttpError(503, "missing_api_key",
        "The server has no ANTHROPIC_API_KEY. Add it in Netlify: Site configuration > Environment variables, then redeploy.");
    }
    const r = rateLimiter(clientIp(req, ctx), limits, Date.now(), cost);
    if (!r.ok) {
      throw new HttpError(429, "rate_limited",
        r.scope === "global"
          ? "This site has reached its hourly request limit. Please try again later."
          : `You've reached the hourly limit of ${limits.rateLimitPerHour} expert calls (a whole-team question uses up to ${limits.maxTeamExperts + 2}). Please try again later.`,
        { retryAfter: r.retryAfter });
    }
  }

  async function createJob(req, ctx, limits) {
    const body = await readJson(req, limits);
    let job;
    if (body.kind === "team") {
      const question = requireString(body.question, "question", limits.maxQuestionChars);
      guard(req, ctx, limits, limits.maxTeamExperts + 2);
      job = newJob("team", { question });
    } else if (body.kind === "expert") {
      const slug = requireString(body.agent, "agent", 100);
      if (!bySlug.has(slug)) throw new HttpError(404, "unknown_agent", `No expert named "${slug}".`);
      if (slug === ORCHESTRATOR) {
        throw new HttpError(400, "use_team", "Ava (orchestrator) answers through Ask the Whole Team.");
      }
      const messages = validateHistory(body.messages, limits);
      guard(req, ctx, limits, 1);
      job = newJob("expert", { agent: slug, messages });
    } else {
      throw new HttpError(400, "bad_request", `"kind" must be "expert" or "team".`);
    }
    const store = await getStore();
    await store.set(job.id, job);
    return json(202, {
      jobId: job.id,
      kind: job.kind,
      pollToken: pollToken(env, job.id),
      runToken: runToken(env, job.id),
    });
  }

  async function getJob(req, id, url) {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(404, "job_not_found", "Unknown job.");
    if (!checkPollToken(env, id, url.searchParams.get("token"))) {
      throw new HttpError(403, "forbidden", "This job belongs to another session.");
    }
    const store = await getStore();
    const job = await store.get(id);
    if (!job) throw new HttpError(404, "job_not_found", "This job was not found. It may have expired; please ask again.");
    return json(200, publicView(job));
  }

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
      if (p === "/api/jobs") {
        if (req.method !== "POST") throw new HttpError(405, "method_not_allowed", "Method not allowed.");
        requirePassword(req); // first, before reading or validating anything
        return await createJob(req, ctx, limits);
      }
      const m = p.match(/^\/api\/jobs\/([^/]+)$/);
      if (m) {
        if (req.method !== "GET") throw new HttpError(405, "method_not_allowed", "Method not allowed.");
        requirePassword(req);
        return await getJob(req, m[1], url);
      }
      if (["/api/config", "/api/auth"].includes(p)) throw new HttpError(405, "method_not_allowed", "Method not allowed.");
      throw new HttpError(404, "not_found", "Unknown API endpoint.");
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err);
      log("unhandled", err?.message);
      return json(500, { error: { code: "internal_error", message: "Unexpected server error. Please try again." } });
    }
  };
}

/**
 * Background worker (POST /api/run-job). Netlify answers the caller with 202 immediately;
 * this keeps running for up to 15 minutes and writes progress to the job store.
 */
export function createWorker({ data, env = process.env, getStore, clientFactory, logger = console } = {}) {
  return async function work(req) {
    try {
      if (!checkPassword(env, req.headers.get("x-app-password"))) {
        logger.error?.("[experts21 worker] rejected: bad password");
        return new Response(null, { status: 401 });
      }
      const body = JSON.parse((await req.text()) || "{}");
      const store = await getStore();
      const result = await runJob({ jobId: body.jobId, token: body.runToken, store, env, data, clientFactory, logger });
      return json(200, result);
    } catch (err) {
      logger.error?.("[experts21 worker] crashed", err?.message);
      return new Response(null, { status: 500 });
    }
  };
}
