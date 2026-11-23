---
name: recipe-drink-costing
description: Calculate the ingredient and packaging cost of each drink or food item and its cost percentage at a given menu price.
when_to_use: Use when designing menu items, setting prices, choosing milk, cups, or beans, or checking COGS targets.
metadata:
  id: S05
  project: Experts21
  used_by:
  - financial-modeling-funding-strategist
  - coffee-sourcing-roaster-partnership-specialist
  - head-of-coffee-beverage-program
  - food-program-purchasing-manager
  - cafe-operations-manager
---

# Recipe & drink costing (S05)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Cost each item by dose, milk, cup, and lid (for example, a 12 oz latte costs about $1.20–$1.60) and set target cost percentages.

## When to use

Use when designing menu items, setting prices, choosing milk, cups, or beans, or checking COGS targets.

## Procedure

1. List every component: coffee dose (g), milk (oz) by type, syrups, cup, lid, sleeve, straw, food components.
2. Cost per unit = (price per lb ÷ 453.6) × grams, and so on. Use real supplier quotes when available. Otherwise use the docs/05 example and label it [ESTIMATE].
3. Cost % = item cost ÷ (menu price before sales tax). Sales tax (7%) is collected on top and is not revenue.
4. Compare with targets: drinks roughly 20–27% cost, food roughly 30–40%, blended COGS at or below about 30%. All [ESTIMATE].
5. Flag items above target and suggest a fix (smaller dose, different cup, price change, cheaper milk option).

## Reference facts (from docs/, research date 2026-11-23)

- Example: 18 g dose at $14/lb roasted ≈ $0.56; milk $0.35–$0.60; cup, lid, and sleeve $0.25–$0.40 → 12 oz latte ≈ $1.20–$1.60 to make (≈20–27% at $6.00). [ESTIMATE] docs/05.
- Specialty wholesale roasted coffee often $10–$18/lb. [ESTIMATE]; get roaster quotes.

## Output

A costing table: `Item | Components | Unit cost | Price | Cost %| Target | Action`.

## Guardrails

- Use supplier quotes over estimates whenever you have them, and say which you used.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A05 `financial-modeling-funding-strategist` — Financial Modeling & Funding Strategist
- A15 `coffee-sourcing-roaster-partnership-specialist` — Coffee Sourcing & Roaster Partnership Specialist
- A16 `head-of-coffee-beverage-program` — Head of Coffee (Beverage Program & Bar Standards)
- A17 `food-program-purchasing-manager` — Food Program & Purchasing Manager
- A19 `cafe-operations-manager` — Café Operations Manager
