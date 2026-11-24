import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Serves /api/* during `npm run dev` with the same handler the Netlify Function uses.
// Server-only modules are loaded here (Node side), never bundled into the browser build.
function localApi() {
  return {
    name: "experts21-local-api",
    apply: "serve",
    async configureServer(server) {
      const { default: teamData } = await import("./server/_generated/team-data.mjs");
      const { createHandler } = await import("./server/lib/handler.mjs");
      const { handleNodeRequest } = await import("./scripts/node-adapter.mjs");
      const handler = createHandler({ data: teamData, env: process.env });
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();
        handleNodeRequest(handler, req, res).catch(next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  build: { outDir: "dist", sourcemap: false },
});
