# Orchestrator Routing Test Results

- **Run date:** 2026-11-24
- **What was tested:** each prompt was sent to `orchestrator` **without naming any experts**. The four guide examples come from `docs/how-to-talk-to-your-experts.md` with their "Experts to involve" and "Order" lines removed. A fifth prompt describes a staffing problem without the word "barista".
- **How:** `python3 scripts/live_routing_test.py` (Claude Code CLI, `--agent orchestrator`). "Experts called" lists the specialist subagents the orchestrator actually launched, with the model each one actually ran on (checked against its `model:` field).
- **Pass rule:** at least one expert from every required group was called, and the answer shows a routing decision, a combined recommendation, disagreements, and evidence labels.

| Case | Result | Experts called | Required groups missing |
|---|---|---|---|
| Evaluating a commercial lease before signing | PASS | 7: `site-selection-real-estate-specialist` (sonnet), `permitting-zoning-expediter` (opus), `environmental-utility-compliance-specialist` (opus), `design-buildout-project-manager` (sonnet), `financial-modeling-funding-strategist` (opus), `risk-insurance-hurricane-manager` (opus), `lease-negotiation-specialist` (opus) | none |
| Startup budget and break-even plan | PASS | 5: `financial-modeling-funding-strategist` (opus), `design-buildout-project-manager` (sonnet), `lease-negotiation-specialist` (opus), `environmental-utility-compliance-specialist` (opus), `launch-program-director` (opus) | none |
| Grand opening and marketing strategy | PASS | 6: `marketing-pr-launch-manager` (sonnet), `social-media-community-manager` (haiku), `launch-program-director` (opus), `cafe-operations-manager` (sonnet), `technology-pos-data-specialist` (sonnet), `head-of-coffee-beverage-program` (sonnet) | none |
| Rising costs, staffing shortage, inventory waste, declining sales | PASS | 8: `cafe-operations-manager` (sonnet), `talent-acquisition-training-manager` (sonnet), `employment-law-hr-compliance-specialist` (opus), `food-program-purchasing-manager` (sonnet), `financial-modeling-funding-strategist` (opus), `technology-pos-data-specialist` (sonnet), `marketing-pr-launch-manager` (sonnet), `customer-experience-service-design-lead` (sonnet) | none |
| Staffing problem in different words (no 'barista') | PASS | 5: `talent-acquisition-training-manager` (sonnet), `cafe-operations-manager` (sonnet), `employment-law-hr-compliance-specialist` (opus), `financial-modeling-funding-strategist` (opus), `customer-experience-service-design-lead` (sonnet) | none |

**5/5 cases passed.**

## Evaluating a commercial lease before signing

**Prompt (no experts named):**

```text
Question: Should we sign this lease, and if not, what should we counter-offer?
Our situation: 1,400 sq ft second-generation space in Brickell (it was a juice bar, so there may be a grease trap). The landlord's LOI asks $78/sq ft NNN, a 10-year term, a full personal guarantee, rent starting 90 days after signing, and no tenant improvement allowance. We expect about $850,000 in yearly sales once we're established.
What I want back: one combined recommendation (sign / counter / walk away), the counter-offer terms, where the experts disagree, the key numbers with evidence labels, and next steps with an owner for each.
```

**Checks:**

- PASS: required experts selected
- PASS: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error
- PASS: experts ran on their assigned models

**Required groups (at least one from each):**

- `site-selection-real-estate-specialist`
- `lease-negotiation-specialist`
- `financial-modeling-funding-strategist`
- `environmental-utility-compliance-specialist`
- `permitting-zoning-expediter`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> I'm Ava, the Orchestrator. My knowledge folder (`knowledge/orchestrator/`) has only its README, so this answer uses the shared research in `docs/` (dated 2026-11-23). As you asked, each expert stayed under 200 words and used no web lookups.
>
> | Business problem | Experts | Why |
> |---|---|---|
> | Is the rent affordable for $850k in sales? | `financial-modeling-funding-strategist` (Raymond), `site-selection-real-estate-specialist` (Andrés) | Checks the 10–12% occupancy rule and break-even, and compares the rent with the Brickell market |
> | Can a café legally open here, and when? *(implied)* | `permitting-zoning-expediter` (Teresa) | Zoning and Certificate of Use must be checked before signing, and the timeline decides when rent should start |
> | Is there a working grease trap? What will utility fees cost? *(implied)* | `environmental-utility-compliance-specialist` (Hector) | A former juice bar "may" have a trap. That uncertainty is a $0–$35k swing |
> | No improvement money and rent starting at 90 days *(implied)* | `design-buildout-project-manager` (Nadia) | Build-out cost and timeline set how much improvement money and free rent to ask for |
> | Flood risk and the lease's storm and insurance clauses *(implied)* | `risk-insurance-hurricane-manager` (Walter) | Damage and insurance clauses matter for 10 years in Brickell |
> | Writing the counter-offer | `lease-negotiation-specialist` (Marcus) | Briefed last, with all the findings above |
>
> **Left out on purpose:**
> - `market-customer-insights-analyst` and `competitive-intelligence-analyst`: I accepted your $850k estimate for now, but it's flagged in the open questions below.
> - `food-safety-licensing-specialist`: the juice bar's food-licence history is listed as a check instead.
> - `launch-program-director`: one leas

