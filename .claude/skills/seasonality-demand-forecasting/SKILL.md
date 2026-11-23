---
name: seasonality-demand-forecasting
description: Forecast month-by-month demand for a Miami café, covering the Dec–Apr peak, summer slowdown, hurricane season, and event spikes, and turn it into staffing, inventory, and cash plans.
when_to_use: Use when building monthly forecasts, schedules, purchasing plans, cash reserves, or marketing calendars.
metadata:
  id: S13
  project: Experts21
  used_by:
  - market-customer-insights-analyst
  - financial-modeling-funding-strategist
  - food-program-purchasing-manager
  - cafe-operations-manager
  - marketing-pr-launch-manager
  - social-media-community-manager
  - growth-expansion-strategist
---

# Seasonality & demand forecasting (S13)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Forecast the Dec–Apr peak, summer slowdown, hurricane season, and event spikes (Art Basel, Ultra, F1).

## When to use

Use when building monthly forecasts, schedules, purchasing plans, cash reserves, or marketing calendars.

## Procedure

1. Start from an annual base (unit-economics-modeling) and spread it by month using seasonality factors. Label them [ESTIMATE] until real POS data exists.
2. Higher months: Dec–Apr tourist and snowbird season; Art Basel (early Dec); Miami Music Week / Ultra (March); F1 Miami (May). Check each year's dates.
3. Lower months: June–Sept summer slowdown, overlapping with peak hurricane season (June 1–Nov 30).
4. Turn the forecast into labor hours, purchasing pars, and the cash reserve needed for the low months.
5. Replace the estimates with actual POS data after 3–6 months.

## Reference facts (from docs/, research date 2026-11-23)

- Summer slowdown and closures reported (Axios May 2026; CBS 2025). [REPORTED]
- Tourism peaks Dec–Apr. [REPORTED] docs/08.

## Output

A monthly table: `Month | Index | Revenue | Labor hrs | Notes/events`.

## Guardrails

- No Miami café-specific seasonality index exists in the research. Factors are assumptions.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A03 `market-customer-insights-analyst` — Market & Customer Insights Analyst
- A05 `financial-modeling-funding-strategist` — Financial Modeling & Funding Strategist
- A17 `food-program-purchasing-manager` — Food Program & Purchasing Manager
- A19 `cafe-operations-manager` — Café Operations Manager
- A22 `marketing-pr-launch-manager` — Marketing, PR & Launch Manager
- A23 `social-media-community-manager` — Social Media & Community Manager
- A24 `growth-expansion-strategist` — Growth & Expansion Strategist
