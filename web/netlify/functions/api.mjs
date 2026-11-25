// Netlify Function (v2): fast, synchronous API. Never calls Claude, so it always answers
// well inside Netlify's time limit. Long-running Claude work happens in run-job.mjs.
// The Anthropic API key is read from the Netlify environment variable ANTHROPIC_API_KEY on
// the server and is never sent to the browser. Agent data is generated at build time from
// the repository (.claude/agents, .claude/skills, knowledge/, docs/, CLAUDE.md).
import teamData from "../../server/_generated/team-data.mjs";
import { createHandler } from "../../server/lib/handler.mjs";
import { defaultStore } from "../../server/lib/store.mjs";

let storePromise;
const getStore = () => (storePromise ??= defaultStore());
const handle = createHandler({ data: teamData, env: process.env, getStore });

export default async (req, context) => handle(req, context);

export const config = { path: ["/api/config", "/api/auth", "/api/jobs", "/api/jobs/*"] };
