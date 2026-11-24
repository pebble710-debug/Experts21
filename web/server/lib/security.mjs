// Access control and cost protection for the API function.
import crypto from "node:crypto";

export function intEnv(env, name, fallback) {
  const n = Number.parseInt(env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function limitsFrom(env) {
  return {
    maxQuestionChars: intEnv(env, "MAX_QUESTION_CHARS", 2000),
    maxHistoryMessages: intEnv(env, "MAX_HISTORY_MESSAGES", 8),
    maxHistoryChars: intEnv(env, "MAX_HISTORY_CHARS", 24000),
    maxTeamExperts: Math.min(intEnv(env, "MAX_TEAM_EXPERTS", 5), 8),
    maxBodyBytes: 200_000,
    rateLimitPerHour: intEnv(env, "RATE_LIMIT_PER_HOUR", 60),
    globalLimitPerHour: intEnv(env, "GLOBAL_LIMIT_PER_HOUR", 400),
    expertMaxTokens: intEnv(env, "EXPERT_MAX_TOKENS", 4000),
    routeMaxTokens: intEnv(env, "ROUTE_MAX_TOKENS", 3000),
    synthMaxTokens: intEnv(env, "SYNTH_MAX_TOKENS", 5000),
    maxContributionChars: 16000,
  };
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest();

/** Constant-time password check. Returns true when no APP_PASSWORD is configured. */
export function checkPassword(env, provided) {
  const expected = env.APP_PASSWORD;
  if (!expected) return true;
  if (typeof provided !== "string" || provided.length === 0) return false;
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}

/**
 * Best-effort in-memory rate limiter (per client IP and per function instance).
 * Netlify may run several instances, so treat this as a brake, not a hard cap;
 * set a spend limit in the Anthropic Console as the hard cap.
 */
export function createRateLimiter() {
  const buckets = new Map();
  let global = { start: 0, count: 0 };
  return function hit(ip, limits, now = Date.now()) {
    const hour = 3_600_000;
    if (now - global.start >= hour) global = { start: now, count: 0 };
    if (global.count >= limits.globalLimitPerHour) {
      return { ok: false, retryAfter: Math.ceil((global.start + hour - now) / 1000), scope: "global" };
    }
    const key = ip || "unknown";
    let b = buckets.get(key);
    if (!b || now - b.start >= hour) {
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    if (b.count >= limits.rateLimitPerHour) {
      return { ok: false, retryAfter: Math.ceil((b.start + hour - now) / 1000), scope: "ip" };
    }
    b.count += 1;
    global.count += 1;
    if (buckets.size > 5000) buckets.clear(); // keep memory bounded
    return { ok: true, remaining: limits.rateLimitPerHour - b.count };
  };
}

/**
 * HMAC signatures prove that a routing plan and each expert answer really came from
 * this server's Claude calls, so the synthesis step only combines genuine expert work.
 * Key: SIGNING_SECRET if set, otherwise derived from ANTHROPIC_API_KEY (never sent to clients).
 */
function signingKey(env) {
  return sha256(`experts21-signing:${env.SIGNING_SECRET || env.ANTHROPIC_API_KEY || ""}`);
}

export function sign(env, payload) {
  return crypto.createHmac("sha256", signingKey(env)).update(JSON.stringify(payload)).digest("base64url");
}

export function verify(env, payload, signature) {
  if (typeof signature !== "string") return false;
  const expected = Buffer.from(sign(env, payload));
  const got = Buffer.from(signature);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

export const hashText = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
