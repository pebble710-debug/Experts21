# Experts21

A team of **26 AI expert agents** (Claude Code subagents) that helps plan, open, run, and grow an independent **specialty coffee shop in Miami, Florida**. It covers concept, finance, site and lease, permits, build-out, compliance, coffee and food supply, staffing, operations, customer experience, technology, marketing, and growth.

## Start here

| If you want to… | Read |
|---|---|
| Ask the experts questions (no coding needed) | [`docs/how-to-talk-to-your-experts.md`](docs/how-to-talk-to-your-experts.md) |
| See each expert's name, AI model, personality, and knowledge folder | [`docs/agent-brains.md`](docs/agent-brains.md) |
| See the research the experts use | [`docs/README.md`](docs/README.md) |
| See the team roster and shared skills | [`docs/expert-roster.md`](docs/expert-roster.md) |
| Understand how the project is organized (for Claude Code and maintainers) | [`CLAUDE.md`](CLAUDE.md) |
| Use or deploy the web app | [`web/README.md`](web/README.md) |

## Quick examples

```text
@agent-orchestrator We found a 1,200 sq ft space in Wynwood at $95/sq ft NNN with no grease trap. Should we sign?
```

```text
@agent-head-of-coffee-beverage-program Design a specialty cortadito and colada with recipes and drink costs.
```

## Web app

`web/` contains a React website where users can chat with any of the 26 experts or **Ask the Whole Team**. In a whole-team question, Ava picks the specialists, each one answers in its own Claude call, and Ava combines their answers. The site is built from this repository's agents, skills, knowledge folders, and research. The API key stays on the server, in a Netlify Function. Build, test, and deployment steps are in [`web/README.md`](web/README.md). It is not deployed yet.

## Knowledge folders

Every agent has its own folder: `knowledge/<agent-name>/` (26 folders). Each agent reads its folder before answering.

- Each folder's `README.md` lists the documents that belong there and the shared research in `docs/` that the agent always uses.
- **Add your own documents** (landlord LOIs, contractor quotes, roaster price sheets, sales reports, inspection results) to the matching agent's folder. The agent reads them first, cites them, and labels how reliable they are.
- If a folder has no documents yet, the agent uses the shared research and tells you no additional documents have been provided.
- Don't store passwords, account numbers, or personal employee records in this repository.

See [`knowledge/README.md`](knowledge/README.md) for the full list of folders, and [`docs/agent-brains.md`](docs/agent-brains.md) for each agent's model and personality.

## Repository layout

| Path | Contents |
|---|---|
| `docs/` | Research (dated 2026-11-23), roster, user guide, agent brains, routing test results |
| `.claude/agents/` | 26 agent definitions (24 specialists, `orchestrator`, `agent-builder`) |
| `.claude/skills/` | 24 shared skills |
| `knowledge/` | One knowledge folder per agent |
| `scripts/` | Tests: `validate_team.py` (offline) and `live_routing_test.py` (live, uses model usage) |
| `web/` | React web app + Netlify Function: chat with one expert or ask the whole team (not deployed yet) |
| `netlify.toml` | Netlify build configuration for the web app |

## Run the tests

```bash
python3 scripts/validate_team.py
```

All answers are planning guidance labeled [CONFIRMED], [REPORTED], [ESTIMATE], or [UNVERIFIED]. Have a licensed professional review legal, tax, insurance, and permit decisions.
