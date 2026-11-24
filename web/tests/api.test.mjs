// Tests for the Netlify Function handler, using the real @anthropic-ai/sdk against a
// local mock of the Anthropic Messages API (no real API key or network needed).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import teamData from "../server/_generated/team-data.mjs";
import { createHandler } from "../server/lib/handler.mjs";
import { startMockAnthropic } from "./helpers/mock-anthropic.mjs";

let mock;
before(async () => {
  mock = await startMockAnthropic();
});
after(async () => mock.close());

const quiet = { error: () => {} };
function makeHandler(env = {}) {
  return createHandler({
    data: teamData,
    env: { ANTHROPIC_API_KEY: "sk-ant-test-key", ...env },
    clientFactory: (e) => new Anthropic({ apiKey: e.ANTHROPIC_API_KEY, baseURL: mock.url, maxRetries: 0 }),
    logger: quiet,
  });
}

const post = (path, body, headers = {}) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

async function events(res) {
  const text = await res.text();
  return text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const ask = (agent, content = "What are the top three risks in the Brickell lease?") => ({
  agent,
  messages: [{ role: "user", content }],
});

describe("GET /api/config", () => {
  test("reports missing API key and password requirement without revealing them", async () => {
    const h = createHandler({ data: teamData, env: {}, logger: quiet });
    const body = await (await h(new Request("http://localhost/api/config"))).json();
    assert.equal(body.apiKeyConfigured, false);
    assert.equal(body.passwordRequired, false);
    assert.equal(body.experts, 26);

    const h2 = makeHandler({ APP_PASSWORD: "hunter2-secret" });
    const res = await h2(new Request("http://localhost/api/config"));
    const text = await res.text();
    assert.equal(JSON.parse(text).passwordRequired, true);
    assert.equal(JSON.parse(text).apiKeyConfigured, true);
    assert.ok(!text.includes("hunter2-secret") && !text.includes("sk-ant-test-key"), "config must not leak secrets");
  });
});

describe("configuration errors", () => {
  test("missing ANTHROPIC_API_KEY returns 503 missing_api_key with a helpful message", async () => {
    const h = createHandler({ data: teamData, env: {}, logger: quiet });
    const res = await h(post("/api/expert", ask("lease-negotiation-specialist")));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, "missing_api_key");
    assert.match(body.error.message, /Netlify/);
  });

  test("an invalid key reported by the API surfaces as invalid_api_key in the stream", async () => {
    mock.state.mode = "auth_error";
    try {
      const res = await makeHandler()(post("/api/expert", ask("cafe-operations-manager")));
      const ev = await events(res);
      const err = ev.find((e) => e.type === "error");
      assert.equal(err.code, "invalid_api_key");
    } finally {
      mock.state.mode = "ok";
    }
  });

  test("upstream overload surfaces as upstream_error", async () => {
    mock.state.mode = "overloaded";
    try {
      const ev = await events(await makeHandler()(post("/api/expert", ask("cafe-operations-manager"))));
      assert.equal(ev.find((e) => e.type === "error").code, "upstream_error");
    } finally {
      mock.state.mode = "ok";
    }
  });
});

describe("APP_PASSWORD authentication", () => {
  const h = makeHandler({ APP_PASSWORD: "correct horse" });
  test("no password -> 401", async () => {
    const res = await h(post("/api/expert", ask("lease-negotiation-specialist")));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "unauthorized");
  });
  test("wrong password -> 401", async () => {
    const res = await h(post("/api/expert", ask("lease-negotiation-specialist"), { "x-app-password": "wrong" }));
    assert.equal(res.status, 401);
  });
  test("password is checked before input validation (no info leak)", async () => {
    const res = await h(post("/api/expert", { agent: "nope" }));
    assert.equal(res.status, 401);
  });
  test("correct password -> 200 stream", async () => {
    const res = await h(post("/api/expert", ask("lease-negotiation-specialist"), { "x-app-password": "correct horse" }));
    assert.equal(res.status, 200);
    assert.ok((await events(res)).some((e) => e.type === "done"));
  });
  test("/api/auth validates the password server-side", async () => {
    assert.equal((await h(post("/api/auth", {}, { "x-app-password": "wrong" }))).status, 401);
    assert.equal((await h(post("/api/auth", {}, { "x-app-password": "correct horse" }))).status, 200);
  });
  test("no APP_PASSWORD configured -> open access", async () => {
    const res = await makeHandler()(post("/api/auth", {}));
    assert.equal(res.status, 200);
  });
});

