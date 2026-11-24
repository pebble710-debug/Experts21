# Knowledge Folder & Persona Test Results

- **Run date:** 2026-11-24
- **How:** `python3 scripts/live_knowledge_test.py` runs each agent directly (`claude -p --agent <name>`).
- **Case 1:** the agent's folder contains only `README.md`. Expect the agent to use `docs/` and say no additional documents were provided.
- **Case 2:** a temporary, clearly marked TEST LOI is placed in the folder. Expect the agent to read it and cite it. The file is deleted after the run.

| Case | Agent | Result | Model actually used |
|---|---|---|---|
| readme-only-folder | `competitive-intelligence-analyst` (Diego) | PASS | claude-haiku-5-5 |
| folder-with-document | `lease-negotiation-specialist` (Marcus) | PASS | claude-opus-5-5 |

**2/2 cases passed.**

## readme-only-folder

**Checks:**

- PASS: agent opened its knowledge folder
- PASS: introduces itself by first name
- PASS: expected content present
- PASS: ran on assigned model (haiku)
- PASS: evidence labels used

**Answer (first 1,500 characters):**

> Diego, Competitive Intelligence Analyst. No additional documents have been provided in `knowledge/competitive-intelligence-analyst/`; this answer uses the shared research in `docs/` only (research date 2026-11-23).
>
> **Answer:** Watch four groups: Brickell-area specialty cafés (the direct rivals), Latin-style specialty brands, incoming chains, and mass chains plus ventanitas for price.
>
> - **Direct specialty:** Pasion del Cielo (Brickell listed) [REPORTED]; Crema Gourmet, Brickell West, opened Dec 2025 [REPORTED]; Ludlow, second site at Domus Brickell Park, planned spring 2026 [REPORTED]
> - **Latin-style specialty:** Cortadito, fourth location announced Downtown [REPORTED]
> - **Incoming chains:** Black Sheep and The Coffee have no reported Brickell site [REPORTED]; watch for entry
> - **Mass chains:** Starbucks and Dunkin' locations were not counted in the research [Not covered]; map within 0.5 mile
> - **Price anchor:** ventanita colada averaged about $2.06 in 2022 [UNVERIFIED for current prices]
>
> **Open questions:** Verify each Brickell café's status and address on Google Maps, since openings often slip. Map Starbucks and Dunkin' counts. 7 Brew has no announced sites [UNVERIFIED].
>
> **Handoffs:** `site-selection-real-estate-specialist` (competitor density within 0.5 mile can change a site score); `head-of-coffee-beverage-program` (if competitor prices affect the menu).
>
> **Evidence:**
> - Brickell cafés and Cortadito — [REPORTED] — docs/03-competitors.md
> - Black Sheep, The Coffee — [RE

## folder-with-document

**Checks:**

- PASS: agent opened its knowledge folder
- PASS: introduces itself by first name
- PASS: expected content present
- PASS: ran on assigned model (opus)
- PASS: evidence labels used

**Answer (first 1,500 characters):**

> Marcus, Lease Negotiation Specialist.
>
> **Answer:** Don't sign it as written. I reviewed `TEST-2026-11-24-sample-loi-coral-way.md`, and it's marked as a sample draft, not a real offer, so its terms are [UNVERIFIED]. It has no permit contingency, an unlimited personal guarantee for the full 7 years, and no TI allowance or free rent. Rent and NNN alone would be about 15% of conservative sales, which is above our 10–12% target.
>
> **Details**
>
> | Term | LOI | Rating |
> |---|---|---|
> | Rent + NNN | $58 + $21 = $79/sq ft × 1,100 sq ft ≈ $86.9k/yr [ESTIMATE] | Red: needs $724k–$869k sales to stay at 10–12%. Conservative sales are $583k, so it's ~14.9%. |
> | Permit contingency | None | Red |
> | Personal guarantee | Unlimited, full term | Red |
> | TI allowance / free rent | $0 / none | Amber |
>
> **Top three asks (my recommendation):**
> 1. **Permit contingency.** We can cancel and get our deposit back if zoning, the Certificate of Use or building permits aren't approved by an agreed date.
> 2. **Limit the personal guarantee.** Cap it at 6–12 months of rent and have it end after 24 months with no default.
> 3. **Lower the cost.** Ask for a TI allowance, free rent during build-out plus 3 months, and a cap on yearly CAM increases with audit rights. **I'd walk away if rent plus NNN can't get to about 12% of conservative sales.**
>
> **Open questions:** These are real terms if the LOI is real. A licensed Florida attorney must review before signing.
>
> **Handoffs:**
> - `financial-modeling-funding-strategist`: 
