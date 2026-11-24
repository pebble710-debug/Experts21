# Orchestrator Routing Test Results

- **Run date:** 2026-11-24
- **What was tested:** each prompt was sent to `orchestrator` **without naming any experts**. The four guide examples come from `docs/how-to-talk-to-your-experts.md` with their "Experts to involve" and "Order" lines removed. A fifth prompt describes a staffing problem without the word "barista".
- **How:** `python3 scripts/live_routing_test.py` (Claude Code CLI, `--agent orchestrator`). "Experts called" lists the specialist subagents the orchestrator actually launched.
- **Pass rule:** at least one expert from every required group was called, and the answer shows a routing decision, a combined recommendation, disagreements, and evidence labels.

| Case | Result | Experts called | Required groups missing |
|---|---|---|---|
| Evaluating a commercial lease before signing | PASS | 6: `lease-negotiation-specialist`, `financial-modeling-funding-strategist`, `site-selection-real-estate-specialist`, `environmental-utility-compliance-specialist`, `permitting-zoning-expediter`, `design-buildout-project-manager` | none |
| Startup budget and break-even plan | PASS | 5: `financial-modeling-funding-strategist`, `design-buildout-project-manager`, `environmental-utility-compliance-specialist`, `lease-negotiation-specialist`, `launch-program-director` | none |
| Grand opening and marketing strategy | PASS | 7: `marketing-pr-launch-manager`, `social-media-community-manager`, `launch-program-director`, `cafe-operations-manager`, `head-of-coffee-beverage-program`, `technology-pos-data-specialist`, `financial-modeling-funding-strategist` | none |
| Rising costs, staffing shortage, inventory waste, declining sales | PASS | 9: `cafe-operations-manager`, `employment-law-hr-compliance-specialist`, `talent-acquisition-training-manager`, `food-program-purchasing-manager`, `financial-modeling-funding-strategist`, `head-of-coffee-beverage-program`, `technology-pos-data-specialist`, `marketing-pr-launch-manager`, `customer-experience-service-design-lead` | none |
| Staffing problem in different words (no 'barista') | PASS | 4: `talent-acquisition-training-manager`, `cafe-operations-manager`, `employment-law-hr-compliance-specialist`, `financial-modeling-funding-strategist` | none |

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

**Required groups (at least one from each):**

