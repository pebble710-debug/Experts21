#!/usr/bin/env node
// Build-time loader: reads the Experts21 repository (agents, skills, knowledge folders,
// research docs, CLAUDE.md) and writes two generated files:
//
//   src/generated/experts.json                  PUBLIC  - names, roles, personas, models (shipped to the browser)
//   server/_generated/team-data.mjs  PRIVATE - full agent instructions, skills, knowledge, research
//                                                (bundled into the Netlify Function only, never into the browser)
//
// The repository stays the single source of truth: edit .claude/agents, .claude/skills,
// knowledge/ or docs/, rebuild, and the web app follows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, "..");
const REPO = path.resolve(WEB, "..");
const AGENTS_DIR = path.join(REPO, ".claude", "agents");
const SKILLS_DIR = path.join(REPO, ".claude", "skills");
const KNOWLEDGE_DIR = path.join(REPO, "knowledge");
const MAX_KNOWLEDGE_FILE_BYTES = 200_000; // larger files are listed but not inlined
const TEXT_EXT = new Set([".md", ".txt", ".csv", ".json", ".yaml", ".yml"]);

const PHASE_ORDER = [
  "Coordination",
  "1. Concept & Strategy",
  "2. Finance & Legal Setup",
  "3. Site & Build-Out",
  "4. Compliance & Risk",
  "5. Product & Supply Chain",
  "6. People, Operations & CX",
  "7. Technology & Marketing",
  "8. Growth",
  "Meta",
];

