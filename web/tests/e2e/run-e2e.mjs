#!/usr/bin/env node
// End-to-end browser test of the built app (dist/) served by scripts/local-server.mjs,
// with the real function code and the real Anthropic SDK pointed at a local mock API.
// Requires Playwright + Chromium. Run: npm run test:e2e
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMockAnthropic } from "../helpers/mock-anthropic.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = process.env.E2E_SCREENSHOTS || "";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? ` (${detail})` : ""}`);
};

function startServer(port, env) {
  const proc = spawn("node", ["scripts/local-server.mjs"], {
    cwd: WEB,
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    proc.stdout.on("data", (d) => {
      if (String(d).includes("local server")) resolve(proc);
    });
    proc.stderr.on("data", (d) => process.stderr.write(d));
    proc.on("exit", (code) => reject(new Error(`server exited ${code}`)));
  });
}

const mock = await startMockAnthropic();
const PASSWORD = "e2e-password";
const server = await startServer(8891, {
  ANTHROPIC_API_KEY: "sk-ant-e2e-fake",
  ANTHROPIC_BASE_URL: mock.url, // the SDK in the function sends requests to the mock
  APP_PASSWORD: PASSWORD,
});
const serverNoKey = await startServer(8892, { ANTHROPIC_API_KEY: "", APP_PASSWORD: "" });
const browser = await chromium.launch();

