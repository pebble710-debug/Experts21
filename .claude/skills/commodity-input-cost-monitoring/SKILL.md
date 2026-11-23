---
name: commodity-input-cost-monitoring
description: Track arabica coffee prices, tariffs, and milk and packaging costs, and recommend contract or menu-price changes when inputs move.
when_to_use: Use when negotiating roaster contracts, reviewing COGS, setting prices, or assessing supply-cost risk.
metadata:
  id: S16
  project: Experts21
  used_by:
  - financial-modeling-funding-strategist
  - risk-insurance-hurricane-manager
  - coffee-sourcing-roaster-partnership-specialist
  - head-of-coffee-beverage-program
  - food-program-purchasing-manager
---

# Commodity & input-cost monitoring (S16)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Track arabica futures (~$2.75/lb, Nov 2026), tariff policy, and milk and packaging prices, and flag when menu prices need changing.

## When to use

Use when negotiating roaster contracts, reviewing COGS, setting prices, or assessing supply-cost risk.

## Procedure

1. Check the arabica "C" price (for example, Trading Economics, ICE) and note the date and value.
2. Check trade policy for coffee origins (tariff changes can be fast).
3. Track invoice prices for roasted coffee, milk/alt-milk, cups, and lids every month.
4. Recalculate drink costs (recipe-drink-costing) when any input moves more than about 10%. [ESTIMATE threshold]
5. Recommend: lock a fixed price, use a second supplier, adjust recipes, or change menu prices.

## Reference facts (from docs/, research date 2026-11-23)

- Arabica ~274.90 ¢/lb on 2026-11-16, −12.9% in a month, −31.7% in a year; El Niño is an upside risk into early 2027. [REPORTED]
- U.S. tariffs on Brazilian coffee (40% + 10%) were removed in Nov 2025 for entries from 2025-11-13. [CONFIRMED]
- Specialty green trades above the "C" price, so lower futures help only partly. docs/01.

## Output

A short dashboard: `Input | Latest | Date | Change | Action`.

## Guardrails

- Always give the date of a price. Prices from the research are snapshots.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A05 `financial-modeling-funding-strategist` — Financial Modeling & Funding Strategist
- A14 `risk-insurance-hurricane-manager` — Risk, Insurance & Hurricane Preparedness Manager
- A15 `coffee-sourcing-roaster-partnership-specialist` — Coffee Sourcing & Roaster Partnership Specialist
- A16 `head-of-coffee-beverage-program` — Head of Coffee (Beverage Program & Bar Standards)
- A17 `food-program-purchasing-manager` — Food Program & Purchasing Manager