describe("request limits", () => {
  test("per-IP rate limit returns 429 with retry-after", async () => {
    const h = makeHandler({ RATE_LIMIT_PER_HOUR: "2" });
    const ctx = { ip: "203.0.113.7" };
    for (let i = 0; i < 2; i++) {
      const res = await h(post("/api/expert", ask("cafe-operations-manager")), ctx);
      assert.equal(res.status, 200);
      await res.text();
    }
    const res = await h(post("/api/expert", ask("cafe-operations-manager")), ctx);
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get("retry-after")) > 0);
    assert.equal((await res.json()).error.code, "rate_limited");
    // a different IP is not affected
    const other = await h(post("/api/expert", ask("cafe-operations-manager")), { ip: "198.51.100.1" });
    assert.equal(other.status, 200);
    await other.text();
  });
  test("too-long question -> 400 too_long", async () => {
    const res = await makeHandler()(post("/api/expert", ask("cafe-operations-manager", "x".repeat(2001))));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "too_long");
  });
  test("oversized body -> 413", async () => {
    const res = await makeHandler()(post("/api/expert", { agent: "cafe-operations-manager", pad: "x".repeat(250_000) }));
    assert.equal(res.status, 413);
  });
  test("unknown agent -> 404; orchestrator must use the team endpoint", async () => {
    assert.equal((await makeHandler()(post("/api/expert", ask("made-up-expert")))).status, 404);
    const res = await makeHandler()(post("/api/expert", ask("orchestrator")));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "use_team_endpoint");
  });
  test("conversation must end with a user message", async () => {
    const res = await makeHandler()(post("/api/expert", {
      agent: "cafe-operations-manager",
      messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }],
    }));
    assert.equal(res.status, 400);
  });
  test("history is capped and max_tokens is bounded", async () => {
    mock.state.requests.length = 0;
    const messages = [];
    for (let i = 0; i < 20; i++) messages.push({ role: i % 2 ? "assistant" : "user", content: `turn ${i}` });
    messages.push({ role: "user", content: "latest question" });
    const res = await makeHandler()(post("/api/expert", { agent: "cafe-operations-manager", messages }));
    await res.text();
    const sent = mock.state.requests.at(-1).body;
    assert.ok(sent.messages.length <= 8, `sent ${sent.messages.length} messages`);
    assert.equal(sent.messages[0].role, "user");
    assert.equal(sent.messages.at(-1).content, "latest question");
    assert.ok(sent.max_tokens <= 4000);
  });
});

