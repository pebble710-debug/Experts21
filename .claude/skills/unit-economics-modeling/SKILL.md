---
name: unit-economics-modeling
description: Model café revenue, COGS, labor, occupancy, and break-even using the Experts21 P&L assumptions, and show the sensitivity to rent, ticket, and traffic.
when_to_use: Use for any question about profitability, break-even, affordable rent, staffing budgets, or whether a site or idea makes financial sense.
metadata:
  id: S04
  project: Experts21
  used_by:
  - launch-program-director
  - financial-modeling-funding-strategist
  - entity-tax-bookkeeping-specialist
  - site-selection-real-estate-specialist
  - lease-negotiation-specialist
  - cafe-operations-manager
  - growth-expansion-strategist
---

# Unit economics & P&L modeling (S04)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Model revenue (transactions × ticket), COGS, labor %, occupancy %, and break-even (about 150–170 transactions/day in the current model).

## When to use

Use for any question about profitability, break-even, affordable rent, staffing budgets, or whether a site or idea makes financial sense.

## Procedure

1. Start from the docs/05 sample P&L: 1,200 sq ft, 360 days, $9 average ticket. Conservative case 180 transactions/day ($583k revenue); target case 280/day ($907k).
2. Revenue = transactions/day × average ticket × operating days. State each input and its label.
3. Costs: COGS 25–35% (target ~30%); labor incl. burden 25–34%; occupancy (base + NNN) fixed; utilities, insurance, and repairs ~$45–50k; card fees, software, marketing, and admin ~8%. All [ESTIMATE].
4. Break-even transactions/day = fixed costs ÷ (ticket × (1 − variable %)) ÷ days. The docs model gives about 150–170/day.
5. Run sensitivities: rent ±$20/sq ft, ticket ±$1, traffic ±20%, labor ±3 pts. Report which input matters most.
6. Occupancy check: total rent + NNN should be at or below about 10–12% of realistic sales.

## Reference facts (from docs/, research date 2026-11-23)

- Conservative case: revenue $583k → operating profit ≈ $10k (≈2%). Target: $907k → ≈ $132k (≈15%). [ESTIMATE] docs/05.
- Industry break-even guide: 80–100 transactions/day; profitable at 150–200+. [ESTIMATE]
- Miami-Dade average retail asking rent $50.27/sq ft (Q3 2026) [REPORTED]; NNN often adds $15–$30/sq ft [ESTIMATE].

## Output

A small table of inputs (with labels) → outputs, then 2–3 sentences on what the numbers mean.

## Guardrails

- Every model output is an [ESTIMATE].
- Never present a projection as a fact or guarantee.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A01 `launch-program-director` — Launch Program Director
- A05 `financial-modeling-funding-strategist` — Financial Modeling & Funding Strategist
- A06 `entity-tax-bookkeeping-specialist` — Entity, Tax & Bookkeeping Specialist
- A07 `site-selection-real-estate-specialist` — Site Selection & Commercial Real Estate Specialist
- A08 `lease-negotiation-specialist` — Lease Negotiation Specialist
- A19 `cafe-operations-manager` — Café Operations Manager
- A24 `growth-expansion-strategist` — Growth & Expansion Strategist
