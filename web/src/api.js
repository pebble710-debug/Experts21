// Browser-side API client. Talks only to this site's own /api/* function;
// the Anthropic API key never reaches the browser.

const PASSWORD_KEY = "experts21.appPassword";

export function getPassword() {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) || "";
  } catch {
    return "";
  }
}

export function setPassword(pw) {
  try {
    if (pw) sessionStorage.setItem(PASSWORD_KEY, pw);
    else sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* storage unavailable: password is kept in memory by the caller */
  }
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function headers(password) {
  const h = { "content-type": "application/json" };
  if (password) h["x-app-password"] = password;
  return h;
}

async function errorFrom(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error (e.g. platform timeout page) */
  }
  if (body?.error) return new ApiError(body.error.code, body.error.message, res.status);
  if (res.status === 404) {
    return new ApiError("api_not_found", "The API function was not found. Deploy with Netlify (or run the local server) so /api/* is available.", 404);
  }
  if (res.status === 502 || res.status === 504) {
    return new ApiError("function_timeout", "The server function timed out or crashed. Try a shorter question, or check the Netlify function logs.", res.status);
  }
  return new ApiError("http_error", `Request failed with status ${res.status}.`, res.status);
}

export async function getConfig() {
  const res = await fetch("/api/config", { headers: { accept: "application/json" } });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function checkPassword(password) {
  const res = await fetch("/api/auth", { method: "POST", headers: headers(password), body: "{}" });
  if (!res.ok) throw await errorFrom(res);
  return true;
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    }, { once: true });
  });

const CLIENT_TIMEOUT_MS = 14 * 60_000; // background jobs stop at 15 minutes
const MAX_CONSECUTIVE_POLL_FAILURES = 8;

/**
 * Start a job: the fast API stores it and returns tokens, then the browser starts the
 * background worker (Netlify returns 202 immediately). Claude work never runs inside a
 * normal request, so no request can hit the platform time limit.
 */
export async function startJob(body, { password, signal } = {}) {
  let res;
  try {
    res = await fetch("/api/jobs", { method: "POST", headers: headers(password), body: JSON.stringify(body), signal });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("network_error", "Could not reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) throw await errorFrom(res);
  const job = await res.json();
  let run;
  try {
    run = await fetch("/api/run-job", {
      method: "POST",
      headers: headers(password),
      body: JSON.stringify({ jobId: job.jobId, runToken: job.runToken }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("worker_not_started", "Could not start the experts. Check your connection and try again.", 0);
  }
  if (!run.ok) {
    throw new ApiError("worker_not_started", `Could not start the experts (status ${run.status}). Please try again.`, run.status);
  }
  return { jobId: job.jobId, pollToken: job.pollToken, kind: job.kind };
}

/**
 * Poll a job until it finishes. Calls onUpdate(view, { connection }) on every change.
 * Transient network/server errors are retried with backoff; if they persist, throws
 * ApiError("connection_lost") carrying the job so the caller can resume polling.
 */
export async function pollJob(job, { password, onUpdate, signal } = {}) {
  const started = Date.now();
  let failures = 0;
  let last = null;
  for (let i = 0; ; i++) {
    if (Date.now() - started > CLIENT_TIMEOUT_MS) {
      throw Object.assign(new ApiError("job_timeout", "The experts are taking unusually long. Try again later.", 0), { job });
    }
    let res;
    try {
      res = await fetch(`/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`, {
        headers: headers(password),
        signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      res = null;
    }
    if (res && res.ok) {
      failures = 0;
      last = await res.json();
      onUpdate?.(last, { connection: "ok" });
      if (last.status === "done") return last;
      if (last.status === "failed") {
        throw Object.assign(new ApiError(last.error?.code || "job_failed", last.error?.message || "The request failed."), { view: last });
      }
    } else if (res && [401, 403, 404].includes(res.status)) {
      throw await errorFrom(res); // not transient
    } else {
      failures += 1;
      onUpdate?.(last, { connection: "retrying" });
      if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        throw Object.assign(
          new ApiError("connection_lost", "Lost contact with the server. Your question is still being worked on; select Try again to reconnect.", 0),
          { job, view: last },
        );
      }
      await sleep(Math.min(1000 * 2 ** failures, 8000), signal);
      continue;
    }
    await sleep(i < 10 ? 1000 : 1500, signal);
  }
}
