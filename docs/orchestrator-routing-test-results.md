# Orchestrator Routing Test Results

- **Run date:** 2026-11-24
- **What was tested:** each prompt was sent to `orchestrator` **without naming any experts**. The four guide examples come from `docs/how-to-talk-to-your-experts.md` with their "Experts to involve" and "Order" lines removed. A fifth prompt describes a staffing problem without the word "barista".
- **How:** `python3 scripts/live_routing_test.py` (Claude Code CLI, `--agent orchestrator`). "Experts called" lists the specialist subagents the orchestrator actually launched.
- **Pass rule:** at least one expert from every required group was called, and the answer shows a routing decision, a combined recommendation, disagreements, and evidence labels.

| Case | Result | Experts called | Required groups missing |
|---|---|---|---|
| Evaluating a commercial lease before signing | PASS | 6: `site-selection-real-estate-specialist`, `environmental-utility-compliance-specialist`, `permitting-zoning-expediter`, `design-buildout-project-manager`, `lease-negotiation-specialist`, `financial-modeling-funding-strategist` | none |
| Startup budget and break-even plan | FAIL | 10: `design-buildout-project-manager`, `head-of-coffee-beverage-program`, `environmental-utility-compliance-specialist`, `talent-acquisition-training-manager`, `risk-insurance-hurricane-manager`, `marketing-pr-launch-manager`, `entity-tax-bookkeeping-specialist`, `lease-negotiation-specialist`, `launch-program-director`, `financial-modeling-funding-strategist` | none |
| Grand opening and marketing strategy | PASS | 7: `marketing-pr-launch-manager`, `social-media-community-manager`, `launch-program-director`, `cafe-operations-manager`, `technology-pos-data-specialist`, `head-of-coffee-beverage-program`, `financial-modeling-funding-strategist` | none |
| Rising costs, staffing shortage, inventory waste, declining sales | PASS | 9: `cafe-operations-manager`, `financial-modeling-funding-strategist`, `food-program-purchasing-manager`, `talent-acquisition-training-manager`, `employment-law-hr-compliance-specialist`, `technology-pos-data-specialist`, `marketing-pr-launch-manager`, `head-of-coffee-beverage-program`, `customer-experience-service-design-lead` | none |
| Staffing problem in different words (no 'barista') | PASS | 4: `talent-acquisition-training-manager`, `cafe-operations-manager`, `employment-law-hr-compliance-specialist`, `financial-modeling-funding-strategist` | none |

