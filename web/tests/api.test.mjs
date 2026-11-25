// Tests for the job-based API: the synchronous handler (/api/config, /api/auth, /api/jobs)
// and the background worker (/api/run-job), using the real @anthropic-ai/sdk against a
// local mock of the Anthropic Messages API (no real API key or network needed).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import teamData from "../server/_generated/team-data.mjs";
import { createHandler, createWorker } from "../server/lib/handler.mjs";
import { createFileStore, createMemoryStore } from "../server/lib/store.mjs";
import { STALE_MS, publicView } from "../server/lib/jobs.mjs";
import { expertSystemPrompt } from "../server/lib/prompts.mjs";
import { startMockAnthropic } from "./helpers/mock-anthropic.mjs";

let mock;
before(async () => {
  mock = await startMockAnthropic();
});
after(async () => mock.close());
beforeEach(() => {
  mock.state.requests.length = 0;
  mock.state.mode = "ok";
  mock.state.delayMs = 0;
  mock.state.failFor = null;
  mock.state.maxActive = 0;
});

const quiet = { error: () => {} };

function makeApp(env = {}, store = createMemoryStore()) {
  const fullEnv = { ANTHROPIC_API_KEY: "sk-ant-test-key", RATE_LIMIT_PER_HOUR: "1000", ...env };
  const getStore = async () => store;
  const clientFactory = (e, { timeoutMs } = {}) =>
    new Anthropic({ apiKey: e.ANTHROPIC_API_KEY, baseURL: mock.url, maxRetries: 0, timeout: timeoutMs });
  return {
    store,
    handle: createHandler({ data: teamData, env: fullEnv, getStore, logger: quiet }),
    work: createWorker({ data: teamData, env: fullEnv, getStore, clientFactory, logger: quiet }),
  };
}

