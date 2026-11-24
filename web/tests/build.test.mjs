// Builds the client and the function the way Netlify does, then checks:
//  - the client bundle contains no secrets or private prompt material
//  - the esbuild-bundled function (Netlify's node_bundler) loads and serves /api/config
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAKE_KEY = "sk-ant-test-FAKE-build-key-not-real-0000";
const FAKE_PASSWORD = "pw-should-never-ship-7f3c";

test("client build succeeds with secrets in the environment and leaks none of them", () => {
  const env = { ...process.env, ANTHROPIC_API_KEY: FAKE_KEY, APP_PASSWORD: FAKE_PASSWORD };
  execFileSync("npx", ["vite", "build", "--logLevel", "error"], { cwd: WEB, env, stdio: "pipe" });
  assert.ok(fs.existsSync(path.join(WEB, "dist/index.html")));
  const out = execFileSync("node", ["scripts/check-secrets.mjs"], { cwd: WEB, env, encoding: "utf8" });
  assert.match(out, /Secret scan passed/);
  // the client must still contain the public expert directory
  const js = fs.readdirSync(path.join(WEB, "dist/assets")).filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(WEB, "dist/assets", f), "utf8")).join("");
  for (const name of ["Marcus", "Ava", "Theo", "Diego", "Lease Negotiation Specialist"]) assert.ok(js.includes(name), name);
});

test("the secret scanner fails when a secret is present", () => {
  const tmp = path.join(WEB, "dist", "leak-test.js");
  fs.writeFileSync(tmp, `const k = "${FAKE_KEY}";`);
  try {
    assert.throws(() => execFileSync("node", ["scripts/check-secrets.mjs"], { cwd: WEB, stdio: "pipe" }));
  } finally {
    fs.rmSync(tmp);
  }
});

test("function bundles with esbuild (Netlify's bundler) and serves /api/config", async () => {
  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "experts21-fn-"));
  const outfile = path.join(outdir, "api.mjs");
  await esbuild.build({
    entryPoints: [path.join(WEB, "netlify/functions/api.mjs")],
    bundle: true, platform: "node", format: "esm", target: "node20", outfile, logLevel: "silent",
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  });
  const size = fs.statSync(outfile).size;
  assert.ok(size > 100_000, "bundle includes the generated team data");
  const mod = await import(pathToFileURL(outfile).href);
  assert.deepEqual(mod.config, { path: "/api/*" });
  const res = await mod.default(new Request("http://localhost/api/config"), {});
  const body = await res.json();
  assert.equal(body.experts, 26);
  fs.rmSync(outdir, { recursive: true, force: true });
});
