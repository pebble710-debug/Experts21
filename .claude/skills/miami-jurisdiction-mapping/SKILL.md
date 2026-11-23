---
name: miami-jurisdiction-mapping
description: Work out which municipality's and agency's rules apply at a specific Miami-Dade address (City of Miami, Miami Beach, Coral Gables, Doral, another city, or unincorporated county).
when_to_use: Use whenever a question involves zoning, Certificate of Use, business tax receipts, sidewalk cafés, signs, building permits, or local taxes for a specific site or neighborhood.
metadata:
  id: S03
  project: Experts21
  used_by:
  - entity-tax-bookkeeping-specialist
  - site-selection-real-estate-specialist
  - lease-negotiation-specialist
  - permitting-zoning-expediter
  - environmental-utility-compliance-specialist
  - food-safety-licensing-specialist
---

# Miami-Dade jurisdiction mapping (S03)

Shared skill for the Experts21 Miami specialty coffee shop team. Defined in `docs/expert-roster.md` as: Work out which rules apply at a given address: City of Miami, Miami Beach, Coral Gables, Doral, another municipality, or unincorporated county.

## When to use

Use whenever a question involves zoning, Certificate of Use, business tax receipts, sidewalk cafés, signs, building permits, or local taxes for a specific site or neighborhood.

## Procedure

1. Get the exact address (or at least the neighborhood). Note that Wynwood, Brickell, Downtown, Edgewater, Little Havana, Coconut Grove, and Little Haiti are in the City of Miami, while Miami Beach, Coral Gables, and Doral are separate cities. [ESTIMATE] Confirm with the county property search.
2. List which level owns each requirement: state (DBPR, DOR, Sunbiz), county (DERM, WASD, impact fees, county BTR, Tax Collector), municipality (zoning, CU, building, fire, city BTR, sidewalk café, signs).
3. Inside a municipality, the business needs **both** a city and a county BTR. [CONFIRMED]
4. If the site is not in the City of Miami, say clearly that the docs/ checklist is based on the City of Miami and the other city's rules must be researched.
5. Hand the result to the permitting, environmental, and tax experts.

## Reference facts (from docs/, research date 2026-11-23)

- Miami-Dade has 34 municipalities (docs/06). Each has its own zoning, CU, sidewalk-café, and business-tax rules.
- City of Miami eStart guide: https://miami.gov/estart/Guide-to-Opening-a-Business-with-eStart
- Miami-Dade Tax Collector BTR: https://www.mdctaxcollector.gov/services/local-business-tax-receipt

## Output

A table: `Requirement | Level (state/county/city) | Agency | Applies at this address? | Source`.

## Guardrails

- Do not apply City of Miami rules to Miami Beach, Coral Gables, or other cities.
- Treat an uncertain municipality as an open question.
- Keep every evidence label ([CONFIRMED] / [REPORTED] / [ESTIMATE] / [UNVERIFIED]) and cite the docs/ file or source URL.
- If the research does not cover something, say so. Do not invent requirements, costs, or business facts.

## Used by

- A06 `entity-tax-bookkeeping-specialist` — Entity, Tax & Bookkeeping Specialist
- A07 `site-selection-real-estate-specialist` — Site Selection & Commercial Real Estate Specialist
- A08 `lease-negotiation-specialist` — Lease Negotiation Specialist
- A09 `permitting-zoning-expediter` — Permitting & Zoning Expediter
- A10 `environmental-utility-compliance-specialist` — Environmental & Utility Compliance Specialist
- A12 `food-safety-licensing-specialist` — Food Safety & Licensing Compliance Specialist
