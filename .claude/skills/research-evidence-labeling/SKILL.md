---
name: research-evidence-labeling
description: Find facts in the Experts21 docs/ research and label every claim [CONFIRMED], [REPORTED], [ESTIMATE], or [UNVERIFIED] with its source link and date.
when_to_use: Use on every answer from any Experts21 agent, whenever a number, rule, fee, date, or market claim is stated.
metadata:
  id: S01
  project: Experts21
  used_by:
  - launch-program-director
  - concept-brand-strategist
  - market-customer-insights-analyst
  - competitive-intelligence-analyst
  - financial-modeling-funding-strategist
  - entity-tax-bookkeeping-specialist
  - site-selection-real-estate-specialist
  - lease-negotiation-specialist
  - permitting-zoning-expediter
  - environmental-utility-compliance-specialist
  - design-buildout-project-manager
  - food-safety-licensing-specialist
  - employment-law-hr-compliance-specialist
  - risk-insurance-hurricane-manager
  - coffee-sourcing-roaster-partnership-specialist
  - head-of-coffee-beverage-program
  - food-program-purchasing-manager
  - talent-acquisition-training-manager
  - cafe-operations-manager
  - customer-experience-service-design-lead
  - technology-pos-data-specialist
  - marketing-pr-launch-manager
  - social-media-community-manager
  - growth-expansion-strategist
---

# Research navigation & evidence labeling (S01)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Find facts in `docs/`, keep the [CONFIRMED]/[REPORTED]/[ESTIMATE]/[UNVERIFIED] labels, and cite source links with dates.

## When to use

Use on every answer from any Experts21 agent, whenever a number, rule, fee, date, or market claim is stated.

## Procedure

1. Start with `docs/README.md` (index, label definitions, key numbers), then open the topic file(s) 01–09 that match the question. Use `docs/expert-roster.md` for team roles.
2. Copy facts together with their existing label. Never upgrade a label (for example, [REPORTED] to [CONFIRMED]) unless you checked a primary source yourself (see the primary-source-verification skill).
3. Label anything new you add: a primary government source or several reliable outlets → [CONFIRMED]; news, trade, or broker reports → [REPORTED]; vendor ranges or your own model → [ESTIMATE]; a single, old, or conflicting source → [UNVERIFIED].
4. Cite the source: the docs file and section, plus the original URL listed in that file's Sources section. Say "research date 2026-11-23" for facts from docs/.
5. If docs/ does not cover the point, say "Not covered in the research". Then either flag it as an open question or look it up and label it. Never fill the gap with a guess presented as fact.

## Reference facts (from docs/, research date 2026-11-23)

- Label definitions live in `docs/README.md` → "Evidence labels".
- Research date for all docs/ files: 2026-11-23.
- Topic files: 01 market, 02 customers, 03 competitors, 04 startup costs, 05 operating costs, 06 permits, 07 staffing, 08 marketing, 09 risks.

## Output

End answers with an **Evidence** list: `claim — label — source (docs file / URL)`.

## Guardrails

- Do not invent figures, fees, laws, or business names.
- Do not drop a label when you summarize.
- Keep estimates visibly separate from confirmed facts.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A01 `launch-program-director` — Launch Program Director
- A02 `concept-brand-strategist` — Concept & Brand Strategist
- A03 `market-customer-insights-analyst` — Market & Customer Insights Analyst
- A04 `competitive-intelligence-analyst` — Competitive Intelligence Analyst
- A05 `financial-modeling-funding-strategist` — Financial Modeling & Funding Strategist
- A06 `entity-tax-bookkeeping-specialist` — Entity, Tax & Bookkeeping Specialist
- A07 `site-selection-real-estate-specialist` — Site Selection & Commercial Real Estate Specialist
- A08 `lease-negotiation-specialist` — Lease Negotiation Specialist
- A09 `permitting-zoning-expediter` — Permitting & Zoning Expediter
- A10 `environmental-utility-compliance-specialist` — Environmental & Utility Compliance Specialist
- A11 `design-buildout-project-manager` — Café Design & Build-Out Project Manager
- A12 `food-safety-licensing-specialist` — Food Safety & Licensing Compliance Specialist
- A13 `employment-law-hr-compliance-specialist` — Employment Law & HR Compliance Specialist
- A14 `risk-insurance-hurricane-manager` — Risk, Insurance & Hurricane Preparedness Manager
- A15 `coffee-sourcing-roaster-partnership-specialist` — Coffee Sourcing & Roaster Partnership Specialist
- A16 `head-of-coffee-beverage-program` — Head of Coffee (Beverage Program & Bar Standards)
- A17 `food-program-purchasing-manager` — Food Program & Purchasing Manager
- A18 `talent-acquisition-training-manager` — Talent Acquisition & Training Manager
- A19 `cafe-operations-manager` — Café Operations Manager
- A20 `customer-experience-service-design-lead` — Customer Experience & Service Design Lead
- A21 `technology-pos-data-specialist` — Technology, POS & Data Systems Specialist
- A22 `marketing-pr-launch-manager` — Marketing, PR & Launch Manager
- A23 `social-media-community-manager` — Social Media & Community Manager
- A24 `growth-expansion-strategist` — Growth & Expansion Strategist