const req = (method, p, body, headers = {}) =>
  new Request(`http://localhost${p}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const expertJob = (agent, content = "What are the top three risks in the Brickell lease?") => ({
  kind: "expert",
  agent,
  messages: [{ role: "user", content }],
});
const QUESTION = "We found a Brickell space at $78/sq ft NNN with no grease trap. Should we sign?";

/** Create a job, run the background worker, return the final public status. */
async function runToCompletion(app, body, headers = {}, ctx = {}) {
  const created = await app.handle(req("POST", "/api/jobs", body, headers), ctx);
  assert.equal(created.status, 202, `create job: ${await created.clone().text()}`);
  const job = await created.json();
  const workRes = await app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }, headers));
  const result = await workRes.json();
  const status = await app.handle(req("GET", `/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`, undefined, headers));
  assert.equal(status.status, 200);
  return { job, result, view: await status.json() };
}

describe("GET /api/config", () => {
  test("reports missing key / password requirement without revealing them", async () => {
    const h = createHandler({ data: teamData, env: {}, getStore: async () => createMemoryStore(), logger: quiet });
    const body = await (await h(req("GET", "/api/config"))).json();
    assert.equal(body.apiKeyConfigured, false);
    assert.equal(body.passwordRequired, false);
    assert.equal(body.experts, 26);
    const app = makeApp({ APP_PASSWORD: "hunter2-secret" });
    const text = await (await app.handle(req("GET", "/api/config"))).text();
    assert.equal(JSON.parse(text).passwordRequired, true);
    assert.ok(!text.includes("hunter2-secret") && !text.includes("sk-ant-test-key"));
  });
});

describe("synchronous endpoints never wait on Claude (cannot hit the platform time limit)", () => {
  test("POST /api/jobs returns 202 quickly and makes no Claude call", async () => {
    mock.state.delayMs = 5000; // even with a very slow model
    const app = makeApp();
    const t0 = Date.now();
    const res = await app.handle(req("POST", "/api/jobs", { kind: "team", question: QUESTION }));
    assert.equal(res.status, 202);
    assert.ok(Date.now() - t0 < 500, "job creation is fast");
    assert.equal(mock.state.requests.length, 0, "no Claude call in the synchronous request");
    const job = await res.json();
    const poll = await app.handle(req("GET", `/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`));
    assert.equal((await poll.json()).status, "queued");
  });
});

describe("configuration and upstream errors", () => {
  test("missing ANTHROPIC_API_KEY -> 503 missing_api_key", async () => {
    const h = createHandler({ data: teamData, env: {}, getStore: async () => createMemoryStore(), logger: quiet });
    const res = await h(req("POST", "/api/jobs", expertJob("lease-negotiation-specialist")));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, "missing_api_key");
    assert.match(body.error.message, /Netlify/);
  });

  test("a rejected key makes the job fail with invalid_api_key (no secret in the message)", async () => {
    mock.state.mode = "auth_error";
    const { view } = await runToCompletion(makeApp(), expertJob("cafe-operations-manager"));
    assert.equal(view.status, "failed");
    assert.equal(view.error.code, "invalid_api_key");
    assert.ok(!JSON.stringify(view).includes("sk-ant-test-key"));
  });

  test("an overloaded API makes an expert job fail with upstream_error", async () => {
    mock.state.mode = "overloaded";
    const { view } = await runToCompletion(makeApp(), expertJob("cafe-operations-manager"));
    assert.equal(view.error.code, "upstream_error");
  });

  test("the job deadline stops runaway work with job_deadline", async () => {
    mock.state.delayMs = 1500;
    const { view } = await runToCompletion(makeApp({ JOB_DEADLINE_MS: "300" }), expertJob("cafe-operations-manager"));
    assert.equal(view.status, "failed");
    assert.equal(view.error.code, "job_deadline");
  });
});

describe("APP_PASSWORD authentication", () => {
  const PW = { "x-app-password": "correct horse" };
  test("job creation requires the password (checked before validation)", async () => {
    const app = makeApp({ APP_PASSWORD: "correct horse" });
    assert.equal((await app.handle(req("POST", "/api/jobs", expertJob("lease-negotiation-specialist")))).status, 401);
    assert.equal((await app.handle(req("POST", "/api/jobs", expertJob("lease-negotiation-specialist"), { "x-app-password": "wrong" }))).status, 401);
    assert.equal((await app.handle(req("POST", "/api/jobs", { agent: "nope" }))).status, 401);
    assert.equal((await app.handle(req("POST", "/api/jobs", expertJob("lease-negotiation-specialist"), PW))).status, 202);
  });
  test("status polling and the background worker require the password too", async () => {
    const app = makeApp({ APP_PASSWORD: "correct horse" });
    const job = await (await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager"), PW))).json();
    const url = `/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`;
    assert.equal((await app.handle(req("GET", url))).status, 401);
    const w = await app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }));
    assert.equal(w.status, 401);
    assert.equal(mock.state.requests.length, 0, "unauthenticated worker call did no Claude work");
    assert.equal((await (await app.handle(req("GET", url, undefined, PW))).json()).status, "queued");
  });
  test("/api/auth validates the password server-side", async () => {
    const app = makeApp({ APP_PASSWORD: "correct horse" });
    assert.equal((await app.handle(req("POST", "/api/auth", {}, { "x-app-password": "wrong" }))).status, 401);
    assert.equal((await app.handle(req("POST", "/api/auth", {}, PW))).status, 200);
    assert.equal((await makeApp().handle(req("POST", "/api/auth", {}))).status, 200);
  });
});

describe("job tokens and worker safety", () => {
  test("poll token is required and bound to the job", async () => {
    const app = makeApp();
    const a = await (await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")))).json();
    const b = await (await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")))).json();
    assert.equal((await app.handle(req("GET", `/api/jobs/${a.jobId}`))).status, 403);
    assert.equal((await app.handle(req("GET", `/api/jobs/${a.jobId}?token=${encodeURIComponent(b.pollToken)}`))).status, 403);
    assert.equal((await app.handle(req("GET", "/api/jobs/not-a-real-id?token=x"))).status, 404);
  });
  test("a bad run token runs nothing; a duplicate worker call does not re-run the job", async () => {
    const app = makeApp();
    const job = await (await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")))).json();
    const bad = await (await app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: "forged" }))).json();
    assert.equal(bad.ran, false);
    assert.equal(mock.state.requests.length, 0);
    const first = await (await app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }))).json();
    const second = await (await app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }))).json();
    assert.equal(first.ran, true);
    assert.equal(second.ran, false);
    assert.equal(mock.state.requests.length, 1, "exactly one Claude call");
  });
  test("stale or never-started jobs are reported as failed with a clear code", () => {
    const now = Date.now();
    const running = { id: "x", status: "running", updatedAt: now - STALE_MS - 1, createdAt: now - 300_000, input: {} };
    assert.equal(publicView(running, now).error.code, "job_stalled");
    const queued = { id: "y", status: "queued", updatedAt: now - 200_000, createdAt: now - 200_000, input: {} };
    assert.equal(publicView(queued, now).error.code, "job_not_started");
  });
  test("the status view never returns the stored conversation", async () => {
    const { view } = await runToCompletion(makeApp(), expertJob("cafe-operations-manager", "secret-ish question text"));
    assert.ok(!JSON.stringify(view).includes("secret-ish question text"));
  });
});

describe("request limits", () => {
  test("rate limit charges a whole-team job for all of its Claude calls", async () => {
    const app = makeApp({ RATE_LIMIT_PER_HOUR: "8", MAX_TEAM_EXPERTS: "5" }); // team job costs 5 + 2 = 7
    const ctx = { ip: "203.0.113.7" };
    assert.equal((await app.handle(req("POST", "/api/jobs", { kind: "team", question: QUESTION }), ctx)).status, 202);
    assert.equal((await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")), ctx)).status, 202); // 8th call
    const res = await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")), ctx);
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get("retry-after")) > 0);
    assert.equal((await res.json()).error.code, "rate_limited");
    assert.equal((await app.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")), { ip: "198.51.100.1" })).status, 202);
  });
  test("input validation", async () => {
    const app = makeApp();
    const code = async (body) => (await (await app.handle(req("POST", "/api/jobs", body))).json()).error?.code;
    assert.equal(await code(expertJob("cafe-operations-manager", "x".repeat(2001))), "too_long");
    assert.equal(await code({ kind: "team", question: "x".repeat(2001) }), "too_long");
    assert.equal(await code(expertJob("made-up-expert")), "unknown_agent");
    assert.equal(await code(expertJob("orchestrator")), "use_team");
    assert.equal(await code({ kind: "other" }), "bad_request");
    assert.equal(await code({ kind: "expert", agent: "cafe-operations-manager", messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "yo" }] }), "bad_request");
    assert.equal((await app.handle(req("POST", "/api/jobs", { kind: "team", pad: "x".repeat(250_000) }))).status, 413);
  });
  test("history is capped and output tokens are bounded", async () => {
    const app = makeApp();
    const messages = [];
    for (let i = 0; i < 20; i++) messages.push({ role: i % 2 ? "assistant" : "user", content: `turn ${i}` });
    messages.push({ role: "user", content: "latest question" });
    await runToCompletion(app, { kind: "expert", agent: "cafe-operations-manager", messages });
    const sent = mock.state.requests.at(-1).body;
    assert.ok(sent.messages.length <= 8);
    assert.equal(sent.messages[0].role, "user");
    assert.match(sent.messages.at(-1).content, /^latest question/);
    assert.match(sent.messages.at(-1).content, /Answer guidance/);
    assert.equal(sent.max_tokens, 3000);
  });
  test("old streaming endpoints are gone; wrong methods are rejected", async () => {
    const app = makeApp();
    assert.equal((await app.handle(req("POST", "/api/expert", expertJob("cafe-operations-manager")))).status, 404);
    assert.equal((await app.handle(req("POST", "/api/team/route", { question: QUESTION }))).status, 404);
    assert.equal((await app.handle(req("GET", "/api/jobs"))).status, 405);
  });
});

describe("prompt size (smaller, faster requests without losing expert knowledge)", () => {
  test("expert prompts stay under ~17k tokens and exclude planning meta-docs and URL lists", () => {
    for (const a of teamData.agents.filter((x) => x.slug !== "orchestrator")) {
      const sys = expertSystemPrompt(a, teamData);
      assert.ok(sys.length / 4 < 17_000, `${a.slug}: ~${Math.round(sys.length / 4)} tokens`);
      assert.ok(!sys.includes("Coverage matrix"), `${a.slug} includes the planning roster`);
      assert.ok(!sys.includes("\n## Sources\n"), `${a.slug} includes a URL source list`);
      assert.ok(sys.includes(`.claude/agents/${a.slug}.md`) && sys.includes(`knowledge/${a.slug}/README.md`), a.slug);
      for (const s of a.skills) assert.ok(sys.includes(`BEGIN SKILL ${s}`), `${a.slug} missing skill ${s}`);
      for (const r of a.research) assert.ok(sys.includes(`BEGIN FILE ${r}`), `${a.slug} missing research ${r}`);
    }
  });
});

describe("individual expert jobs", () => {
  test("Marcus (lease, opus) gets his agent file, skills, knowledge incl. the lease, and research", async () => {
    const { view } = await runToCompletion(makeApp(), expertJob("lease-negotiation-specialist"));
    assert.equal(view.status, "done");
    assert.equal(view.kind, "expert");
    assert.equal(view.answer.modelId, "claude-opus-5-5");
    assert.match(view.answer.text, /Marcus here\. MOCK ANSWER from claude-opus-5-5/);
    assert.match(view.answer.text, /knowledge\/lease-negotiation-specialist\/sample-brickell-lease\.md/);
    const r = mock.state.requests.at(-1);
    const sys = r.body.system[0].text;
    assert.equal(r.body.model, "claude-opus-5-5");
    assert.deepEqual(r.body.system[0].cache_control, { type: "ephemeral" });
    assert.match(sys, /# Lease Negotiation Specialist \(A08\)/);
    assert.match(sys, /- \*\*Name:\*\* Marcus/);
    assert.match(sys, /BEGIN SKILL lease-permit-contingency-review/);
    assert.match(sys, /Base rent: \$78 per square foot/);
    assert.match(sys, /BEGIN FILE docs\/05-operating-costs\.md/);
    assert.match(sys, /# Team directory/);
    assert.match(sys, /Never invent regulatory requirements/);
    assert.equal(r.body.output_config.effort, "medium");
    assert.equal(r.body.fallbacks, "default");
    assert.match(String(r.headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    const sentKey = r.headers["x-api-key"] ?? String(r.headers.authorization ?? "").replace(/^Bearer /, "");
    assert.equal(sentKey, "sk-ant-test-key");
  });

  test("Diego (haiku) uses claude-haiku-5-5, no fallback beta, README-only folder", async () => {
    const { view } = await runToCompletion(makeApp(), expertJob("competitive-intelligence-analyst"));
    assert.equal(view.answer.modelId, "claude-haiku-5-5");
    const r = mock.state.requests.at(-1);
    assert.equal(r.body.fallbacks, undefined);
    assert.match(r.body.system[0].text, /contains ONLY README\.md - no additional documents have been provided/);
  });

  test("all 25 directly-askable agents run on their assigned model with their own prompt", async () => {
    const app = makeApp();
    const ids = { opus: "claude-opus-5-5", sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
    for (const a of teamData.agents.filter((x) => x.slug !== "orchestrator")) {
      const { view } = await runToCompletion(app, expertJob(a.slug, "Briefly, who are you?"));
      assert.equal(view.status, "done", a.slug);
      assert.ok(view.answer.text.startsWith(`${a.firstName} here`), a.slug);
      assert.equal(mock.state.requests.at(-1).body.model, ids[a.model], a.slug);
    }
  });

  test("MODEL_* env vars override the model per family", async () => {
    await runToCompletion(makeApp({ MODEL_SONNET: "claude-sonnet-5" }), expertJob("cafe-operations-manager"));
    assert.equal(mock.state.requests.at(-1).body.model, "claude-sonnet-5");
  });
});

describe("whole-team jobs (real multi-expert coordination)", () => {
  test("Ava routes -> 3 specialists answer concurrently -> Ava combines their real answers", async () => {
    mock.state.delayMs = 300;
    const t0 = Date.now();
    const { view } = await runToCompletion(makeApp(), { kind: "team", question: QUESTION });
    const elapsed = Date.now() - t0;
    assert.equal(view.status, "done", JSON.stringify(view.error));
    assert.equal(view.stage, "done");

    const kinds = mock.state.requests.map((r) =>
      r.body.output_config?.format ? "route" : /SYNTHESIS STAGE/.test(r.body.system[0].text) ? "synth" : "expert");
    assert.deepEqual(kinds, ["route", "expert", "expert", "expert", "synth"]);
    assert.ok(mock.state.maxActive >= 3, `specialists ran concurrently (peak ${mock.state.maxActive})`);
    assert.ok(elapsed < 300 * 5, `parallel run took ${elapsed} ms`);

    // 1. Routing: Ava on Opus with structured output and the meaning-based routing rules
    const route = mock.state.requests[0];
    assert.equal(route.body.model, "claude-opus-5-5");
    assert.equal(route.body.output_config.format.type, "json_schema");
    assert.equal(route.body.output_config.format.schema.properties.experts.items.properties.agent.enum.length, 24);
    assert.match(route.body.system[0].text, /ROUTING STAGE/);
    assert.match(route.body.system[0].text, /Route by meaning, not by keywords/);
    assert.ok(!route.body.system[0].text.includes("## Combined answer format"), "routing prompt trimmed");
    const agents = view.plan.experts.map((e) => e.agent);
    assert.deepEqual(agents, ["lease-negotiation-specialist", "financial-modeling-funding-strategist", "environmental-utility-compliance-specialist"]);
    assert.ok(view.plan.problems.some((p) => p.implied));

    // 2. Each specialist answered with its own prompt and Ava's brief
    for (const a of agents) {
      assert.equal(view.experts[a].status, "done");
      assert.match(view.experts[a].text, /MOCK ANSWER from claude-opus-5-5/);
    }
    const expertReqs = mock.state.requests.slice(1, 4);
    for (const r of expertReqs) assert.match(r.body.messages[0].content, /Ava's brief for you/);
    const sysOf = (name) => expertReqs.find((r) => r.body.system[0].text.includes(`- **Name:** ${name}`));
    assert.ok(sysOf("Marcus") && sysOf("Raymond") && sysOf("Hector"), "three different expert prompts");

    // 3. Synthesis received the real answers verbatim
    const synth = mock.state.requests[4];
    assert.match(synth.body.system[0].text, /SYNTHESIS STAGE/);
    assert.ok(!synth.body.system[0].text.includes("## Route by meaning"), "synthesis prompt trimmed");
    for (const a of agents) assert.ok(synth.body.messages[0].content.includes(view.experts[a].text));
    assert.match(view.final.text, /^## Routing decision/);
    assert.match(view.final.text, /combining 3 experts/);
    assert.deepEqual(view.final.contributors, agents);
  });

  test("one specialist failing does not sink the team; Ava combines the others and notes the gap", async () => {
    mock.state.failFor = "Raymond";
    const { view } = await runToCompletion(makeApp(), { kind: "team", question: QUESTION });
    assert.equal(view.status, "done");
    assert.equal(view.experts["financial-modeling-funding-strategist"].status, "failed");
    assert.equal(view.experts["financial-modeling-funding-strategist"].error.code, "upstream_error");
    assert.deepEqual(view.final.contributors, ["lease-negotiation-specialist", "environmental-utility-compliance-specialist"]);
    assert.match(mock.state.requests.at(-1).body.messages[0].content, /\[No answer: this expert's request failed/);
  });

  test("team size is capped by MAX_TEAM_EXPERTS", async () => {
    const { view } = await runToCompletion(makeApp({ MAX_TEAM_EXPERTS: "2" }), { kind: "team", question: QUESTION });
    assert.equal(view.plan.experts.length, 2);
  });

  test("progress is saved while a job runs (status endpoint shows the stage)", async () => {
    mock.state.delayMs = 2600; // longer than the 2 s heartbeat
    const app = makeApp();
    const job = await (await app.handle(req("POST", "/api/jobs", { kind: "team", question: QUESTION }))).json();
    const running = app.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }));
    await new Promise((r) => setTimeout(r, 1000));
    const mid = await (await app.handle(req("GET", `/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`))).json();
    assert.equal(mid.status, "running");
    assert.equal(mid.stage, "routing");
    mock.state.delayMs = 0;
    await running;
  });
});

test("file store shares jobs across separate instances (no in-memory state)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "experts21-store-"));
  const a = makeApp({}, createFileStore(dir));
  const b = makeApp({}, createFileStore(dir)); // a different "instance"
  const job = await (await a.handle(req("POST", "/api/jobs", expertJob("cafe-operations-manager")))).json();
  await b.work(req("POST", "/api/run-job", { jobId: job.jobId, runToken: job.runToken }));
  const view = await (await a.handle(req("GET", `/api/jobs/${job.jobId}?token=${encodeURIComponent(job.pollToken)}`))).json();
  assert.equal(view.status, "done");
  fs.rmSync(dir, { recursive: true, force: true });
});