- `site-selection-real-estate-specialist`
- `lease-negotiation-specialist`
- `financial-modeling-funding-strategist`
- `environmental-utility-compliance-specialist`
- `permitting-zoning-expediter`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Problem identified | Experts chosen | Why |
> |---|---|---|
> | Is the rent affordable for this business? | `financial-modeling-funding-strategist` | Rent as a share of sales, the rent we can afford, cash at risk before opening, and a lower-sales case |
> | Is the LOI fair, and what do we counter? | `lease-negotiation-specialist` | Builds the counter term sheet and separates must-haves from items we can trade |
> | Is this a good site at this price? | `site-selection-real-estate-specialist` | Compares the rent to Brickell market data, tests the $850k sales estimate, and sets the walk-away signal |
> | Implied: does the "maybe" grease trap pass? | `environmental-utility-compliance-specialist` | Miami-Dade DERM grease permit (GDO), the existing trap, water/sewer charges and impact fees: the biggest unknown costs |
> | Implied: can we get permits, and is 90 days enough? | `permitting-zoning-expediter` | Zoning, Certificate of Use, DBPR food-licence history, and the permit contingency clause |
> | Implied: no TI allowance, so who pays for the build-out? | `design-buildout-project-manager` | Build-out cost and time, the TI amount to ask for, and what to check on a walkthrough |
>
> **Left out on purpose:** `risk-insurance-hurricane-manager` (flood zone is listed as an open question below), `market-customer-insights-analyst` (checking demand is a next step, not needed for this decision), `food-safety-licensing-specialist` (the permitting expert covered DBPR history), `entity-tax-bookkeeping-specialist` and `launch-program-director` (they wouldn't change the decision).
>
> *Test-run limits: each brief and answer was kept short, and only `docs/` research was used, with no web lookups.*
>
> ---

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

**Required groups (at least one from each):**

- `financial-modeling-funding-strategist`
- `design-buildout-project-manager`
- `entity-tax-bookkeeping-specialist` or `environmental-utility-compliance-specialist` or `head-of-coffee-beverage-program` or `launch-program-director` or `marketing-pr-launch-manager` or `risk-insurance-hurricane-manager` or `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Business problem | Experts consulted | Why |
> |---|---|---|
> | Startup budget, funding gap, how much to borrow, break-even | `financial-modeling-funding-strategist` | Owns the budget, the loan size and the break-even model. |
> | Build-out and equipment costs (the biggest swing) | `design-buildout-project-manager` | Low and high costs for design, construction and equipment, the contingency, and what can be leased. |
> | Grease trap and water/sewer fees (the biggest unknown cost) | `environmental-utility-compliance-specialist` | How much to budget for the DERM grease trap and the water-department connection and impact fees. |
> | Rent and lease terms that change how much cash you need | `lease-negotiation-specialist` | Total rent, the deposit, free rent and the landlord's build-out allowance. |
> | 12-month opening, rent paid during delays, when to get the loan | `launch-program-director` | Timeline, a reserve for delays, the order of funding steps, and a go/no-go check. |
>
> Deliberately left out for this test run:
> - **Site selection** (is the space already a café?), **permitting**, **tax and loan structure**, **insurance**, **head of coffee** (equipment spec) and **marketing.** The research's budget lines for these are carried as is, and these experts are named as owners in the next steps.
> - **Gap:** the research covers City of Miami permit rules, not Coral Gables. Permitting is the first next step.

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

**Required groups (at least one from each):**

- `marketing-pr-launch-manager`
- `social-media-community-manager`
- `food-safety-licensing-specialist` or `launch-program-director`
- `cafe-operations-manager` or `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Business problem | Experts | Why |
> |---|---|---|
> | Launch plan, opening promotion, PR calendar | `marketing-pr-launch-manager` | Owns the launch countdown and promotions |
> | Growing Instagram from zero, Google/Apple Maps, reviews, local creators | `social-media-community-manager` | The account has almost no followers |
> | Choosing the opening date when inspections or licences could slip | `launch-program-director` | You can't promote an opening before the café has its final inspection, occupancy certificate and licences |
> | Handling the opening and Art Basel crowds | `cafe-operations-manager` | Required for any opening-day plan; also sets limits on giveaways |
> | Which drinks to feature, and a smaller menu for the rush | `head-of-coffee-beverage-program` | Your concept is built on the drinks |
> | Measuring results (POS discount buttons, loyalty sign-up, codes) | `technology-pos-data-specialist` | You asked how results will be measured |
> | Is $15k enough, how to split it, how much free product you can afford | `financial-modeling-funding-strategist` | Checks the money side |
>
> **Left out on purpose:**
> - `concept-brand-strategist`: the concept is already set.
> - `talent-acquisition-training-manager`: operations covered rush staffing. It's listed as a handoff for hiring.
> - `food-safety-licensing-specialist` and `permitting-zoning-expediter`: their licences and inspections are covered as opening checkpoints by the Launch Director. They own those tasks in the next steps.
> - `customer-experience-service-design-lead`: it's a later handoff for review themes.
> - `competitive-intelligence-analyst`: optional.

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
> | Problem I found | Experts consulted | Why |
> |---|---|---|
> | Labor at 38% of sales | `cafe-operations-manager`, `financial-modeling-funding-strategist` | Matching schedules to sales by hour, and showing what each fix is worth in dollars |
> | Two baristas quit (turnover) | `talent-acquisition-training-manager`, `employment-law-hr-compliance-specialist` | Whether to replace both now, and the overtime and wage rules once 4 people cover 6 people's shifts (cutting hours raises legal issues even though you didn't ask about them) |
> | Milk and cups cost more | `food-program-purchasing-manager`, `head-of-coffee-beverage-program` | Rebidding vendors and cutting cup sizes, plus drink costs, price increases and a simpler menu |
> | Pastries thrown away daily | `food-program-purchasing-manager`, `cafe-operations-manager`, `technology-pos-data-specialist` | Daily order levels, a waste routine, and the POS sales data to set them |
> | Sales down 22% (summer slump) | `technology-pos-data-specialist`, `marketing-pr-launch-manager`, `customer-experience-service-design-lead` | Finding out whether fewer people are coming or each spends less, cheap promotions for locals, and whether slow service is driving regulars away |
> | Cash through hurricane season (you didn't raise this, but it's July) | `financial-modeling-funding-strategist` | How much cash to hold in reserve |
>
> **Left out on purpose:** coffee-sourcing (you didn't mention bean costs); social-media (marketing covers it, and they own replying to reviews); risk-insurance (cash reserve covered here, and they still need to confirm your hurricane deductible); food-safety (only needed for the pastry-donation question, listed under open questions); site and lease (rent can't change within 30 days); competitive-intel and entity

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

**Required groups (at least one from each):**

- `cafe-operations-manager`
- `employment-law-hr-compliance-specialist`
- `talent-acquisition-training-manager`

**Orchestrator's routing decision (excerpt):**

> Routing decision
>
> | Problem identified | Experts chosen | Why |
> |---|---|---|
> | Few good applicants, and people keep leaving | `talent-acquisition-training-manager` | Owns pay positioning, hiring channels, onboarding and keeping staff |
> | Weekends are always short-staffed | `cafe-operations-manager` | Owns scheduling, cross-training, bench staff and the labor % target |
> | Implied: pay raises, weekend premiums, tips, overtime on cover shifts, TPS and I-9 | `employment-law-hr-compliance-specialist` | Every likely fix changes pay or hiring, so it has to stay legal |
> | Implied: can you afford to pay more? | `financial-modeling-funding-strategist` | Compares the cost of losing people with the cost of a raise |
>
> **Left out on purpose:** `customer-experience-service-design-lead`, because you didn't mention service complaints. `technology-pos-data-specialist`, because operations covered sales-per-hour scheduling. Marketing, site and permit experts aren't relevant here. Test-run limits were followed: short briefs, docs/ only, no web lookups.
