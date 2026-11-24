// Netlify Function (v2) serving /api/*. The Anthropic API key is read from the
// Netlify environment variable ANTHROPIC_API_KEY on the server; it is never sent
// to the browser. Agent data is generated at build time from the repository
// (.claude/agents, .claude/skills, knowledge/, docs/, CLAUDE.md).
import teamData from "../../server/_generated/team-data.mjs";
import { createHandler } from "../../server/lib/handler.mjs";

const handle = createHandler({ data: teamData, env: process.env });

export default async (req, context) => handle(req, context);

export const config = { path: "/api/*" };