**4/5 cases passed.**

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
> - **Is the rent affordable?** → `site-selection-real-estate-specialist` (market rent and the 10–12%-of-sales rule) and `financial-modeling-funding-strategist` (profit, break-even, how much you'd personally guarantee).
> - **Hidden costs in a former juice bar** → `environmental-utility-compliance-specialist` (grease trap, county grease permit, water/sewer and impact fees) and `design-buildout-project-manager` (build-out cost and time).
> - **Is 90 days to rent start realistic?** → `permitting-zoning-expediter` (zoning, Certificate of Use, state food-licence review, timeline).
> - **The counter-offer itself** → `lease-negotiation-specialist`, briefed second with all the findings above.
> - **Left out on purpose:** `risk-insurance-hurricane-manager` (the flood-zone check is a next step, not a reason to change the decision), `market-customer-insights-analyst` (checking the $850k figure is a next step), and `launch-program-director` (the decision is narrow).
> - **Order:** site, grease, permits and build-out ran together first. Lease and finance ran second, using their results. Per your instructions, everything came from `docs/` only, with no web lookups.

## Startup budget and break-even plan

**Prompt (no experts named):**

```text
Question: Build our startup budget and break-even plan, and tell us how much to borrow.
Our situation: 1,200 sq ft seated café, about 30 seats, in Coral Gables. Rent around $65/sq ft NNN. Espresso-forward menu with pastries (no kitchen hood). We have $300,000 of our own money and want to open in about 12 months.
What I want back: one combined budget with low/high cases and a contingency, the funding gap and loan options, monthly break-even (customers per day), where the experts disagree, and next steps with owners.
```

**Checks:**

- PASS: required experts selected
- FAIL: routing decision shown
- PASS: combined recommendation
- PASS: disagreements addressed
- PASS: evidence labels used
- PASS: run completed without error

**Required groups (at least one from each):**

- `financial-modeling-funding-strategist`
- `design-buildout-project-manager`
- `entity-tax-bookkeeping-specialist` or `environmental-utility-compliance-specialist` or `head-of-coffee-beverage-program` or `launch-program-director` or `marketing-pr-launch-manager` or `risk-insurance-hurricane-manager` or `talent-acquisition-training-manager`

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
> | Business problem | Experts | Why |
> |---|---|---|
> | Launch marketing plan, press, budget | `marketing-pr-launch-manager` | Owns the launch plan |
> | Building an audience from almost no followers; maps listings, reviews, creators | `social-media-community-manager` | Social media drives ~35% of discovery [REPORTED, docs/08] |
> | Opening date depends on permits and licences | `launch-program-director` | Marketing dates must follow the inspections |
> | Handling the opening rush and Basel crowds | `cafe-operations-manager` | Opening day always needs a plan for the rush |
> | Measuring results | `technology-pos-data-specialist` | Promo codes, loyalty and the weekly dashboard |
> | Hero drinks and the promotion drink | `head-of-coffee-beverage-program` | Concept, speed and cost |
> | Is $15k sensible, and when does it pay back | `financial-modeling-funding-strategist` | Checks the spend against the P&L |
>
> **Left out on purpose:**
> - Permitting and food-safety experts: the program director covered the go/no-go gates, and the next step is to hand off to them.
> - Hiring/training and customer experience: operations covered staffing for the rush.
> - Brand and competitor experts: the concept is already set.
>
> **Test-run limits:** each brief was under 200 words, and no web lookups were made.

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
> | Problem I identified | Experts I chose and why |
> |---|---|
> | Labor at 38% of sales | `cafe-operations-manager` (scheduling), `financial-modeling-funding-strategist` (dollar value of each fix), `employment-law-hr-compliance-specialist` (cutting or reshuffling hours brings in wage-and-hour rules) |
> | Staffing shortage (2 of 6 baristas quit) | `talent-acquisition-training-manager`, plus the employment-law specialist above |
> | Pastry waste, higher milk and cup costs | `food-program-purchasing-manager`, `head-of-coffee-beverage-program` (drink costs, menu prices, cup sizes) |
> | Sales down 22% | `technology-pos-data-specialist` (find out why first), `marketing-pr-launch-manager`, `customer-experience-service-design-lead` (keeping regulars with fewer staff) |
>
> **Left out on purpose:** coffee sourcing (beans aren't the cost problem; arabica is down about 32% year over year [REPORTED] docs/05). Social media (marketing covers it; it gets the posting work). Lease (asking the landlord for rent relief is a possible later step, not a 30-day fix). Risk and hurricanes (July is in hurricane season, so I flag it below but didn't brief it).
>
> Per your test-run rule, briefs and answers were kept short and used only `docs/`, with no web lookups.
>
> ---

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
> - **Not enough staff, and people keep quitting** → `talent-acquisition-training-manager` (pay, where to find people, how to hire and keep them) and `cafe-operations-manager` (weekend coverage and what to measure).
> - **Pay, tips, premiums and work-permit rules this raises** → `employment-law-hr-compliance-specialist`.
> - **Paying people more costs money** → `financial-modeling-funding-strategist` (can you afford higher pay, compared with what turnover costs you now).
> - **Left out on purpose:** customer experience (weekend service will improve once the gaps are filled), POS (only needed for one report, which operations can ask for), and marketing (this isn't a demand problem).
> - **Test run:** each expert used only the `docs/` research, with no web lookups.