## Startup budget and break-even plan

**Prompt (no experts named):**

```text
Question: Build our startup budget and break-even plan, and tell us how much to borrow.
Our situation: 1,200 sq ft seated café, about 30 seats, in Coral Gables. Rent around $65/sq ft NNN. Espresso-forward menu with pastries (no kitchen hood). We have $300,000 of our own money and want to open in about 12 months.
What I want back: one combined budget with low/high cases and a contingency, the funding gap and loan options, monthly break-even (customers per day), where the experts disagree, and next steps with owners.
```

**Checks:**

- PASS: required experts selected
- PASS: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error
- PASS: experts ran on their assigned models

**Required groups (at least one from each):**

- `financial-modeling-funding-strategist`
- `design-buildout-project-manager`
- `entity-tax-bookkeeping-specialist` or `environmental-utility-compliance-specialist` or `head-of-coffee-beverage-program` or `launch-program-director` or `marketing-pr-launch-manager` or `risk-insurance-hurricane-manager` or `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> I'm Ava, the Orchestrator. My knowledge folder has only its README, so this answer uses the shared research in `docs/` (dated 2026-11-23). As you asked for this test run, every expert worked from `docs/` only, with no web lookups.
>
> | Business problem | Experts and why |
> |---|---|
> | How much it costs to open, how much to borrow, and break-even | `financial-modeling-funding-strategist` (Raymond): leads the budget, loan sizing and break-even |
> | Build-out and equipment, the biggest cost swing | `design-buildout-project-manager` (Nadia): cost ranges and contingency |
> | Rent at $65 NNN: deposit, total rent cost, and terms that save cash | `lease-negotiation-specialist` (Marcus) |
> | Grease trap, water and sewer connection, and impact fees (a hidden cost) | `environmental-utility-compliance-specialist` (Hector) |
> | 12-month timeline, rent paid before opening, and when the loan must close | `launch-program-director` (Elena) |
> | **Left out on purpose** | `permitting-zoning-expediter`: the research doesn't cover Coral Gables permit rules, so this becomes a next step. `entity-tax-bookkeeping-specialist`, `risk-insurance-hurricane-manager`, `head-of-coffee-beverage-program`: their lines are small or already in the `docs/04` model. `market-customer-insights-analyst`: needed next, to test whether the sales assumptions are realistic. |

## Grand opening and marketing strategy

**Prompt (no experts named):**

```text
Question: Plan our grand opening and the first 90 days of marketing.
Our situation: Our Wynwood café opens in 10 weeks (early December, close to Art Basel week). Marketing budget is $15,000. We want local residents, nearby office workers, and visitors. Our idea is "Miami-made specialty": specialty versions of Cuban drinks plus a strong iced menu. We have Instagram but almost no followers.
What I want back: one combined week-by-week launch plan, the opening-day promotion, a budget split, how we'll measure results, where the experts disagree, and next steps with owners.
```

**Checks:**

- PASS: required experts selected
- PASS: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error
- PASS: experts ran on their assigned models

**Required groups (at least one from each):**

- `marketing-pr-launch-manager`
- `social-media-community-manager`
- `food-safety-licensing-specialist` or `launch-program-director`
- `cafe-operations-manager` or `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Problem identified | Experts chosen | Why |
> |---|---|---|
> | Launch marketing plan, promotion, and $15k budget | `marketing-pr-launch-manager` (Valentina) | Owns the launch countdown, press, promotion design, and budget |
> | Starting from almost no Instagram followers; local discovery | `social-media-community-manager` (Gabriel) | Instagram/TikTok, Google and Apple Maps, creators, reviews |
> | Opening date must not get ahead of licences and inspections (implied) | `launch-program-director` (Elena) | Go/no-go gates; risk of the date slipping |
> | Handling the opening-day and Art Week rush (implied) | `cafe-operations-manager` (Luis) | Staffing, limits on the promotion, labor and COGS control |
> | "How we'll measure results" | `technology-pos-data-specialist` (Kevin) | Promo codes, tracking which channel works, a 90-day dashboard |
> | What we promote and photograph | `head-of-coffee-beverage-program` (Mateo) | Hero drinks, which drinks are fast enough for the promo, roaster tie-in |
>
> **Left out on purpose:**
> - **Finance (Raymond):** the budget is already set. Checking promo cost goes into Next steps.
> - **Concept/brand (Camila):** the concept is already defined.
> - **Customer experience (Sofia):** Luis and Gabriel cover rush service and reviews.
> - **Food safety (Patricia) and permitting (Teresa):** Elena's gates cover them at planning level. Their checks are in Open questions.
> - **Insurance (Walter):** crowd safety is passed to him as a next step.
> - **Coffee sourcing (Lucía):** the roaster deal is a next step.
> - **Competitive intelligence and market insights:** they wouldn't change this plan.