try {
  // ---------------------------------------------------------------- desktop, password on
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const clientRequests = [];
  page.on("request", (r) => clientRequests.push({ url: r.url(), headers: r.headers() }));
  await page.goto("http://localhost:8891/");

  await page.getByTestId("password-input").waitFor();
  check("password gate shown when APP_PASSWORD is set", true);
  await page.getByTestId("password-input").fill("wrong");
  await page.getByTestId("password-submit").click();
  await page.getByText("That password is not correct.").waitFor();
  check("wrong password rejected by the server", true);
  await page.getByTestId("password-input").fill(PASSWORD);
  await page.getByTestId("password-submit").click();
  await page.getByTestId("password-input").waitFor({ state: "detached" });
  check("correct password unlocks the app", true);

  const rows = await page.locator("button.expert-row").count();
  check("all 26 experts appear in the sidebar", rows === 26, `found ${rows}`);
  const groups = await page.locator(".group-title").allTextContents();
  check("experts are organized by specialty", groups.length === 10 && groups.includes("Site & Build-Out"), groups.join(" | "));
  const marcusRow = await page.getByTestId("expert-lease-negotiation-specialist").innerText();
  check("sidebar shows name, role, model, personality", /Marcus/.test(marcusRow) && /opus/i.test(marcusRow) &&
    /Lease Negotiation Specialist/.test(marcusRow) && /negotiator/i.test(marcusRow), marcusRow.replace(/\n/g, " / "));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "desktop-team.png") });

  // individual expert
  await page.getByTestId("expert-lease-negotiation-specialist").click();
  await page.getByTestId("expert-profile").getByText("Marcus").first().waitFor();
  await page.getByTestId("composer-input").fill("What are the top three risks in the Brickell lease offer?");
  await page.getByTestId("send").click();
  const reply = page.getByTestId("agent-message").last();
  await reply.getByText("MOCK ANSWER from claude-opus-5-5").waitFor({ timeout: 15000 });
  const replyText = await reply.innerText();
  check("individual expert answers through /api/expert (Marcus on Opus)", /Marcus here/.test(replyText));
  check("expert prompt included Marcus's knowledge folder lease", /sample-brickell-lease\.md/.test(replyText));
  const expertCall = mock.state.requests.at(-1);
  check("browser never talks to Anthropic directly", !clientRequests.some((r) => r.url.includes(mock.url) || r.url.includes("anthropic.com")));
  check("API key never sent by the browser", !clientRequests.some((r) => JSON.stringify(r.headers).includes("sk-ant")));
  check("server sent the request with the Opus model", expertCall.body.model === "claude-opus-5-5");

  // Diego on haiku
  await page.getByTestId("expert-competitive-intelligence-analyst").click();
  await page.getByTestId("composer-input").fill("Which competitors should we watch near Brickell?");
  await page.getByTestId("send").click();
  await page.getByTestId("agent-message").last().getByText("MOCK ANSWER from claude-haiku-5-5").waitFor({ timeout: 15000 });
  check("Diego answers on Haiku", true);

  // whole team
  await page.getByRole("button", { name: /Ask the Whole Team/ }).click();
  mock.state.requests.length = 0;
  await page.getByTestId("composer-input").fill("We found a Brickell space at $78/sq ft NNN with no grease trap. Should we sign?");
  await page.getByTestId("send").click();
  await page.getByTestId("contributors").waitFor({ timeout: 20000 });
  const plan = await page.getByTestId("routing-plan").innerText();
  check("routing plan shows the problems the orchestrator identified", /Grease-trap compliance/.test(plan) && /implied/.test(plan));
  const cards = await page.locator('[data-testid^="contribution-"]').count();
  check("three expert contribution cards shown", cards === 3, `found ${cards}`);
  const contributors = await page.getByTestId("contributors").innerText();
  check("contributors listed with models", /Marcus/.test(contributors) && /Raymond/.test(contributors) &&
    /Hector/.test(contributors) && /Ava \(combined\)/.test(contributors), contributors.replace(/\n/g, " "));
  const final = await page.getByTestId("final-answer").innerText();
  check("combined recommendation streamed from synthesis", /MOCK SYNTHESIS combining 3 experts/.test(final));
  const paths = mock.state.requests.map((r) => (r.body.output_config?.format ? "route" : /SYNTHESIS STAGE/.test(r.body.system[0].text) ? "synth" : "expert"));
  check("team run made real separate calls: 1 route + 3 experts + 1 synthesis",
    paths.filter((p) => p === "route").length === 1 && paths.filter((p) => p === "expert").length === 3 &&
    paths.filter((p) => p === "synth").length === 1, paths.join(","));
  await page.getByTestId("contribution-lease-negotiation-specialist").locator("button").first().click();
  await page.getByTestId("contribution-lease-negotiation-specialist").getByText("Marcus here").waitFor();
  check("individual contributions can be expanded", true);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "desktop-team-answer.png") });

  // upstream error display
  mock.state.mode = "auth_error";
  await page.getByTestId("expert-cafe-operations-manager").click();
  await page.getByTestId("composer-input").fill("How should we schedule staff?");
  await page.getByTestId("send").click();
  await page.getByText("API key rejected").waitFor({ timeout: 15000 });
  check("informative error when the API key is rejected", true);
  mock.state.mode = "ok";
  await page.close();

  // ---------------------------------------------------------------- missing API key banner
  const p2 = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await p2.goto("http://localhost:8892/");
  await p2.getByTestId("config-banner").waitFor();
  const banner = await p2.getByTestId("config-banner").innerText();
  check("missing ANTHROPIC_API_KEY shows a configuration banner", /API key not configured/.test(banner) && /Netlify/.test(banner));
  const noGate = (await p2.getByTestId("password-input").count()) === 0;
  check("no password gate when APP_PASSWORD is unset", noGate);
  await p2.getByTestId("expert-cafe-operations-manager").click();
  await p2.getByTestId("composer-input").fill("Hello");
  await p2.getByTestId("send").click();
  await p2.getByTestId("agent-message").last().getByText("missing_api_key").waitFor({ timeout: 10000 });
  check("request without a key shows missing_api_key error in the chat", true);
  await p2.close();

  // ---------------------------------------------------------------- mobile
  const ctx = await browser.newContext({ ...require("playwright").devices["iPhone 13"] });
  const m = await ctx.newPage();
  await m.goto("http://localhost:8892/");
  const sidebarHidden = await m.locator(".sidebar").evaluate((el) => el.getBoundingClientRect().right <= 0);
  check("mobile: sidebar starts hidden", sidebarHidden);
  await m.getByRole("button", { name: "Open expert list" }).click();
  await m.getByTestId("expert-head-of-coffee-beverage-program").click();
  const title = await m.locator(".topbar-title").innerText();
  check("mobile: open list, pick an expert, list closes", /Mateo/.test(title));
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("mobile: no horizontal page scroll", !overflow);
  if (SHOTS) {
    await m.waitForTimeout(400); // let the drawer finish closing
    await m.screenshot({ path: path.join(SHOTS, "mobile-expert.png") });
    await m.getByRole("button", { name: "Open expert list" }).click();
    await m.waitForTimeout(400);
    await m.screenshot({ path: path.join(SHOTS, "mobile-sidebar.png") });
  }
  await ctx.close();
} catch (err) {
  check("e2e run completed without exceptions", false, err.message);
} finally {
  await browser.close();
  server.kill();
  serverNoKey.kill();
  await mock.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} end-to-end checks passed.`);
process.exit(failed.length ? 1 : 0);
