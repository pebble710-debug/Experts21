# Experts21 Web App

A React web app for talking to the **26 Experts21 AI agents** that help plan, open, and run a specialty coffee shop in Miami. You can chat with any single expert, or use **Ask the Whole Team** so Ava (the orchestrator) brings in the right specialists and combines their answers.

The app is built from this repository. It does not invent its own experts: the build reads `.claude/agents/`, `.claude/skills/`, `knowledge/`, `docs/`, and `CLAUDE.md`, so editing those files and redeploying updates the website.

> **Status:** Step 11 Part A (built and tested locally). **Not deployed yet.** Part B covers deployment.

---

## What it does

| Feature | How it works |
|---|---|
| **Expert sidebar** | All 26 experts, grouped by specialty (lifecycle phase), each showing first name, role, personality, and Claude model (`opus` / `sonnet` / `haiku`). Search by name, role, or topic. |
| **Chat with one expert** | Pick an expert and ask questions. The server sends Claude that expert's full agent file, its preloaded shared skills, every file in its knowledge folder, the research files its folder README lists, and the CLAUDE.md ground rules, using the expert's assigned model. The answer appears as it is written (the page polls for progress about once a second). |
| **Ask the Whole Team** | A real three-stage workflow: **(1)** Ava routes the question by meaning and returns a structured plan (problems, chosen experts, a brief for each, experts left out). **(2)** All chosen experts answer **at the same time**, each in its **own separate Claude call** with its own model and prompt. **(3)** Ava combines the verified answers into one recommendation with disagreements and next steps. The UI shows the routing plan, each expert's answer, and a **Contributors** list. |
| **Real coordination, server-side** | The whole team workflow runs in one server-side background job: Ava's plan decides which specialists are called, their actual answers are passed verbatim to Ava's synthesis call, and the browser only reads the results. Nothing the browser sends can add or edit an expert answer. |
| **Progress** | A status line shows the current stage ("Ava is choosing the right specialists…", "Specialists are answering in parallel (2 of 3 finished)…", "Ava is combining the answers…") with an elapsed-time counter. Each specialist card shows Waiting / Answering / Answered / Failed. |
| **Errors and recovery** | Clear messages for a missing or rejected API key, wrong password, rate limits, too-long questions, timeouts, stalled jobs, and upstream errors, each with an error code. Short connection drops are retried automatically. If the connection stays down, **Try again** reconnects to the same job instead of paying for a new one. If one specialist fails, Ava still combines the others and notes the gap. |
| **Responsive** | Desktop sidebar layout. On phones the expert list becomes a slide-out drawer. Light and dark themes follow the device setting. |

## Architecture

All Claude work runs in a **Netlify Background Function**, which can run for up to 15 minutes. Netlify's normal and streaming functions stop after 60 seconds, and a whole-team answer (Ava, up to 5 specialists, then Ava again) can take a few minutes. The browser starts a job, then polls a fast status endpoint. Job progress and results are saved in **Netlify Blobs**, persistent storage shared by every function invocation, so nothing depends on in-memory state.

```text
Browser (React, dist/)                    api.mjs  (fast, never calls Claude)          run-job.mjs  (background, ≤15 min)
──────────────────────                    ───────────────────────────────────          ──────────────────────────────────
GET  /api/config  ─────────────────────▶  key configured? password? limits
POST /api/auth    ─────────────────────▶  check APP_PASSWORD
POST /api/jobs {expert|team} ──────────▶  validate, password, rate limit,
                                          save job (queued) ─▶ Netlify Blobs
                 ◀── 202 {jobId, tokens}
POST /api/run-job {jobId, runToken} ───────────────────────────────────────────────▶  202 at once, then:
                                                                                     expert: 1 Claude call (its model)
                                                                                     team:   Ava routes (JSON plan)
                                                                                             → specialists in parallel
                                                                                             → Ava combines
                                                                                     saves progress every 2 s ─▶ Blobs
GET  /api/jobs/:id?token=  (every ~1 s) ▶  read job from Blobs ─▶ stage, partial text, plan, answers
```

- **Build time** (`scripts/build-data.mjs`, run by `npm run build`): reads the repository and writes
  - `src/generated/experts.json`: **public** directory data for the browser (no prompts, skills, or knowledge text).
  - `server/_generated/team-data.mjs`: **private** data bundled into the functions only.
  - The build fails if there aren't exactly 26 agents, 24 specialists, and 24 skills, or if any knowledge folder, research file, or persona field is missing.
