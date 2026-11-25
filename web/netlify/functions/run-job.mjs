// Netlify Background Function: runs one expert or whole-team job (Claude calls) for up to
// 15 minutes. Netlify replies 202 to the browser immediately; progress and results are
// written to Netlify Blobs and read back through GET /api/jobs/:id.
import teamData from "../../server/_generated/team-data.mjs";
import { createWorker } from "../../server/lib/handler.mjs";
import { defaultStore } from "../../server/lib/store.mjs";

const work = createWorker({ data: teamData, env: process.env, getStore: defaultStore });

export default async (req, context) => work(req, context);

export const config = { path: "/api/run-job", background: true };
