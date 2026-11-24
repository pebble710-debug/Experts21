// Verifies the build-time loader reproduces the repository's 26 agents exactly,
// and that the public (browser) data contains no private prompt material.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import publicData from "../src/generated/experts.json" with { type: "json" };
import teamData from "../server/_generated/team-data.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const agentFiles = fs.readdirSync(path.join(REPO, ".claude/agents")).filter((f) => f.endsWith(".md"));
const repoAgents = agentFiles.map((f) => {
  const text = fs.readFileSync(path.join(REPO, ".claude/agents", f), "utf8");
  const meta = YAML.parse(text.slice(4, text.indexOf("\n---\n", 4)));
  const name = text.match(/- \*\*Name:\*\* (\S+)/)[1];
  return { slug: meta.name, model: meta.model, firstName: name, skills: meta.skills ?? [] };
});

test("all 26 experts from .claude/agents appear with matching name, model, and skills", () => {
  assert.equal(repoAgents.length, 26);
  assert.equal(publicData.agents.length, 26);
  for (const r of repoAgents) {
    const p = publicData.agents.find((a) => a.slug === r.slug);
    assert.ok(p, `${r.slug} missing from the web app`);
    assert.equal(p.firstName, r.firstName, r.slug);
    assert.equal(p.model, r.model, r.slug);
    assert.deepEqual(p.skills, r.skills, r.slug);
    assert.ok(p.personality.length > 10 && p.communicationStyle.length > 10, `${r.slug} persona`);
    assert.ok(p.title && p.phase, r.slug);
  }
  assert.equal(new Set(publicData.agents.map((a) => a.firstName)).size, 26, "unique first names");
  assert.equal(publicData.agents.filter((a) => a.isOrchestrator).length, 1);
  assert.equal(publicData.agents.filter((a) => a.isMeta).length, 1);
});

test("every expert is grouped under a known specialty phase", () => {
  for (const a of publicData.agents) assert.ok(publicData.phases.includes(a.phase), `${a.slug}: ${a.phase}`);
  const counts = Object.fromEntries(publicData.phases.map((p) => [p, publicData.agents.filter((a) => a.phase === p).length]));
  assert.equal(counts["Coordination"], 1);
  assert.equal(counts["Meta"], 1);
  assert.equal(Object.values(counts).reduce((x, y) => x + y, 0), 26);
});

test("knowledge folders are loaded from knowledge/<agent>/ (including Marcus's sample lease)", () => {
  for (const a of teamData.agents) {
    const dir = path.join(REPO, "knowledge", a.slug);
    const onDisk = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
    assert.deepEqual(a.knowledge.map((f) => f.name), onDisk, a.slug);
  }
  const marcus = teamData.agents.find((a) => a.slug === "lease-negotiation-specialist");
  const lease = marcus.knowledge.find((f) => f.name === "sample-brickell-lease.md");
  assert.equal(lease.content, fs.readFileSync(path.join(REPO, "knowledge/lease-negotiation-specialist/sample-brickell-lease.md"), "utf8"));
});

test("all 24 shared skills and the referenced research files are loaded verbatim", () => {
  assert.equal(Object.keys(teamData.skills).length, 24);
  for (const a of teamData.agents) {
    for (const s of a.skills) assert.ok(teamData.skills[s]?.body.includes("## Procedure"), `${a.slug}: ${s}`);
    for (const r of a.research) {
      assert.equal(teamData.docs[r], fs.readFileSync(path.join(REPO, r), "utf8"), `${a.slug}: ${r}`);
    }
  }
  assert.match(teamData.groundRules, /Never invent regulatory requirements/);
});

test("public browser data contains no private prompts, skills, or knowledge text", () => {
  const text = JSON.stringify(publicData);
  for (const forbidden of ["## Evidence rules (required)", "## Procedure", "Base rent: $78 per square foot", "## Route by meaning"]) {
    assert.ok(!text.includes(forbidden), `public data leaks: ${forbidden}`);
  }
});