- **Prompt size:** each expert's prompt holds its agent file, all its preloaded skills, every knowledge-folder file, its research files, a compact team directory, and the CLAUDE.md ground rules: about 6k–16k tokens.
  - Planning documents that aren't business research (the roster, user guide, test results, model table) are left out.
  - The long URL source lists at the end of each research file are trimmed. The findings are kept word for word.
  - The orchestrator gets only the sections each stage needs.
  - Each expert's system prompt is the same in single chat and team mode, so the prompt cache is reused between them.
- **Models:** each agent's `model:` alias maps to `claude-opus-5-5`, `claude-sonnet-5-5`, or `claude-haiku-5-5`. You can override each family with `MODEL_OPUS` / `MODEL_SONNET` / `MODEL_HAIKU`.
  - Opus and Sonnet calls turn on Anthropic's server-side refusal fallback (`fallbacks: "default"`).
  - Prompts are cached (`cache_control`).
- **Job safety:**
  - Each job has a random ID plus HMAC tokens. The poll token is needed to read a job, and the run token to start it.
  - A job runs only once, even if the worker is invoked twice.
  - A job stops at `JOB_DEADLINE_MS` (default 11 minutes).
  - A job whose worker stops saving progress for 2 minutes is reported as `job_stalled`.
- **Site protection:** the browser (not the server) starts the background worker, so this also works when the site sits behind Netlify's password or team-login protection.
- **Code layout:**
  - `netlify/functions/api.mjs`: the fast API.
  - `netlify/functions/run-job.mjs`: the background worker.
  - `server/lib/handler.mjs`: endpoints and validation.
  - `server/lib/jobs.mjs`: the job workflow.
  - `server/lib/store.mjs`: Netlify Blobs on Netlify, files locally.
  - `server/lib/prompts.mjs`: prompt assembly.
  - `server/lib/anthropic.mjs`: the official `@anthropic-ai/sdk`.
  - `server/lib/security.mjs`: password, limits, and tokens.

## Security and cost protection

| Protection | Details |
|---|---|
| **API key stays on the server** | `ANTHROPIC_API_KEY` is read only inside the function (`process.env`). The browser only ever calls `/api/*` on this site. `npm run check:secrets` (also run by the tests) scans `dist/` and fails on any key pattern, any configured secret value, client code that reads a server env var, or private prompt text. |
| **Optional password** | Set `APP_PASSWORD` and every expert endpoint requires it in the `x-app-password` header. The server checks it in constant time, before reading the request. The password is never in the bundle. The user types it, and it is kept only in the browser tab's `sessionStorage`. `/api/auth` allows 20 attempts per hour per IP. |
| **Rate limits** | `RATE_LIMIT_PER_HOUR` per IP (default 60 Claude calls) and `GLOBAL_LIMIT_PER_HOUR` per function instance (default 400). A whole-team question is charged `MAX_TEAM_EXPERTS + 2` calls (7 by default) when it starts. **These limits are best-effort**: they're kept in memory, so they reset on cold starts and aren't shared between instances. For a hard cap, set a **spend limit in the Anthropic Console**. |
| **Request limits** | Question ≤ `MAX_QUESTION_CHARS` (2,000); chat history ≤ `MAX_HISTORY_MESSAGES` (8) and `MAX_HISTORY_CHARS` (24,000); request body ≤ 200 KB; team size ≤ `MAX_TEAM_EXPERTS` (default 5, max 8); output caps `EXPERT_MAX_TOKENS` (3,000), `TEAM_EXPERT_MAX_TOKENS` (2,200), `ROUTE_MAX_TOKENS` (2,500), `SYNTH_MAX_TOKENS` (3,500); target lengths are 300–500 words for one expert, 200–350 per team expert, and 450–700 for Ava's combined answer; `effort: "medium"`; whole job ≤ `JOB_DEADLINE_MS` (11 min). |
| **Prompt-injection hygiene** | Owner messages and knowledge documents are treated as information, not instructions. Model output is rendered as Markdown without raw HTML. |
| **Headers** | `netlify.toml` sets `nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a restrictive permissions policy. |

**Rough cost per question [ESTIMATE].** An expert prompt is about 23–29k input tokens; Ava's is about 8k. At current list prices, with prompt caching after the first call:

| Question type | Estimated cost |
|---|---|
| One Opus expert | about $0.05–$0.17 |
| One Sonnet expert | about $0.03–$0.08 |
| One Haiku expert | about $0.01 |
| A whole-team question with 5 experts | about $0.40–$1.00 |

Check your real usage in the Anthropic Console.

## Deploy to Netlify (Part B)

The repository-root `netlify.toml` already sets everything:

```toml
[build]
  base = "web"
  command = "npm run build"
  publish = "dist"
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

