// A local stand-in for the Anthropic Messages API, used by the tests so the real
// @anthropic-ai/sdk code path (request building + SSE stream parsing) runs without
// a real API key. It records every request so tests can inspect what was sent.
import http from "node:http";

function sse(res, model, text) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("message_start", {
    type: "message_start",
    message: {
      id: "msg_mock", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 1200, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 1100 },
    },
  });
  send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  // split into a few chunks to exercise incremental streaming
  const chunks = text.match(/[\s\S]{1,40}/g) || [""];
  for (const c of chunks) send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: c } });
  send("content_block_stop", { type: "content_block_stop", index: 0 });
  send("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 42 } });
  send("message_stop", { type: "message_stop" });
  res.end();
}

function systemText(body) {
  return Array.isArray(body.system) ? body.system.map((b) => b.text).join("\n") : String(body.system ?? "");
}

export async function startMockAnthropic(options = {}) {
  const state = {
    requests: [],
    mode: options.mode ?? "ok", // "ok" | "auth_error" | "overloaded"
    planExperts: options.planExperts ?? [
      { agent: "lease-negotiation-specialist", reason: "Lease terms", brief: "Review the lease terms." },
      { agent: "financial-modeling-funding-strategist", reason: "Affordability", brief: "Test the rent against sales." },
      { agent: "environmental-utility-compliance-specialist", reason: "Grease trap", brief: "DERM requirements." },
    ],
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      state.requests.push({ path: req.url, headers: req.headers, body });
      if (state.mode === "auth_error") {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
      }
      if (state.mode === "overloaded") {
        res.writeHead(529, { "content-type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
      }
      const system = systemText(body);
      let text;
      if (body.output_config?.format) {
        // Routing stage: return a plan, plus junk the server must filter out.
        text = JSON.stringify({
          problems: [{ problem: "Decide whether to sign the lease", implied: false }, { problem: "Grease-trap compliance", implied: true }],
          experts: [
            ...state.planExperts,
            { agent: state.planExperts[0].agent, reason: "duplicate", brief: "dup" }, // duplicate -> dropped
            { agent: "orchestrator", reason: "not allowed", brief: "x" }, // not a specialist -> dropped
          ],
          left_out: [{ agent: "social-media-community-manager", reason: "Not a marketing question" }],
          assumptions: "Address is in the City of Miami.",
        });
      } else if (system.includes("SYNTHESIS STAGE")) {
        const msg = body.messages.at(-1).content;
        const experts = [...msg.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
        text = `## Routing decision\nMOCK SYNTHESIS combining ${experts.length} experts:\n${experts.map((e) => `- ${e}`).join("\n")}\n\n## Recommendation\nDo not sign as written. [ESTIMATE]`;
      } else {
        const name = system.match(/- \*\*Name:\*\* (\S+)/)?.[1] ?? "Unknown";
        const files = [...system.matchAll(/--- BEGIN FILE (knowledge\/[^ ]+) ---/g)].map((m) => m[1]);
        text = `${name} here. MOCK ANSWER from ${body.model}. Knowledge files seen: ${files.join(", ")}. [ESTIMATE]`;
      }
      if (body.stream) return sse(res, body.model, text);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        id: "msg_mock", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
      }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, state, close: () => new Promise((r) => server.close(r)) };
}
