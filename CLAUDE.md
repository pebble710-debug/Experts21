# Experts21 — Miami Specialty Coffee Shop Expert Team

## Purpose

Experts21 is a team of 26 Claude Code agents that helps plan, open, run, and grow an independent **specialty coffee shop in Miami, Florida (Miami-Dade County)**. It covers the whole lifecycle: concept, finance, site, permits, build-out, compliance, supply, staffing, operations, customer experience, technology, marketing, and growth. Every agent works from the research in `docs/` (research date 2026-11-23).

## Repository layout

| Path | Contents |
|---|---|
| `docs/README.md` | Research index, **evidence labels**, key numbers, open questions |
| `docs/01-…09-*.md` | Research: market, customers, competitors, startup costs, operating costs, permits, staffing, marketing, risks |
| `docs/expert-roster.md` | Roster of the 24 specialists, their skills, and the shared-skill map |
| `.claude/agents/` | 26 project subagents (24 specialists + `orchestrator` + `agent-builder`) |
| `.claude/skills/<name>/SKILL.md` | 24 shared project skills |
| `scripts/validate_team.py` | Tests for agent config, skill references, and orchestrator routing |

## Ground rules for every answer in this repo

- Use `docs/` as the source of truth, and keep its evidence labels: **[CONFIRMED]** (primary or official source), **[REPORTED]** (credible secondary source), **[ESTIMATE]** (vendor ranges or our model), **[UNVERIFIED]** (single, old, or conflicting source).
- Never invent regulatory requirements, fees, costs, wages, or business facts. Say when something isn't covered, and verify against primary sources before acting.
- Legal, tax, insurance, and permit output is planning guidance and needs review by a licensed professional.

## How the 26 agents are organized

| ID | Agent name | Role | Phase |
|---|---|---|---|
| A01 | `launch-program-director` | Launch Program Director | 1. Concept & Strategy |
| A02 | `concept-brand-strategist` | Concept & Brand Strategist | 1. Concept & Strategy |
| A03 | `market-customer-insights-analyst` | Market & Customer Insights Analyst | 1. Concept & Strategy |
| A04 | `competitive-intelligence-analyst` | Competitive Intelligence Analyst | 1. Concept & Strategy |
| A05 | `financial-modeling-funding-strategist` | Financial Modeling & Funding Strategist | 2. Finance & Legal Setup |
| A06 | `entity-tax-bookkeeping-specialist` | Entity, Tax & Bookkeeping Specialist | 2. Finance & Legal Setup |
| A07 | `site-selection-real-estate-specialist` | Site Selection & Commercial Real Estate Specialist | 3. Site & Build-Out |
| A08 | `lease-negotiation-specialist` | Lease Negotiation Specialist | 3. Site & Build-Out |
| A09 | `permitting-zoning-expediter` | Permitting & Zoning Expediter | 3. Site & Build-Out |
| A10 | `environmental-utility-compliance-specialist` | Environmental & Utility Compliance Specialist | 3. Site & Build-Out |
| A11 | `design-buildout-project-manager` | Café Design & Build-Out Project Manager | 3. Site & Build-Out |
| A12 | `food-safety-licensing-specialist` | Food Safety & Licensing Compliance Specialist | 4. Compliance & Risk |
| A13 | `employment-law-hr-compliance-specialist` | Employment Law & HR Compliance Specialist | 4. Compliance & Risk |
| A14 | `risk-insurance-hurricane-manager` | Risk, Insurance & Hurricane Preparedness Manager | 4. Compliance & Risk |
| A15 | `coffee-sourcing-roaster-partnership-specialist` | Coffee Sourcing & Roaster Partnership Specialist | 5. Product & Supply Chain |
| A16 | `head-of-coffee-beverage-program` | Head of Coffee (Beverage Program & Bar Standards) | 5. Product & Supply Chain |
| A17 | `food-program-purchasing-manager` | Food Program & Purchasing Manager | 5. Product & Supply Chain |
| A18 | `talent-acquisition-training-manager` | Talent Acquisition & Training Manager | 6. People, Operations & CX |
| A19 | `cafe-operations-manager` | Café Operations Manager | 6. People, Operations & CX |
| A20 | `customer-experience-service-design-lead` | Customer Experience & Service Design Lead | 6. People, Operations & CX |
| A21 | `technology-pos-data-specialist` | Technology, POS & Data Systems Specialist | 7. Technology & Marketing |
| A22 | `marketing-pr-launch-manager` | Marketing, PR & Launch Manager | 7. Technology & Marketing |
| A23 | `social-media-community-manager` | Social Media & Community Manager | 7. Technology & Marketing |
| A24 | `growth-expansion-strategist` | Growth & Expansion Strategist | 8. Growth |
| A25 | `orchestrator` | Orchestrator: routes questions, combines expert findings, resolves disagreements | Coordination |
| A26 | `agent-builder` | Agent Builder: creates, evaluates, and improves agents and skills | Meta |