1. In Netlify: **Add new site → Import an existing project →** choose the `Experts21` GitHub repository, branch `main`. Netlify reads `netlify.toml`, so leave the build settings as they are.
2. **Site configuration → Environment variables**, then add:

   | Variable | Required | Value |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key. In Netlify, its scopes must include *Functions*. Never put it in code or in a `VITE_` variable. |
   | `APP_PASSWORD` | Recommended | A password you share with your users. |
   | `SIGNING_SECRET` | Optional | Long random string for team signatures. Defaults to one derived from the API key. |
   | `RATE_LIMIT_PER_HOUR`, `GLOBAL_LIMIT_PER_HOUR`, `MAX_TEAM_EXPERTS`, `MAX_QUESTION_CHARS` | Optional | Tighten or loosen the limits above. |
   | `MODEL_OPUS`, `MODEL_SONNET`, `MODEL_HAIKU` | Optional | Override the Claude model ID for a family. |

3. **Deploy.** Then open the site:
   - The sidebar should list 26 experts.
   - If you see "API key not configured", the key variable is missing or the site wasn't redeployed after you added it.
4. In the Anthropic Console, set a **monthly spend limit** for the key.

After changing agents, skills, knowledge files, or research, push to `main`. Netlify rebuilds, and the build step reloads everything from the repository.

## Run locally

Requires Node 20+.

```bash
cd web
npm install
```

Start the dev server with hot reload. `/api/*` is served by the same handler code:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Or build, then serve the production build and API together on port 8888:

```bash
ANTHROPIC_API_KEY=sk-ant-... APP_PASSWORD=letmein npm run preview:local
```

`netlify dev` (Netlify CLI) also works, because `netlify.toml` is at the repository root.

## Tests

```bash
cd web
npm test
```

`npm test` runs 34 Node tests:
- **Data:** the 26 experts match `.claude/agents` exactly, and the knowledge folders, skills, and research are loaded verbatim.
- **API:** the API runs with the real Anthropic SDK against a local mock Messages API. It covers models, prompts, password, rate limits, validation, error codes, and the full route, experts, synthesis flow, including rejecting forged answers.
- **Build:** the client builds, the secret scan passes, and the function bundles with esbuild and serves `/api/config`.

```bash
npm run test:e2e
```

`npm run test:e2e` runs 25 browser checks in Chromium (Playwright) against the built app and local server with the mock API. It covers the password gate, the 26 experts, single-expert chat on Opus and Haiku, the whole-team run and its contributors, error banners, and the mobile drawer.

```bash
npm run check:secrets
```

`npm run check:secrets` scans `dist/` for secrets.

The automated tests use a mock of the Anthropic API, so they don't spend money or need a key. **They don't check the quality of real Claude answers.** After deploying, try a real single-expert question and a real whole-team question.

## Data storage

Jobs (the question, any chat history you sent, progress, and answers) are stored in the Netlify Blobs store `experts21-jobs` for this site. Netlify creates it automatically, with no setup. The status endpoint returns a job only with its poll token, and never returns the stored chat history. To clear old jobs, delete the store in the Netlify UI (**Blobs**) or with the Netlify CLI.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "API key not configured" (`missing_api_key`) | Add `ANTHROPIC_API_KEY` in Netlify, then **redeploy**. |
| "API key rejected" (`invalid_api_key`) | The key is wrong or revoked. Create a new one in the Anthropic Console. |
| "Password required" (`unauthorized`) | Enter the `APP_PASSWORD`. If you changed it, reload the page. |
| `rate_limited` | Wait for the hourly window to reset, or raise `RATE_LIMIT_PER_HOUR`. |
| `job_stalled` / `job_not_started` / `worker_not_started` | The background worker didn't start or stopped saving progress. Check **Logs → Functions → run-job** in Netlify, then try again. If you're on an old deploy, redeploy so `run-job` exists. |
| `job_deadline` | A job ran past `JOB_DEADLINE_MS`. Ask a narrower question or lower `MAX_TEAM_EXPERTS`. |
| `connection_lost` | Your connection dropped while the experts were working. Select **Try again** to reconnect to the same job. |
| `model_not_found` | Your key can't use that model. Set `MODEL_OPUS` / `MODEL_SONNET` / `MODEL_HAIKU`. |
| An expert's answer is missing from a team result | That expert's call failed. The card shows why, and Ava treats that area as an open question. |
