// Thin wrapper around the official Anthropic SDK (@anthropic-ai/sdk).
// The API key is read from the server environment only (Netlify env var ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";

// Agent model aliases (from .claude/agents/*.md `model:`) -> Claude API model IDs.
// Override per family with MODEL_OPUS / MODEL_SONNET / MODEL_HAIKU env vars if needed.
const DEFAULT_MODEL_IDS = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
};
// Server-side refusal fallback (re-runs a declined request on a fallback model inside
// the same call). Supported for the Opus 5.5 / Sonnet 5.5 families; not for Haiku 5.5.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

export function modelIdFor(alias, env = process.env) {
  const override = env[`MODEL_${String(alias).toUpperCase()}`];
  return override || DEFAULT_MODEL_IDS[alias] || DEFAULT_MODEL_IDS.sonnet;
}

export function makeClient(env = process.env, { timeoutMs = 240_000 } = {}) {
  // Claude calls run inside the background worker (15-minute platform limit), never
  // inside a synchronous request, so a generous per-call timeout is safe here.
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: timeoutMs });
}

/** Map SDK errors to stable app error codes + friendly messages. */
export function describeApiError(err) {
  if (err instanceof Anthropic.APIUserAbortError || err?.name === "AbortError") {
    return { code: "job_deadline", status: 504, message: "The experts took longer than the time limit for one question. Try a narrower question." };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { code: "invalid_api_key", status: 502, message: "The Anthropic API rejected the server's API key. Check ANTHROPIC_API_KEY in your Netlify environment variables." };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return { code: "api_permission_denied", status: 502, message: "The Anthropic API key does not have permission for this model or feature." };
  }
  if (err instanceof Anthropic.NotFoundError) {
    return { code: "model_not_found", status: 502, message: "The configured Claude model was not found. Check MODEL_OPUS / MODEL_SONNET / MODEL_HAIKU." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { code: "anthropic_rate_limited", status: 429, message: "The Anthropic API rate limit was reached. Wait a minute and try again." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { code: "anthropic_bad_request", status: 502, message: `The Anthropic API rejected the request: ${err.message}` };
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { code: "upstream_timeout", status: 504, message: "The Claude API took too long to respond. Try a shorter question." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { code: "upstream_unreachable", status: 502, message: "Could not reach the Anthropic API." };
  }
  if (err instanceof Anthropic.APIError) {
    return { code: "upstream_error", status: 502, message: `The Anthropic API returned an error (${err.status ?? "unknown"}). Try again shortly.` };
  }
  return { code: "internal_error", status: 500, message: "Unexpected server error." };
}

function requestParams({ modelId, system, messages, maxTokens, effort, outputFormat }) {
  const params = {
    model: modelId,
    max_tokens: maxTokens,
    // One large, stable system block per agent -> cache it (repeat questions reuse it).
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort, ...(outputFormat ? { format: outputFormat } : {}) },
  };
  if (FALLBACK_MODELS.has(modelId)) {
    params.betas = [FALLBACK_BETA];
    params.fallbacks = "default";
  }
  return params;
}

/**
 * Stream a Claude response. Yields { type: "delta", text } events, then one
 * { type: "final", text, stopReason, model, usage, fallbackUsed } event.
 */
export async function* streamClaude(client, opts) {
  const params = requestParams(opts);
  const reqOpts = opts.signal ? { signal: opts.signal } : undefined; // lets the worker stop at its deadline
  const stream = params.betas ? client.beta.messages.stream(params, reqOpts) : client.messages.stream(params, reqOpts);
  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      text += event.delta.text;
      yield { type: "delta", text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  const fallbackUsed = (final.usage?.iterations ?? []).some((i) => i.type === "fallback_message");
  yield {
    type: "final",
    text,
    stopReason: final.stop_reason,
    stopDetails: final.stop_details ?? null,
    model: final.model,
    fallbackUsed,
    usage: {
      input_tokens: final.usage?.input_tokens ?? 0,
      output_tokens: final.usage?.output_tokens ?? 0,
      cache_read_input_tokens: final.usage?.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: final.usage?.cache_creation_input_tokens ?? 0,
    },
  };
}