Specialists are advisors with read and research tools (`Read, Grep, Glob, WebSearch, WebFetch, Skill`). They cannot call each other. They name handoffs in their answers, and the main session or the `orchestrator` routes the work. The orchestrator also has the `Agent` tool so it can consult specialists. `agent-builder` can edit files and run tests.

## How shared skills are used

Each shared skill is written once in `.claude/skills/<name>/SKILL.md` and listed in the `skills:` frontmatter of every agent that needs it. Claude Code loads the full skill into those agents when they start. The assignments match `docs/expert-roster.md` exactly (this is checked by the tests). You can also run a skill yourself, for example `/unit-economics-modeling` or `/primary-source-verification`.

| ID | Skill | # agents | Agents |
|---|---|---|---|
| S01 | `research-evidence-labeling` | 24 | all 24 specialists (+ orchestrator, agent-builder) |
| S02 | `primary-source-verification` | 6 | `entity-tax-bookkeeping-specialist`, `permitting-zoning-expediter`, `environmental-utility-compliance-specialist`, `food-safety-licensing-specialist`, `employment-law-hr-compliance-specialist`, `risk-insurance-hurricane-manager`, `orchestrator` |
| S03 | `miami-jurisdiction-mapping` | 6 | `entity-tax-bookkeeping-specialist`, `site-selection-real-estate-specialist`, `lease-negotiation-specialist`, `permitting-zoning-expediter`, `environmental-utility-compliance-specialist`, `food-safety-licensing-specialist` |
| S04 | `unit-economics-modeling` | 7 | `launch-program-director`, `financial-modeling-funding-strategist`, `entity-tax-bookkeeping-specialist`, `site-selection-real-estate-specialist`, `lease-negotiation-specialist`, `cafe-operations-manager`, `growth-expansion-strategist` |
| S05 | `recipe-drink-costing` | 5 | `financial-modeling-funding-strategist`, `coffee-sourcing-roaster-partnership-specialist`, `head-of-coffee-beverage-program`, `food-program-purchasing-manager`, `cafe-operations-manager` |
| S06 | `price-positioning` | 7 | `concept-brand-strategist`, `market-customer-insights-analyst`, `competitive-intelligence-analyst`, `financial-modeling-funding-strategist`, `head-of-coffee-beverage-program`, `food-program-purchasing-manager`, `marketing-pr-launch-manager` |
| S07 | `neighborhood-demographic-analysis` | 6 | `concept-brand-strategist`, `market-customer-insights-analyst`, `competitive-intelligence-analyst`, `site-selection-real-estate-specialist`, `marketing-pr-launch-manager`, `growth-expansion-strategist` |
| S08 | `competitor-tracking` | 6 | `concept-brand-strategist`, `market-customer-insights-analyst`, `competitive-intelligence-analyst`, `site-selection-real-estate-specialist`, `marketing-pr-launch-manager`, `growth-expansion-strategist` |
| S09 | `bilingual-miami-cultural-fluency` | 7 | `concept-brand-strategist`, `market-customer-insights-analyst`, `head-of-coffee-beverage-program`, `talent-acquisition-training-manager`, `customer-experience-service-design-lead`, `marketing-pr-launch-manager`, `social-media-community-manager` |
| S10 | `critical-path-scheduling` | 5 | `launch-program-director`, `permitting-zoning-expediter`, `environmental-utility-compliance-specialist`, `design-buildout-project-manager`, `marketing-pr-launch-manager`, `orchestrator` |
| S11 | `contract-vendor-negotiation` | 7 | `financial-modeling-funding-strategist`, `lease-negotiation-specialist`, `design-buildout-project-manager`, `risk-insurance-hurricane-manager`, `coffee-sourcing-roaster-partnership-specialist`, `food-program-purchasing-manager`, `technology-pos-data-specialist` |
| S12 | `lease-permit-contingency-review` | 5 | `launch-program-director`, `site-selection-real-estate-specialist`, `lease-negotiation-specialist`, `permitting-zoning-expediter`, `risk-insurance-hurricane-manager` |
| S13 | `seasonality-demand-forecasting` | 7 | `market-customer-insights-analyst`, `financial-modeling-funding-strategist`, `food-program-purchasing-manager`, `cafe-operations-manager`, `marketing-pr-launch-manager`, `social-media-community-manager`, `growth-expansion-strategist` |
| S14 | `florida-wage-labor-cost` | 5 | `financial-modeling-funding-strategist`, `entity-tax-bookkeeping-specialist`, `employment-law-hr-compliance-specialist`, `talent-acquisition-training-manager`, `cafe-operations-manager` |
| S15 | `food-safety-sanitation` | 6 | `environmental-utility-compliance-specialist`, `food-safety-licensing-specialist`, `head-of-coffee-beverage-program`, `food-program-purchasing-manager`, `talent-acquisition-training-manager`, `cafe-operations-manager` |
| S16 | `commodity-input-cost-monitoring` | 5 | `financial-modeling-funding-strategist`, `risk-insurance-hurricane-manager`, `coffee-sourcing-roaster-partnership-specialist`, `head-of-coffee-beverage-program`, `food-program-purchasing-manager` |
| S17 | `hurricane-business-continuity` | 7 | `launch-program-director`, `design-buildout-project-manager`, `risk-insurance-hurricane-manager`, `food-program-purchasing-manager`, `cafe-operations-manager`, `technology-pos-data-specialist`, `social-media-community-manager` |
| S18 | `pos-sales-analytics` | 6 | `cafe-operations-manager`, `customer-experience-service-design-lead`, `technology-pos-data-specialist`, `marketing-pr-launch-manager`, `social-media-community-manager`, `growth-expansion-strategist` |
| S19 | `brand-voice-content` | 5 | `concept-brand-strategist`, `customer-experience-service-design-lead`, `marketing-pr-launch-manager`, `social-media-community-manager`, `growth-expansion-strategist` |
| S20 | `customer-feedback-reviews` | 4 | `cafe-operations-manager`, `customer-experience-service-design-lead`, `marketing-pr-launch-manager`, `social-media-community-manager` |
| S21 | `sop-training-design` | 6 | `food-safety-licensing-specialist`, `head-of-coffee-beverage-program`, `talent-acquisition-training-manager`, `cafe-operations-manager`, `customer-experience-service-design-lead`, `technology-pos-data-specialist` |
| S22 | `bar-layout-equipment-spec` | 5 | `environmental-utility-compliance-specialist`, `design-buildout-project-manager`, `head-of-coffee-beverage-program`, `cafe-operations-manager`, `technology-pos-data-specialist` |
| S23 | `workforce-eligibility-compliance` | 2 | `employment-law-hr-compliance-specialist`, `talent-acquisition-training-manager` |
| S24 | `capital-budgeting-contingency` | 6 | `launch-program-director`, `financial-modeling-funding-strategist`, `site-selection-real-estate-specialist`, `lease-negotiation-specialist`, `design-buildout-project-manager`, `growth-expansion-strategist` |

