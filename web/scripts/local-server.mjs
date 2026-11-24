#!/usr/bin/env node
// Serves the built app (dist/) and /api/* on one port, like Netlify does.
// Usage: npm run preview:local   (set ANTHROPIC_API_KEY and optionally APP_PASSWORD first)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleNodeRequest } from "./node-adapter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, "..");
const DIST = path.join(WEB, "dist");
const PORT = Number(process.env.PORT || 8888);

const { default: teamData } = await import("../server/_generated/team-data.mjs");
const { createHandler } = await import("../server/lib/handler.mjs");
const handler = createHandler({ data: teamData, env: process.env });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon" };

export const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleNodeRequest(handler, req, res).catch((err) => {
      console.error(err);
      res.statusCode = 500;
      res.end();
    });
    return;
  }
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end();
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html"); // SPA fallback
  res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}
server.listen(PORT, () => {
  console.log(`Experts21 local server: http://localhost:${PORT}`);
  console.log(`  ANTHROPIC_API_KEY ${process.env.ANTHROPIC_API_KEY ? "is set" : "is NOT set (experts will show a configuration error)"}`);
  console.log(`  APP_PASSWORD ${process.env.APP_PASSWORD ? "is set (password required)" : "is not set (open access)"}`);
});