describe("individual expert path", () => {
  test("Marcus (lease, opus) gets his agent file, skills, knowledge folder incl. the lease, and research", async () => {
    mock.state.requests.length = 0;
    const res = await makeHandler()(post("/api/expert", ask("lease-negotiation-specialist")));
    const ev = await events(res);
    const meta = ev.find((e) => e.type === "meta");
    assert.equal(meta.firstName, "Marcus");
    assert.equal(meta.model, "opus");
    assert.equal(meta.modelId, "claude-opus-5-5");
    const answer = ev.filter((e) => e.type === "delta").map((e) => e.text).join("");
    assert.match(answer, /Marcus here\. MOCK ANSWER from claude-opus-5-5/);
    assert.match(answer, /knowledge\/lease-negotiation-specialist\/sample-brickell-lease\.md/);
    const done = ev.find((e) => e.type === "done");
    assert.equal(done.stopReason, "end_turn");
    assert.equal(done.signature, undefined, "individual answers are not team contributions");

    const req = mock.state.requests.at(-1);
    const sys = req.body.system[0].text;
    assert.equal(req.body.model, "claude-opus-5-5");
    assert.deepEqual(req.body.system[0].cache_control, { type: "ephemeral" });
    assert.match(sys, /# Lease Negotiation Specialist \(A08\)/, "agent definition included");
    assert.match(sys, /- \*\*Name:\*\* Marcus/, "persona included");
    assert.match(sys, /BEGIN SKILL lease-permit-contingency-review/, "preloaded skill included");
    assert.match(sys, /Base rent: \$78 per square foot/, "knowledge document content included");
    assert.match(sys, /BEGIN FILE docs\/05-operating-costs\.md/, "research included");
    assert.match(sys, /Never invent regulatory requirements/, "CLAUDE.md ground rules included");
    assert.equal(req.body.output_config.effort, "medium");
    assert.equal(req.body.fallbacks, "default", "refusal fallback enabled for Opus 5.5");
    assert.match(String(req.headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    // SDK 1.x sends the key as "Authorization: Bearer <key>" (older SDKs used x-api-key).
    const sentKey = req.headers["x-api-key"] ?? String(req.headers.authorization ?? "").replace(/^Bearer /, "");
    assert.equal(sentKey, "sk-ant-test-key", "key is sent only server -> Anthropic");
  });

  test("Diego (haiku) uses claude-haiku-5-5, no fallback beta, and his README-only folder", async () => {
    mock.state.requests.length = 0;
    const ev = await events(await makeHandler()(post("/api/expert", ask("competitive-intelligence-analyst"))));
    assert.equal(ev.find((e) => e.type === "meta").modelId, "claude-haiku-5-5");
    const req = mock.state.requests.at(-1);
    assert.equal(req.body.model, "claude-haiku-5-5");
    assert.equal(req.body.fallbacks, undefined);
    assert.match(req.body.system[0].text, /contains ONLY README\.md - no additional documents have been provided/);
  });

  test("every one of the 25 directly-askable agents maps to the right model and persona", async () => {
    const h = makeHandler({ RATE_LIMIT_PER_HOUR: "1000" });
    const ids = { opus: "claude-opus-5-5", sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
    for (const a of teamData.agents.filter((x) => x.slug !== "orchestrator")) {
      mock.state.requests.length = 0;
      const ev = await events(await h(post("/api/expert", ask(a.slug, "Briefly, who are you?"))));
      const meta = ev.find((e) => e.type === "meta");
      assert.equal(meta.firstName, a.firstName, a.slug);
      assert.equal(mock.state.requests.at(-1).body.model, ids[a.model], a.slug);
      assert.ok(mock.state.requests.at(-1).body.system[0].text.includes(`.claude/agents/${a.slug}.md`), a.slug);
    }
  });

  test("model IDs can be overridden per family with MODEL_* env vars", async () => {
    mock.state.requests.length = 0;
    const res = await makeHandler({ MODEL_SONNET: "claude-sonnet-5" })(post("/api/expert", ask("cafe-operations-manager")));
    await res.text();
    assert.equal(mock.state.requests.at(-1).body.model, "claude-sonnet-5");
  });
});

describe("whole-team (orchestrator) path", () => {
  const question = "We found a Brickell space at $78/sq ft NNN with no grease trap. Should we sign?";

  async function routeOnce(h) {
    const ev = await events(await h(post("/api/team/route", { question })));
    return ev.find((e) => e.type === "plan");
  }

  test("route -> experts -> synthesize performs real, verified multi-expert coordination", async () => {
    const h = makeHandler({ RATE_LIMIT_PER_HOUR: "100" });
    mock.state.requests.length = 0;

    // 1. Routing: Ava (opus) returns a structured plan; server filters + signs it.
    const planEv = await routeOnce(h);
    assert.ok(planEv, "plan event returned");
    const routeReq = mock.state.requests.at(-1);
    assert.equal(routeReq.body.model, "claude-opus-5-5");
    assert.equal(routeReq.body.output_config.format.type, "json_schema");
    assert.ok(routeReq.body.output_config.format.schema.properties.experts.items.properties.agent.enum.length === 24);
    assert.match(routeReq.body.system[0].text, /ROUTING STAGE/);
    assert.match(routeReq.body.system[0].text, /Route by meaning, not by keywords/);
    const agents = planEv.plan.experts.map((e) => e.agent);
    assert.deepEqual(agents, [
      "lease-negotiation-specialist",
      "financial-modeling-funding-strategist",
      "environmental-utility-compliance-specialist",
    ], "duplicates and non-specialists removed");
    assert.ok(planEv.planSignature);

    // 2. Each expert answers in its own Claude call with its own model and prompt.
    const contributions = [];
    for (const agent of agents) {
      const ev = await events(await h(post("/api/expert", {
        agent, team: { question, plan: planEv.plan, planSignature: planEv.planSignature },
      })));
      const answer = ev.filter((e) => e.type === "delta").map((e) => e.text).join("");
      const done = ev.find((e) => e.type === "done");
      assert.ok(done.signature, `${agent} answer signed`);
      const req = mock.state.requests.at(-1);
      assert.match(req.body.system[0].text, /one of several experts consulted by Ava/);
      assert.match(req.body.messages[0].content, /Ava's brief for you/);
      contributions.push({ agent, answer, signature: done.signature });
    }
    const models = mock.state.requests.slice(-3).map((r) => r.body.model);
    assert.deepEqual(models, ["claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"]);

    // 3. Synthesis: Ava combines only the verified answers.
    const synthEv = await events(await h(post("/api/team/synthesize", {
      question, plan: planEv.plan, planSignature: planEv.planSignature, contributions,
    })));
    const meta = synthEv.find((e) => e.type === "meta");
    assert.deepEqual(meta.contributors, agents);
    const final = synthEv.filter((e) => e.type === "delta").map((e) => e.text).join("");
    assert.match(final, /^## Routing decision/);
    assert.match(final, /combining 3 experts/);
    const synthReq = mock.state.requests.at(-1);
    assert.match(synthReq.body.system[0].text, /SYNTHESIS STAGE/);
    for (const c of contributions) assert.ok(synthReq.body.messages[0].content.includes(c.answer), "real answer passed verbatim");
    assert.deepEqual(synthEv.find((e) => e.type === "done").contributors, agents);
  });

  test("synthesis rejects a fabricated or edited expert answer", async () => {
    const h = makeHandler({ RATE_LIMIT_PER_HOUR: "100" });
    const planEv = await routeOnce(h);
    const agent = planEv.plan.experts[0].agent;
    const ev = await events(await h(post("/api/expert", { agent, team: { question, plan: planEv.plan, planSignature: planEv.planSignature } })));
    const answer = ev.filter((e) => e.type === "delta").map((e) => e.text).join("");
    const signature = ev.find((e) => e.type === "done").signature;

    const tampered = await h(post("/api/team/synthesize", {
      question, plan: planEv.plan, planSignature: planEv.planSignature,
      contributions: [{ agent, answer: answer + " (edited)", signature }],
    }));
    assert.equal(tampered.status, 400);
    assert.equal((await tampered.json()).error.code, "unverified_contribution");

    const fake = await h(post("/api/team/synthesize", {
      question, plan: planEv.plan, planSignature: planEv.planSignature,
      contributions: [{ agent, answer: "I made this up", signature: "not-a-signature" }],
    }));
    assert.equal(fake.status, 400);
  });

  test("a forged plan or an expert outside the plan is rejected", async () => {
    const h = makeHandler({ RATE_LIMIT_PER_HOUR: "100" });
    const planEv = await routeOnce(h);
    const forged = { ...planEv.plan, experts: [...planEv.plan.experts, { agent: "growth-expansion-strategist", reason: "x", brief: "x" }] };
    const r1 = await h(post("/api/expert", { agent: "growth-expansion-strategist", team: { question, plan: forged, planSignature: planEv.planSignature } }));
    assert.equal(r1.status, 400);
    assert.equal((await r1.json()).error.code, "invalid_plan");
    const r2 = await h(post("/api/expert", { agent: "growth-expansion-strategist", team: { question, plan: planEv.plan, planSignature: planEv.planSignature } }));
    assert.equal(r2.status, 400);
    assert.equal((await r2.json()).error.code, "not_in_plan");
  });

  test("the team size is capped by MAX_TEAM_EXPERTS", async () => {
    const h = makeHandler({ MAX_TEAM_EXPERTS: "2" });
    const planEv = await routeOnce(h);
    assert.equal(planEv.plan.experts.length, 2);
  });

  test("synthesis with no contributions is rejected", async () => {
    const h = makeHandler();
    const planEv = await routeOnce(h);
    const res = await h(post("/api/team/synthesize", { question, plan: planEv.plan, planSignature: planEv.planSignature, contributions: [] }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "no_contributions");
  });
});

test("unknown endpoints and wrong methods", async () => {
  const h = makeHandler();
  assert.equal((await h(new Request("http://localhost/api/nope"))).status, 404);
  assert.equal((await h(new Request("http://localhost/api/expert"))).status, 405);
});
