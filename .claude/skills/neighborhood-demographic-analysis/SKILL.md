---
name: neighborhood-demographic-analysis
description: Judge demand around a candidate site using Census ACS tract data, LEHD daytime-worker counts, tourism flows, and foot-traffic data.
when_to_use: Use when comparing neighborhoods or sites, sizing a customer segment, or deciding where to open or expand.
metadata:
  id: S07
  project: Experts21
  used_by:
  - concept-brand-strategist
  - market-customer-insights-analyst
  - competitive-intelligence-analyst
  - site-selection-real-estate-specialist
  - marketing-pr-launch-manager
  - growth-expansion-strategist
---

# Neighborhood & demographic analysis (S07)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Use ACS tract data, LEHD daytime workers, and foot-traffic data to judge demand near a site.

## When to use

Use when comparing neighborhoods or sites, sizing a customer segment, or deciding where to open or expand.

## Procedure

1. Define a trade area (0.5 mile walkable; 1 mile or more for car-dependent areas).
2. Pull ACS 5-year data (population, age 18–34 share, median household income, households) for the tracts in that area. Pull LEHD OnTheMap for daytime workers.
3. Add tourism context (hotels, attractions, event venues) and foot-traffic data (for example, Placer.ai) if available.
4. Score demand for each customer segment in docs/02 (office, condo residents, enthusiasts, tourists, Latin "upgraders", students).
5. Combine with competitor density (competitor-tracking) to find under-served areas.

## Reference facts (from docs/, research date 2026-11-23)

- Miami-Dade population 2,802,029 (July 2025); 70.6% Hispanic or Latino; median household income $71,753 (2020–2024). [CONFIRMED] Census.
- Greater Miami visitors 28.3M in 2025; $23B visitor spending. [REPORTED] GMCVB.
- Best-fit areas by segment are listed in docs/02. [ESTIMATE]

## Output

A site scorecard: `Metric | Value | Label/Source | Score`.

## Guardrails

- County averages hide big neighborhood differences. Use tract-level data before you conclude.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A02 `concept-brand-strategist` — Concept & Brand Strategist
- A03 `market-customer-insights-analyst` — Market & Customer Insights Analyst
- A04 `competitive-intelligence-analyst` — Competitive Intelligence Analyst
- A07 `site-selection-real-estate-specialist` — Site Selection & Commercial Real Estate Specialist
- A22 `marketing-pr-launch-manager` — Marketing, PR & Launch Manager
- A24 `growth-expansion-strategist` — Growth & Expansion Strategist