function splitFrontmatter(text, file) {
  if (!text.startsWith("---\n")) throw new Error(`${file}: missing frontmatter`);
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${file}: unterminated frontmatter`);
  return { meta: YAML.parse(text.slice(4, end)), body: text.slice(end + 5).trim() };
}

function section(body, heading) {
  const start = body.indexOf(`\n${heading}`);
  if (start === -1) return "";
  const rest = body.slice(start + heading.length + 1);
  const next = rest.search(/\n## /);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function field(identity, label) {
  const m = identity.match(new RegExp(`- \\*\\*${label}:\\*\\* (.+)`));
  return m ? m[1].trim() : "";
}

function readKnowledge(slug) {
  const dir = path.join(KNOWLEDGE_DIR, slug);
  if (!fs.existsSync(dir)) throw new Error(`knowledge folder missing: knowledge/${slug}/`);
  const files = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const size = fs.statSync(full).size;
    const inline = TEXT_EXT.has(path.extname(name).toLowerCase()) && size <= MAX_KNOWLEDGE_FILE_BYTES;
    files.push({
      name,
      path: `knowledge/${slug}/${name}`,
      bytes: size,
      content: inline ? fs.readFileSync(full, "utf8") : null,
      note: inline ? null : "Not inlined (binary or larger than 200 KB); ask the owner for a text summary.",
    });
  }
  if (!files.some((f) => f.name === "README.md")) throw new Error(`knowledge/${slug}/README.md missing`);
  return files;
}

function researchList(knowledgeReadme) {
  const sect = knowledgeReadme.split("## Shared research")[1]?.split("\n## ")[0] ?? "";
  return [...new Set([...sect.matchAll(/`(docs\/[\w.\-]+\.md)`/g)].map((m) => m[1]))];
}

// ------------------------------------------------------------------ skills
const skills = {};
for (const dir of fs.readdirSync(SKILLS_DIR).sort()) {
  const file = path.join(SKILLS_DIR, dir, "SKILL.md");
  if (!fs.existsSync(file)) continue;
  const { meta, body } = splitFrontmatter(fs.readFileSync(file, "utf8"), file);
  skills[dir] = { name: meta.name, id: meta.metadata?.id ?? null, description: meta.description, body };
}

// ------------------------------------------------------------------ agents
const agents = [];
const docsNeeded = new Set(["docs/README.md"]);
for (const fn of fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md")).sort()) {
  const file = path.join(AGENTS_DIR, fn);
  const { meta, body } = splitFrontmatter(fs.readFileSync(file, "utf8"), file);
  const slug = meta.name;
  const titleMatch = body.match(/^# (.+?) \((A\d\d)\)/m);
  if (!titleMatch) throw new Error(`${fn}: missing '# Title (A##)' heading`);
  const identity = section(body, "## Identity");
  const phaseMatch = body.match(/Lifecycle phase: \*\*(.+?)\*\*/);
  const phase = phaseMatch ? phaseMatch[1] : slug === "orchestrator" ? "Coordination" : "Meta";
  const knowledge = readKnowledge(slug);
  const research = researchList(knowledge.find((f) => f.name === "README.md").content);
  research.forEach((p) => docsNeeded.add(p));
  const skillNames = meta.skills ?? [];
  for (const s of skillNames) if (!skills[s]) throw new Error(`${slug}: unknown skill ${s}`);
  agents.push({
    id: titleMatch[2],
    slug,
    title: titleMatch[1],
    firstName: field(identity, "Name"),
    model: meta.model,
    modelReason: field(identity, "Model").replace(/^`\w+`\.\s*/, ""),
    personality: field(identity, "Personality"),
    communicationStyle: field(identity, "Communication style"),
    workingStyle: field(identity, "Working style"),
    phase,
    color: meta.color ?? "blue",
    description: String(meta.description ?? ""),
    mission: section(body, "## Mission"),
    skills: skillNames,
    research,
    knowledgeFolder: `knowledge/${slug}/`,
    knowledge,
    body,
  });
}

// ------------------------------------------------------------------ docs + CLAUDE.md
const docs = {};
for (const p of [...docsNeeded].sort()) {
  const full = path.join(REPO, p);
  if (!fs.existsSync(full)) throw new Error(`research file missing: ${p}`);
  docs[p] = fs.readFileSync(full, "utf8");
}
const claudeMd = fs.readFileSync(path.join(REPO, "CLAUDE.md"), "utf8");
const groundRules = section("\n" + claudeMd, "## Ground rules for every answer in this repo");

// ------------------------------------------------------------------ checks
const specialists = agents.filter((a) => !["orchestrator", "agent-builder"].includes(a.slug));
if (agents.length !== 26) throw new Error(`expected 26 agents, found ${agents.length}`);
if (specialists.length !== 24) throw new Error(`expected 24 specialists, found ${specialists.length}`);
if (Object.keys(skills).length !== 24) throw new Error(`expected 24 skills, found ${Object.keys(skills).length}`);
for (const a of agents) {
  for (const k of ["firstName", "model", "personality", "communicationStyle", "title"]) {
    if (!a[k]) throw new Error(`${a.slug}: missing ${k}`);
  }
  if (!["opus", "sonnet", "haiku"].includes(a.model)) throw new Error(`${a.slug}: invalid model ${a.model}`);
}
agents.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || a.id.localeCompare(b.id));

// ------------------------------------------------------------------ write PUBLIC data (browser)
const publicAgents = agents.map((a) => ({
  id: a.id,
  slug: a.slug,
  title: a.title,
  firstName: a.firstName,
  model: a.model,
  modelReason: a.modelReason,
  personality: a.personality,
  communicationStyle: a.communicationStyle,
  workingStyle: a.workingStyle,
  phase: a.phase,
  color: a.color,
  mission: a.mission,
  skills: a.skills,
  research: a.research,
  knowledgeFolder: a.knowledgeFolder,
  knowledgeFiles: a.knowledge.map((f) => f.name),
  isOrchestrator: a.slug === "orchestrator",
  isMeta: a.slug === "agent-builder",
}));
const publicOut = path.join(WEB, "src", "generated", "experts.json");
fs.mkdirSync(path.dirname(publicOut), { recursive: true });
fs.writeFileSync(publicOut, JSON.stringify({ phases: PHASE_ORDER, agents: publicAgents }, null, 2));

// ------------------------------------------------------------------ write PRIVATE data (function only)
const privateOut = path.join(WEB, "server", "_generated", "team-data.mjs");
fs.mkdirSync(path.dirname(privateOut), { recursive: true });
const teamData = { agents, skills, docs, groundRules };
fs.writeFileSync(
  privateOut,
  "// GENERATED by web/scripts/build-data.mjs - do not edit. Server-side only.\n" +
    `export default ${JSON.stringify(teamData)};\n`,
);

const kb = (s) => Math.round(Buffer.byteLength(s) / 1024);
console.log(
  `build-data: ${agents.length} agents (${specialists.length} specialists), ${Object.keys(skills).length} skills, ` +
    `${Object.keys(docs).length} research files, ` +
    `${agents.reduce((n, a) => n + a.knowledge.length, 0)} knowledge files -> ` +
    `experts.json ${kb(JSON.stringify(publicAgents))} KB (public), team-data.mjs ${kb(JSON.stringify(teamData))} KB (server)`,
);
