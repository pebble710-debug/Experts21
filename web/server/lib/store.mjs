// Persistent job storage.
// On Netlify: Netlify Blobs (site-wide store, strong consistency), shared by every function
// invocation, so the background worker and the status endpoint see the same job.
// Locally (npm run dev / preview:local): JSON files in the OS temp dir.
// Tests inject createMemoryStore().
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STORE_NAME = "experts21-jobs";
const isNetlify = () => typeof globalThis.Netlify !== "undefined" || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);

export function createMemoryStore() {
  const map = new Map();
  return {
    kind: "memory",
    async get(id) {
      const v = map.get(id);
      return v ? JSON.parse(v) : null;
    },
    async set(id, value) {
      map.set(id, JSON.stringify(value));
    },
  };
}

export function createFileStore(dir = path.join(os.tmpdir(), STORE_NAME)) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (id) => path.join(dir, `${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`);
  return {
    kind: "file",
    async get(id) {
      try {
        return JSON.parse(fs.readFileSync(file(id), "utf8"));
      } catch {
        return null;
      }
    },
    async set(id, value) {
      const tmp = `${file(id)}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(value));
      fs.renameSync(tmp, file(id)); // atomic replace
    },
  };
}

export async function createBlobStore() {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  return {
    kind: "netlify-blobs",
    async get(id) {
      return store.get(id, { type: "json", consistency: "strong" });
    },
    async set(id, value) {
      await store.setJSON(id, value);
    },
  };
}

/** Pick the right store for the runtime. Never falls back to memory on Netlify. */
export async function defaultStore() {
  if (isNetlify()) return createBlobStore();
  return createFileStore();
}
