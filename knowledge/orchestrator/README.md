# Knowledge folder: Ava, Orchestrator (A25)

- **Agent:** `orchestrator` (`.claude/agents/orchestrator.md`)
- **Model:** `opus`
- **Personality:** Diplomatic team chair who brings the experts together.

## What this folder is for

Ava reads this folder **before answering any question**. Put documents here that are specific to *your* café and to Ava's job: real quotes, signed documents, reports, logs, and notes. These are more specific and more current than the general research in `docs/`.

## Documents that belong here

- Past combined recommendations worth reusing
- Routing notes (questions that were routed poorly and how to fix them)
- Owner preferences and constraints (budget, neighborhood, timeline)

## Shared research Ava consults (`docs/`)

These files are always used, whether or not you add documents here:

- `docs/README.md`
- `docs/expert-roster.md`
- `docs/how-to-talk-to-your-experts.md`
- `docs/orchestrator-routing-test-results.md`
- `docs/agent-brains.md`

## How to add a document

1. Save it in this folder. Markdown (`.md`) or plain text (`.txt`) works best, and PDFs can be read too.
2. Use a dated, descriptive file name, for example `2026-12-01-landlord-loi-brickell.md`.
3. At the top of the file, note the **source**, the **date**, and the **status** (official or signed / quote / draft). The agent uses this to label facts [CONFIRMED], [REPORTED], or [UNVERIFIED].
4. Commit it to the repository so every session sees it.

## Privacy

This repository may be shared. Don't store passwords, bank or card numbers, Social Security numbers, or personal employee records here. Summarize or redact sensitive details.

## Current contents

Only this README. Until documents are added, Ava uses the shared research in `docs/` and says that no additional documents have been provided.
