#!/usr/bin/env node
// Scans the client build (dist/) for anything that must stay server-side:
// API keys, the app password, env-var values, and the private agent prompts.
// Usage: node scripts/check-secrets.mjs [--secret VALUE ...]   (exit 1 on any finding)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, "..", "dist");

const secrets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--secret" && process.argv[i + 1]) secrets.push(process.argv[++i]);
}
for (const name of ["ANTHROPIC_API_KEY", "APP_PASSWORD", "SIGNING_SECRET"]) {
  if (process.env[name]) secrets.push(process.env[name]);
}

const patterns = [
  { name: "Anthropic API key pattern", re: /sk-ant-[A-Za-z0-9_\-]{8,}/ },
  // Reading server env vars from client code would inline them at build time:
  { name: "client code reads a server env var", re: /(process\.env|import\.meta\.env)\.(VITE_)?(ANTHROPIC|APP_PASSWORD|SIGNING_SECRET)/ },
  { name: "VITE_-prefixed secret (exposed to the browser by Vite)", re: /VITE_(ANTHROPIC|APP_PASSWORD)/ },
  // Private prompt material must stay in the function bundle only:
  { name: "agent instructions (Evidence rules section)", re: /## Evidence rules \(required\)/ },
  { name: "skill procedure text", re: /## Procedure/ },
  { name: "knowledge document text", re: /Base rent: \$78 per square foot/ },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
  );
}

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(2);
}
const findings = [];
const files = walk(DIST);
for (const file of files) {
  const text = fs.readFileSync(file, "latin1");
  for (const p of patterns) if (p.re.test(text)) findings.push(`${path.relative(DIST, file)}: ${p.name}`);
  for (const s of secrets) if (s && text.includes(s)) findings.push(`${path.relative(DIST, file)}: contains a configured secret value`);
}
if (findings.length) {
  console.error("SECRET SCAN FAILED:\n  " + findings.join("\n  "));
  process.exit(1);
}
console.log(`Secret scan passed: ${files.length} files in dist/ checked, ${secrets.length} secret value(s) + ${patterns.length} patterns, no matches.`);
