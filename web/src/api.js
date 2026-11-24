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

/**
 * POST to a streaming endpoint and call onEvent for each NDJSON event.
 * Resolves with the list of events; throws ApiError for HTTP or stream errors.
 */
export async function streamRequest(path, body, { password, onEvent, signal } = {}) {
  let res;
  try {
    res = await fetch(path, { method: "POST", headers: headers(password), body: JSON.stringify(body), signal });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("network_error", "Could not reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) throw await errorFrom(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line);
      if (ev.type === "error") throw new ApiError(ev.code, ev.message, 200);
      events.push(ev);
      onEvent?.(ev);
    }
  }
  if (!events.some((e) => e.type === "done" || e.type === "plan")) {
    throw new ApiError("incomplete_response", "The response ended early (the server function may have hit its time limit). Try again or ask a shorter question.", 200);
  }
  return events;
}

/** Run a whole-team question: route -> experts (in parallel) -> synthesis. */
export async function runTeam(question, { password, onUpdate, concurrency = 3, signal }) {
  const state = { stage: "routing", plan: null, experts: {}, final: "", finalMeta: null, error: null };
  const emit = () => onUpdate({ ...state, experts: { ...state.experts } });
  emit();

  // 1. Ava routes the question (structured JSON plan, signed by the server).
  const routeEvents = await streamRequest("/api/team/route", { question }, { password, signal });
  const planEvent = routeEvents.find((e) => e.type === "plan");
  state.plan = planEvent.plan;
  state.stage = "experts";
  for (const e of state.plan.experts) state.experts[e.agent] = { status: "waiting", text: "", meta: null, done: null, error: null };
  emit();

  // 2. Each selected expert answers independently (separate Claude calls, own model and prompt).
  const queue = [...state.plan.experts];
  async function worker() {
    while (queue.length) {
      const e = queue.shift();
      const slot = state.experts[e.agent];
      slot.status = "running";
      emit();
      try {
        const events = await streamRequest(
          "/api/expert",
          { agent: e.agent, team: { question, plan: state.plan, planSignature: planEvent.planSignature } },
          {
            password,
            signal,
            onEvent: (ev) => {
              if (ev.type === "meta") slot.meta = ev;
              if (ev.type === "delta") slot.text += ev.text;
              emit();
            },
          },
        );
        slot.done = events.find((x) => x.type === "done");
        slot.refusal = events.find((x) => x.type === "refusal") || null;
        slot.status = slot.done?.signature ? "done" : "failed";
        if (!slot.done?.signature) slot.error = slot.refusal ? slot.refusal.message : "No usable answer.";
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        slot.status = "failed";
        slot.error = err.message;
      }
      emit();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

  const contributions = state.plan.experts
    .filter((e) => state.experts[e.agent].status === "done")
    .map((e) => ({ agent: e.agent, answer: state.experts[e.agent].text, signature: state.experts[e.agent].done.signature }));
  if (!contributions.length) {
    throw new ApiError("no_contributions", "None of the selected experts could answer, so there is nothing to combine.", 0);
  }

  // 3. Ava combines the verified answers into one recommendation.
  state.stage = "synthesizing";
  emit();
  await streamRequest(
    "/api/team/synthesize",
    { question, plan: state.plan, planSignature: planEvent.planSignature, contributions },
    {
      password,
      signal,
      onEvent: (ev) => {
        if (ev.type === "delta") state.final += ev.text;
        if (ev.type === "done") state.finalMeta = ev;
        if (ev.type === "refusal") state.refusal = ev.message;
        emit();
      },
    },
  );
  state.stage = "done";
  emit();
  return state;
}
