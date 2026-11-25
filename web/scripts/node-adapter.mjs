// Adapts Node's http (req, res) to the web-standard Request/Response handler used by
// the Netlify Function, so `npm run dev` and `npm run preview:local` serve /api/* locally
// with the exact same code that runs on Netlify.
import { Readable } from "node:stream";

export async function handleNodeRequest(handler, req, res) {
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
  const response = await handler(request, { ip: req.socket.remoteAddress });
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

/**
 * Emulates a Netlify Background Function locally: reply 202 immediately,
 * then run the worker to completion without blocking the response.
 */
export async function handleNodeBackground(worker, req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request(`http://${req.headers.host || "localhost"}${req.url}`, {
    method: req.method,
    headers,
    body: Buffer.concat(chunks),
  });
  res.statusCode = 202;
  res.end();
  worker(request, { ip: req.socket.remoteAddress }).catch((err) => console.error("[local background]", err));
}
