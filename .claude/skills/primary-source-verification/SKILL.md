---
name: primary-source-verification
description: Re-check fees, laws, wage rates, and tax rates against the official primary source before anyone relies on them, and record the result and date.
when_to_use: Use before giving a regulatory, tax, wage, or fee figure as actionable, when a docs fact is labeled [UNVERIFIED] or [REPORTED], or when a rule may have changed since 2026-11-23.
metadata:
  id: S02
  project: Experts21
  used_by:
  - entity-tax-bookkeeping-specialist
  - permitting-zoning-expediter
  - environmental-utility-compliance-specialist
  - food-safety-licensing-specialist
  - employment-law-hr-compliance-specialist
  - risk-insurance-hurricane-manager
---

# Primary-source verification (S02)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Re-check fees, laws, and rates against the official source (DBPR, Sunbiz, Miami-Dade, FL DOR, flsenate.gov, BLS) before anyone acts on them.

## When to use

Use before giving a regulatory, tax, wage, or fee figure as actionable, when a docs fact is labeled [UNVERIFIED] or [REPORTED], or when a rule may have changed since 2026-11-23.

## Procedure

1. Identify the authority for the item: FL DBPR (food licences), Sunbiz (entities), FL DOR (sales and reemployment tax), Miami-Dade Tax Collector (BTR), Miami-Dade DERM (grease/FOG), WASD (water/sewer), city building and zoning (CU, permits), flsenate.gov (statutes), FL Commerce / U.S. DOL (wages), BLS (wage data).
2. Open the official page, fee schedule, or statute (WebFetch/WebSearch if available). Prefer .gov or the agency's own domain.
3. Compare it with the docs/ value. Record the result as: matches / changed (new value) / could not verify.
4. Update the label: verified today → [CONFIRMED] with today's date and URL. Could not reach the source → keep the original label and add "verification pending".
5. Tell the user which items still need a phone call or a professional (attorney, CPA, expediter, broker).

## Reference facts (from docs/, research date 2026-11-23)

- Already confirmed in docs (2026-11-23): DBPR food service licence $242 non-seating / $262 (1–49 seats) / $273 (50–149 seats) plus a $50 application fee; plan review $0.
- Confirmed: FL minimum wage $15.00 and tipped $11.98 from 2026-09-30; Miami-Dade combined sales tax 7%; commercial rent sales tax repealed for periods on or after 2025-10-01; E-Verify required at 25+ employees.
- Unverified, need checking: DERM GDO permit fee, county and city BTR amounts for a café, current impact fees, current City of Miami sidewalk-café fee ($11.50/sq ft is from a 2014 form).

## Output

A table: `Item | docs value | primary source checked | result | new label | date`.

## Guardrails

- A secondary blog is not a primary source.
- Never state a legal requirement you could not trace to a law, rule, or agency page. Flag it for counsel instead.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A06 `entity-tax-bookkeeping-specialist` — Entity, Tax & Bookkeeping Specialist
- A09 `permitting-zoning-expediter` — Permitting & Zoning Expediter
- A10 `environmental-utility-compliance-specialist` — Environmental & Utility Compliance Specialist
- A12 `food-safety-licensing-specialist` — Food Safety & Licensing Compliance Specialist
- A13 `employment-law-hr-compliance-specialist` — Employment Law & HR Compliance Specialist
- A14 `risk-insurance-hurricane-manager` — Risk, Insurance & Hurricane Preparedness Manager