## Ask one expert

- **Natural language:** "Use the lease-negotiation-specialist agent to review these LOI terms."
- **@-mention:** `@agent-permitting-zoning-expediter What permits does a Wynwood café need?`
- **Whole session as one expert:** `claude --agent cafe-operations-manager`

## Ask the whole team

Send the question to the orchestrator. It picks the relevant experts, asks them in parallel, and returns one combined recommendation with disagreements and next steps:

- `@agent-orchestrator Should we open in Brickell or Coral Gables with a $400k budget?`
- Or run the session as the orchestrator: `claude --agent orchestrator`

Tip: give the orchestrator context (budget, neighborhood, concept, timeline) so it can brief the experts well.

## Add a new agent or skill

1. Ask `agent-builder`, for example: `@agent-agent-builder Create a specialist for on-site roasting and air permits.`
2. It follows the project standards. It adds the agent file (and any new shared skill), registers the agent in `docs/expert-roster.md`, the orchestrator routing table, this file, and the skills' `used_by` metadata, then runs the tests.
3. To do it by hand, copy an existing specialist in `.claude/agents/`, keep the section structure and the evidence rules, update the registrations above, and run:

```bash
python3 scripts/validate_team.py
```

## Not built yet

The website comes later (Step 11). Do not build it until asked.