## Rising costs, staffing shortage, inventory waste, declining sales

**Prompt (no experts named):**

```text
Question: What should we do in the next 30 days to cut costs, fix staffing and inventory, and bring sales back?
Our situation: It's July at our Brickell café. Sales are down 22% from spring. Milk and cup costs went up. Two of our six baristas quit last month. We throw away pastries every day. Labor is 38% of sales (our target is about 30%).
What I want back: one combined 30-day action plan in priority order, what each fix saves or earns, where the experts disagree, and next steps with an owner for each.
```

**Checks:**

- PASS: required experts selected
- PASS: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error
- PASS: experts ran on their assigned models

**Required groups (at least one from each):**

- `cafe-operations-manager`
- `talent-acquisition-training-manager`
- `employment-law-hr-compliance-specialist`
- `food-program-purchasing-manager`
- `coffee-sourcing-roaster-partnership-specialist` or `financial-modeling-funding-strategist`
- `customer-experience-service-design-lead` or `marketing-pr-launch-manager` or `social-media-community-manager` or `technology-pos-data-specialist`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> Ava, Orchestrator. No additional documents have been provided in `knowledge/orchestrator/`; this answer uses the shared research in `docs/` (research date 2026-11-23). Per your test-run rules, there were no web lookups and each brief and answer was kept short.
>
> | Problem identified | Experts consulted | Why |
> |---|---|---|
> | Labor too high (38% of sales against a 30% target) | `cafe-operations-manager` (Luis), `financial-modeling-funding-strategist` (Raymond) | Building the schedule from hourly sales, and the dollar value of each fix |
> | Two baristas quit (staff turnover) | `talent-acquisition-training-manager` (Jasmine), `employment-law-hr-compliance-specialist` (Jonathan) | Whether to backfill, how to keep the four who remain, and the wage-and-hour risk of cutting hours or adding overtime |
> | Milk and cup costs went up; pastries thrown out daily | `food-program-purchasing-manager` (Rosa) | Par levels, re-bidding vendors, and the cost-of-goods impact |
> | Sales down 22% | `technology-pos-data-specialist` (Kevin), `marketing-pr-launch-manager` (Valentina) | Working out whether the drop is seasonal, lost regulars, or smaller tickets, plus low-cost ways to win sales back |
> | Risk that cuts hurt service (not stated, but implied) | `customer-experience-service-design-lead` (Sofia) | Sets a floor so cost cuts don't lose more regulars |
> | Summer cash and hurricane season (implied) | Covered by Raymond | Not worth a separate risk brief for a 30-day plan |
>
> **Left out on purpose:**
> - `head-of-coffee-beverage-program`: menu and cup-size cuts are given to them as a handoff.
> - `social-media-community-manager`: their part runs through Valentina's plan.
> - `competitive-intelligence-analyst`: no sign that a competitor caused the drop.
> - `risk-insurance-hurricane-manag

## Staffing problem in different words (no 'barista')

**Prompt (no experts named):**

```text
We run a small café in Little Havana. Employee turnover is brutal: three people left this quarter, we're constantly short-staffed on weekends, and our hiring problems mean almost nobody decent applies. What should we do?
```

**Checks:**

- PASS: required experts selected
- PASS: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error
- PASS: experts ran on their assigned models

**Required groups (at least one from each):**

- `cafe-operations-manager`
- `employment-law-hr-compliance-specialist`
- `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Problem | Experts | Why |
> |---|---|---|
> | People are quitting and good applicants are scarce | `talent-acquisition-training-manager` (Jasmine) | Pay range, job posts, where to recruit, training path |
> | Weekends are short-staffed | `cafe-operations-manager` (Luis) | Weekend schedule, minimum staffing, labor-hours budget |
> | Implied: pay raises, weekend premiums, overtime, hiring paperwork | `employment-law-hr-compliance-specialist` (Jonathan) | The likely fixes raise wage, tip, I-9 and immigration-status (TPS) questions |
> | Implied: what a raise costs | `financial-modeling-funding-strategist` (Raymond) | Whether the café can afford to pay more |
> | Implied: weekend service and reviews are slipping | `customer-experience-service-design-lead` (Sofia) | Protect guests and reviews while the team is thin |
>
> **Left out on purpose:**
> - `head-of-coffee-beverage-program` and `technology-pos-data-specialist`: a shorter weekend menu and scheduling from sales data come up below as next steps, but their input wouldn't change today's recommendation.
> - Marketing and growth experts: not relevant to this problem.
