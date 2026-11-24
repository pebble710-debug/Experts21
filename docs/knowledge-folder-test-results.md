# Knowledge Folder & Persona Test Results

- **Run date:** 2026-11-24
- **How:** `python3 scripts/live_knowledge_test.py` runs each agent directly (`claude -p --agent <name>`).
- **Case 1:** the agent's folder contains only `README.md`. Expect the agent to use `docs/` and say no additional documents were provided.
- **Case 2:** a temporary, clearly marked TEST LOI is placed in the folder. Expect the agent to read it and cite it. The file is deleted after the run.
- **Case 3:** the owner's committed `sample-brickell-lease.md` is in the folder. The question does **not** give the file name or location. Expect the agent to find it by checking its folder, read it, and cite it along with `docs/` research.

| Case | Agent | Result | Model actually used |
|---|---|---|---|
| readme-only-folder | `competitive-intelligence-analyst` (Diego) | PASS | claude-haiku-5-5 |
| folder-with-document | `lease-negotiation-specialist` (Marcus) | PASS | claude-opus-5-5 |
| finds-committed-document | `lease-negotiation-specialist` (Marcus) | PASS | claude-opus-5-5 |

**3/3 cases passed.**

## readme-only-folder

**Checks:**

- PASS: agent opened its knowledge folder
- PASS: read the expected document
- PASS: introduces itself by first name
- PASS: expected content present
- PASS: ran on assigned model (haiku)
- PASS: evidence labels used

**Answer (first 1,500 characters):**

> Diego, Competitive Intelligence Analyst. No additional documents have been provided in `knowledge/competitive-intelligence-analyst/`; this answer uses the shared research in `docs/`.
>
> **Answer:** Watch four groups. The Brickell local cafés are the closest direct rivals. The incoming specialty chains and Starbucks/Dunkin' matter for convenience and traffic, and ventanitas set the price anchor.
>
> **Watch list (docs/03-competitors.md):**
> - **Local specialty:** Ludlow Coffee Supply (second site planned at Domus Brickell Park) [REPORTED]; Crema Gourmet (Brickell West, Dec 2025) [REPORTED]; Pasion del Cielo (Brickell) [REPORTED]; Panther Coffee and Per'La (also possible suppliers) [REPORTED].
> - **Incoming chains:** Black Sheep (Coconut Grove, Aug 2025) [REPORTED]; The Coffee (Wynwood, Dec 2025) [REPORTED]; 7 Brew (entry unconfirmed) [UNVERIFIED].
> - **Mass chains:** Starbucks and Dunkin' locations were not counted in the research. Map them within 0.5 mile [UNVERIFIED].
> - **Ventanitas:** average colada about $2.06 in 2022 [UNVERIFIED for current prices].
>
> **Recheck:** Every item above is older than three months, and Ludlow's spring 2026 date has already passed. Verify before acting.
>
> **Handoffs:** `site-selection-real-estate-specialist` (density near the site); `concept-brand-strategist` (the gap in specialty Cuban-style drinks).

## folder-with-document

**Checks:**

- PASS: agent opened its knowledge folder
- PASS: read the expected document
- PASS: introduces itself by first name
- PASS: expected content present
- PASS: ran on assigned model (opus)
- PASS: evidence labels used

**Answer (first 1,500 characters):**

> Marcus, Lease Negotiation Specialist.
>
> **Answer:** No, don't sign it as written. The LOI is `TEST-2026-11-24-sample-loi-coral-way.md`, a test draft dated 2026-11-24 [UNVERIFIED]. As written, every protective term in it is red. (`sample-brickell-lease.md` in the same folder is a separate fictional lease offer, not this LOI.)
>
> **Details**
>
> | Term | LOI | Rating |
> |---|---|---|
> | Rent | $58 base + $21 NNN = $79/sq ft all-in on 1,100 sq ft, so about $86,900/yr [ESTIMATE, my calculation] | Amber |
> | Term | 7 years | Amber |
> | TI allowance / free rent | $0 / none | Red |
> | Personal guarantee | Unlimited, for the full term | Red |
> | Permit contingency | None | Red |
>
> At 10–12% occupancy, $86,900/yr needs about **$724k–$869k in yearly sales** [ESTIMATE].
>
> **Top three changes to ask for:**
> 1. **Permit contingency.** Add a right to terminate and get the deposit back if zoning, permits, or the Certificate of Use aren't approved within an agreed window. Rent should start only once permits are issued. I won't recommend signing without this.
> 2. **Personal guarantee.** Cap it at 6–12 months of rent and have it burn off after 24 months with no default.
> 3. **Build-out money.** Ask for TI allowance plus 3–6 months of free rent during build-out, and a 5% yearly cap on controllable CAM. My walk-away point is an all-in cost above 12% of realistic sales.
>
> **Assumptions & open questions:** The NNN figure is the landlord's estimate. Rent escalations, renewal options, the use clause, and the café's e

## finds-committed-document

**Checks:**

- PASS: agent opened its knowledge folder
- PASS: read the expected document
- PASS: introduces itself by first name
- PASS: expected content present
- PASS: ran on assigned model (opus)
- PASS: evidence labels used

**Answer (first 1,500 characters):**

> Marcus, Lease Negotiation Specialist. Don't sign this as written. The file in my folder, `sample-brickell-lease.md`, is labeled fictional and for testing only, so I treat its terms as [UNVERIFIED].
>
> **Top three risks**
>
> 1. **🔴 Opening deadline and permit risk.** The offer requires opening within 120 days. There's no grease trap, and "permitted use" depends on landlord approval and permits. Our research budgets 9–15 months to open [ESTIMATE] (`09-risks.md`). That makes a default before opening likely. **Ask:** a permit contingency, a rent start date tied to the Certificate of Use, and the landlord paying for the grease trap or a written confirmation of what's required.
> 2. **🔴 Rent is too high for likely sales.** Base rent of $78/sq ft on 1,200 sq ft is $93,600 a year. NNN adds about $15–$30/sq ft [ESTIMATE], for about $111.6k–$129.6k all-in. Our 10–12% occupancy rule [ESTIMATE] means you'd need roughly $930k–$1.3M a year in sales, with 3% increases on top. **Ask:** lower base rent, a cap on CAM increases, audit rights, and free rent during build-out.
> 3. **🔴 Full personal guarantee and no exit.** You'd be personally liable for the whole term, with no early termination and a $0 TI allowance. **Ask:** a guarantee capped at 6–12 months of rent that burns off after 24 months, an exit or assignment right, and some TI or free rent.
>
> **Walk away** if the landlord refuses a permit contingency.
>
> **Handoffs:** the permit timeline and grease trap go to `permitting-zoning-expediter`. The r
