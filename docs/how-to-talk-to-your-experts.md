# How to Talk to Your Experts

A plain-language guide to asking the Experts21 team questions about opening and running a specialty coffee shop in Miami, Florida. **You don't need any coding experience.** You type questions in everyday English, just as you would message a consultant.

- **Written:** 2026-11-24
- **Team:** 26 AI experts (24 specialists, plus an `orchestrator` that coordinates them and an `agent-builder` that maintains the team). The full list is in [Appendix A](#appendix-a-the-26-experts-and-what-to-ask-them).
- **What they know:** the research in this `docs/` folder (dated 2026-11-23), plus web lookups when needed.

---

## Contents

1. [The basics in 60 seconds](#1-the-basics-in-60-seconds)
2. [Where to type your questions](#2-where-to-type-your-questions)
3. [How to ask one specific expert](#3-how-to-ask-one-specific-expert)
4. [How to ask the entire expert team](#4-how-to-ask-the-entire-expert-team-through-the-orchestrator)
5. [How to have the orchestrator coordinate specific experts and return one recommendation](#5-how-to-have-the-orchestrator-coordinate-specific-experts-and-return-one-combined-recommendation)
6. [Four worked examples](#6-four-worked-examples)
   - [Example 1: Evaluating a commercial lease before signing](#example-1-evaluating-a-commercial-lease-before-signing)
   - [Example 2: Startup budget and break-even plan](#example-2-startup-budget-and-break-even-plan)
   - [Example 3: Grand opening and marketing strategy](#example-3-grand-opening-and-marketing-strategy)
   - [Example 4: Fixing operational problems](#example-4-fixing-operational-problems-rising-costs-staffing-inventory-falling-sales)
7. [How to read the answers you get back](#7-how-to-read-the-answers-you-get-back)
8. [Tips for better answers](#8-tips-for-better-answers)
9. [Troubleshooting](#9-troubleshooting)
- [Appendix A: The 26 experts and what to ask them](#appendix-a-the-26-experts-and-what-to-ask-them)
- [Appendix B: Plain-English glossary](#appendix-b-plain-english-glossary)

---

## 1. The basics in 60 seconds

- **Claude Code** is the app where the experts live. You open it on this project (the Experts21 repository) and type messages.
- Each **expert** (also called an "agent") is a specialist with one job, for example the `lease-negotiation-specialist` or the `cafe-operations-manager`. Their names are written with hyphens, and you must type them exactly as shown.
- The **orchestrator** is the team leader. Give it a big question, and it decides which experts to ask, asks them, compares their answers, and gives you **one combined recommendation**.
- Every answer marks how reliable each fact is:

| Label | What it means | How much to trust it |
|---|---|---|
| **[CONFIRMED]** | From an official or government source | High, but fees and laws change, so re-check before you pay or sign |
| **[REPORTED]** | From news, trade press, or brokers | Good, but not checked against an official source |
| **[ESTIMATE]** | A planning range or the team's own calculation | Use for planning only. Get real quotes |
| **[UNVERIFIED]** | Old, single, or conflicting source | Treat it as a lead to check, not a fact |

> **Important:** The experts give planning guidance, not legal, tax, or insurance advice. Before you sign a lease, file taxes, or buy insurance, have a licensed Florida attorney, CPA, or insurance broker review it. The experts will remind you of this too.

---

## 2. Where to type your questions

You can use Claude Code in either of these places. The questions you type are the same in both.

| Where | How to open it | Notes |
|---|---|---|
| **Claude Code on the web or in the app** | Go to claude.ai/code (or open the Claude app), start a session, and choose the **Experts21** repository | Easiest if you don't use a terminal |
| **Claude Code in a terminal** | Open a terminal in the Experts21 folder and type `claude` | Also lets you start a session that *is* one expert (see method C below) |

You type your question in the message box at the bottom and press Enter. That's it.

---

## 3. How to ask one specific expert

Use this when your question clearly belongs to one specialty, for example "What permits do I need?" or "How should I schedule my baristas?"

### Method A: Just name the expert (simplest)

Type the expert's name in your sentence:

```text
Use the permitting-zoning-expediter agent to tell me which permits and approvals a café in Wynwood needs, in what order, and which fees are confirmed vs. estimated.
```

### Method B: @-mention the expert (most reliable)

Type `@`, then start typing the name and pick it from the list that pops up. Or type it out as `@agent-` followed by the name:

```text
@agent-cafe-operations-manager Build a weekly staff schedule for a café open 7am–6pm, 7 days a week, that keeps labor around 250–320 hours a week.
```

More single-expert examples you can copy:

```text
@agent-head-of-coffee-beverage-program Design a specialty version of the cortadito and the colada, with recipes and the cost of each drink.
```

```text
@agent-employment-law-hr-compliance-specialist What is the current Florida minimum wage and tipped wage, and how should we handle tips for baristas?
```

```text
@agent-risk-insurance-hurricane-manager What insurance do we need for a café in a flood zone, and what should our hurricane plan include?
```

### Method C: Make your whole session one expert (terminal only)

In a terminal, start Claude Code like this, and every message in that session goes to that one expert:

```bash
claude --agent financial-modeling-funding-strategist
```

Type `/exit` (or close the window) when you're done.

---

## 4. How to ask the entire expert team (through the orchestrator)

Use this when a question touches several areas (money, location, permits, people, marketing), or when you aren't sure who should answer. The `orchestrator` picks the right experts for you.

### Method A: @-mention the orchestrator

```text
@agent-orchestrator Should we open our first café in Brickell or Coral Gables? We have about $400,000, want 25–30 seats, and plan an espresso-forward menu with pastries.
```

### Method B: Run the whole session as the orchestrator (terminal only)

```bash
claude --agent orchestrator
```

Then ask your questions one after another. Each one is routed to the team.

**You don't need to know any expert names.** Describe the problem in your own words. The orchestrator works out what you **mean**, not which words you used. For example, "two baristas quit," "employee turnover is brutal," "we're short-staffed," and "hiring problems" all bring in the same three experts: `talent-acquisition-training-manager`, `cafe-operations-manager`, and `employment-law-hr-compliance-specialist`. It also includes experts for problems you only imply. For example, cutting staff hours raises wage-law questions. The top of its answer shows a short **Routing decision** listing which experts it chose and why.

### What the orchestrator does behind the scenes

```text
Your question
     │
     ▼
 orchestrator ──► works out the underlying problems (by meaning)
     │
     ▼
              ──► picks the right experts (usually 2–6, more for tangled problems)
     │
     ├──► expert 1 ─┐
     ├──► expert 2 ─┤  (they work at the same time)
     └──► expert 3 ─┘
     │
     ▼
 compares answers → finds where they agree and disagree
     │
     ▼
 ONE combined recommendation + next steps
```

When experts disagree, the orchestrator settles it in this order of priority:

1. Legal and safety compliance first.
2. Then business survival (cash, rent not too high, break-even).
3. Then customer value and the brand.
4. Then speed.

---

## 5. How to have the orchestrator coordinate specific experts and return one combined recommendation

Section 4 lets the orchestrator choose the experts, and it does this well on its own: all four examples below were tested **without** naming any experts (see [the test results](orchestrator-routing-test-results.md)). If **you** want to decide who takes part, use this fill-in-the-blank template. The orchestrator includes the experts you name and adds any others it thinks are needed, explaining why:

```text
@agent-orchestrator
Question: [what you need to decide]
Our situation: [neighborhood, size, budget, timeline, concept, any numbers you have]
Experts to involve: [agent names, separated by commas]
Order (if one needs another's answer first): [for example, "lease terms first, then the financial model"]
What I want back: one combined recommendation, where the experts agree and disagree, the key numbers with evidence labels, and next steps with an owner for each.
```

Tips:

- **Order matters** when one expert's answer feeds another's. For example, the `lease-negotiation-specialist` should set the rent terms before the `financial-modeling-funding-strategist` checks whether you can afford them.
- **Ask for the disagreements.** That's where the real decisions are.
- **Follow up in the same conversation:** "Ask the financial-modeling-funding-strategist to rerun the numbers with rent at $60/sq ft instead."

All four examples below use this template. You can also delete the "Experts to involve" and "Order" lines and let the orchestrator decide.

---

## 6. Four worked examples

Each example includes the **prompt to copy**, **which experts take part**, **how their work connects**, and **what you'll get back**. The numbers inside the prompts are sample situations. Replace them with your own.

---

### Example 1: Evaluating a commercial lease before signing

**The situation:** You found a space in Brickell and the landlord sent a letter of intent (LOI). You want to know whether to sign and what to ask for.

**Prompt to copy:**

```text
@agent-orchestrator
Question: Should we sign this lease, and if not, what should we counter-offer?
Our situation: 1,400 sq ft second-generation space in Brickell (it was a juice bar, so there may be a grease trap). The landlord's LOI asks $78/sq ft NNN, a 10-year term, a full personal guarantee, rent starting 90 days after signing, and no tenant improvement allowance. We expect about $850,000 in yearly sales once we're established.
Experts to involve: site-selection-real-estate-specialist, lease-negotiation-specialist, financial-modeling-funding-strategist, permitting-zoning-expediter, environmental-utility-compliance-specialist, design-buildout-project-manager, risk-insurance-hurricane-manager
Order: site and permitting/environmental checks first, then lease terms, then the financial test of those terms.
What I want back: one combined recommendation (sign / counter / walk away), the counter-offer terms, where the experts disagree, the key numbers with evidence labels, and next steps with an owner for each.
```

**Who takes part and why**

| Expert | What they do here |
|---|---|
| `site-selection-real-estate-specialist` | Compares $78/sq ft NNN with Miami rents and checks foot traffic, parking, flood zone, and whether it's a true second-generation food space |
| `permitting-zoning-expediter` | Confirms a café is allowed at this address, plus the Certificate of Use and permit path, **before** you sign |
| `environmental-utility-compliance-specialist` | Checks whether the existing grease trap meets Miami-Dade DERM rules and estimates water/sewer and impact fees |
| `design-buildout-project-manager` | Estimates what the build-out will cost and how long it will take, given what's already in the space |
| `lease-negotiation-specialist` | Reviews every clause and writes the counter-offer: free rent during build-out, tenant improvement money, a permit contingency, CAM caps, a limit on the personal guarantee |
| `financial-modeling-funding-strategist` | Tests whether rent + NNN stays at or below about 10–12% of sales, and what break-even looks like |
| `risk-insurance-hurricane-manager` | Reviews the insurance and indemnity clauses and the flood exposure |

**How their work connects**

```text
site-selection ──► permitting + environmental ──► design-buildout (cost/time)
                                                        │
                                                        ▼
                     lease-negotiation (counter-offer terms) ──► financial-modeling (can we afford it?)
                                                        │
                              risk-insurance (insurance clauses, flood) ──► orchestrator combines → recommendation
```

Site and permit problems can kill a deal, so they're checked first. Build-out cost shapes how much free rent and tenant improvement money to ask for. The finance expert then tests the final terms. In our earlier test run on a similar Wynwood space, the team recommended **not signing as offered**, because rent would have been about 15–16% of sales and the space had no grease trap.

**What you'll get back:** sign / counter / walk away, a list of counter-offer terms, rent as a percentage of sales, the checks to complete before signing (zoning, grease trap, fees), and a reminder to have a Florida real-estate attorney review the lease.

---

### Example 2: Startup budget and break-even plan

**The situation:** You have some savings and want to know the full cost of opening, how much to borrow, and how many customers a day you need.

**Prompt to copy:**

```text
@agent-orchestrator
Question: Build our startup budget and break-even plan, and tell us how much to borrow.
Our situation: 1,200 sq ft seated café, about 30 seats, in Coral Gables. Rent around $65/sq ft NNN. Espresso-forward menu with pastries (no kitchen hood). We have $300,000 of our own money and want to open in about 12 months.
Experts to involve: financial-modeling-funding-strategist, launch-program-director, design-buildout-project-manager, head-of-coffee-beverage-program, environmental-utility-compliance-specialist, entity-tax-bookkeeping-specialist, talent-acquisition-training-manager, risk-insurance-hurricane-manager, marketing-pr-launch-manager
Order: cost inputs first (build-out, equipment, grease trap, staffing, insurance, marketing, entity/tax setup), then the financial model.
What I want back: one combined budget with low/high cases and a contingency, the funding gap and loan options, monthly break-even (customers per day), where the experts disagree, and next steps with owners.
```

**Who takes part and why**

| Expert | What they provide |
|---|---|
| `design-buildout-project-manager` | Build-out cost range (the biggest variable), design fees, and timeline |
| `head-of-coffee-beverage-program` | Equipment list and costs (espresso machine, grinders, ice machine, refrigeration) |
| `environmental-utility-compliance-specialist` | Grease trap, water/sewer connection, and impact-fee estimates |
| `talent-acquisition-training-manager` | Pre-opening hiring and training payroll at the $15/hr Florida minimum wage or above |
| `risk-insurance-hurricane-manager` | Insurance deposits and yearly premiums, including flood |
| `marketing-pr-launch-manager` | Launch marketing budget |
| `entity-tax-bookkeeping-specialist` | LLC and tax setup costs, plus 7% sales tax handling in the model |
| `financial-modeling-funding-strategist` | Combines everything into the budget, sizes the loan (for example, SBA 7(a)), and calculates break-even |
| `launch-program-director` | Checks the 12-month timeline and adds the cost of any delay (rent paid with no sales) |

**How their work connects**

```text
build-out + equipment + grease trap + payroll + insurance + marketing + entity/tax
                                   │ (cost inputs)
                                   ▼
                  financial-modeling-funding-strategist
                   ├─ startup budget (low / high / contingency)
                   ├─ funding gap vs. your $300,000 → loan size
                   └─ break-even customers per day
                                   │
                  launch-program-director (timeline and delay cost)
                                   ▼
                     orchestrator → one combined plan
```

For reference, the research's model puts a café like this at about **$230,000–$785,000** to open, and break-even at about **150–170 customers a day** at Miami rents [ESTIMATE]. The team replaces these ranges with numbers for your situation.

**What you'll get back:** a budget table (low / high / contingency), how much to borrow, monthly break-even, which costs are confirmed vs. estimated, and a list of quotes to collect.

---

### Example 3: Grand opening and marketing strategy

**The situation:** Your café opens in 10 weeks and you want a launch plan that brings people in and keeps them coming back.

**Prompt to copy:**

```text
@agent-orchestrator
Question: Plan our grand opening and the first 90 days of marketing.
Our situation: Our Wynwood café opens in 10 weeks (early December, close to Art Basel week). Marketing budget is $15,000. We want local residents, nearby office workers, and visitors. Our idea is "Miami-made specialty": specialty versions of Cuban drinks plus a strong iced menu. We have Instagram but almost no followers.
Experts to involve: marketing-pr-launch-manager, social-media-community-manager, concept-brand-strategist, head-of-coffee-beverage-program, technology-pos-data-specialist, cafe-operations-manager, talent-acquisition-training-manager, food-safety-licensing-specialist, launch-program-director
Order: confirm opening-readiness (licence, inspection, staff) first, then the marketing plan, then the menu, staffing, and tech set-up to handle the rush.
What I want back: one combined week-by-week launch plan, the opening-day promotion, a budget split, how we'll measure results, where the experts disagree, and next steps with owners.
```

**Who takes part and why**

| Expert | What they do here |
|---|---|
| `launch-program-director` | Builds the countdown and makes sure nothing is promoted before the café can legally open |
| `food-safety-licensing-specialist` | Confirms the DBPR food service licence and opening inspection are on track. You can't open without them |
| `concept-brand-strategist` | Sharpens the "Miami-made specialty" story and the visual look |
| `marketing-pr-launch-manager` | Press outreach (Miami New Times, Eater Miami, and others), soft opening, opening-day promotion, Art Basel timing, budget split |
| `social-media-community-manager` | Instagram/TikTok countdown, Google Business Profile, creator invitations, bilingual posts |
| `head-of-coffee-beverage-program` | A short launch menu that's fast to make during a rush, plus a signature opening drink |
| `technology-pos-data-specialist` | Sets up loyalty, the sign-up offer, and tracking so you can measure what worked |
| `cafe-operations-manager` | Opening-week schedule and a plan for long lines |
| `talent-acquisition-training-manager` | Makes sure enough baristas are hired and trained before the doors open |

**How their work connects**

```text
launch-program-director + food-safety-licensing (can we open on time?)
                 │
                 ▼
concept-brand (story) ──► marketing-pr-launch (press, promotion, calendar)
                                  │
                                  ├──► social-media-community (posts, maps listing, creators)
                                  ├──► head-of-coffee (launch menu) ──► cafe-operations + talent (staff the rush)
                                  └──► technology-pos-data (loyalty and offer tracking)
                                  ▼
                       orchestrator → one launch plan
```

The research gives the team useful facts to plan with. Social media drives about **35%** of how people find coffee shops, and **36%** of people would try a new café for a buy-one-get-one offer [REPORTED, Toast]. The plan also has to make sure the café can handle the crowd it attracts.

**What you'll get back:** a week-by-week countdown, the opening-day offer, the $15,000 budget split, a press list, a social content plan, staffing for opening week, and the numbers to track.

---

### Example 4: Fixing operational problems (rising costs, staffing, inventory, falling sales)

**The situation:** You've been open for a few months and several things are going wrong at once.

**Prompt to copy:**

```text
@agent-orchestrator
Question: What should we do in the next 30 days to cut costs, fix staffing and inventory, and bring sales back?
Our situation: It's July at our Brickell café. Sales are down 22% from spring. Milk and cup costs went up. Two of our six baristas quit last month. We throw away pastries every day. Labor is 38% of sales (our target is about 30%).
Experts to involve: cafe-operations-manager, technology-pos-data-specialist, food-program-purchasing-manager, coffee-sourcing-roaster-partnership-specialist, talent-acquisition-training-manager, employment-law-hr-compliance-specialist, customer-experience-service-design-lead, marketing-pr-launch-manager, social-media-community-manager, financial-modeling-funding-strategist
Order: start with the sales data and the causes, then the fixes for costs, inventory, and staffing, then actions to win back sales, then the cash impact.
What I want back: one combined 30-day action plan in priority order, what each fix saves or earns, where the experts disagree, and next steps with an owner for each.
```

**Who takes part and why**

| Expert | What they do here |
|---|---|
| `technology-pos-data-specialist` | Pulls sales by hour, day, and item so the team can see where the drop actually is |
| `cafe-operations-manager` | Rebuilds the schedule to match the slower hours and brings labor back toward about 30% |
| `food-program-purchasing-manager` | Cuts pastry waste (smaller orders, par levels), compares milk and cup suppliers |
| `coffee-sourcing-roaster-partnership-specialist` | Reviews the coffee contract. Bean prices have been falling [REPORTED], so there may be savings |
| `talent-acquisition-training-manager` | Rehiring plan and ways to keep the baristas you have |
| `employment-law-hr-compliance-specialist` | Makes sure schedule cuts, pay, and tips follow Florida law ($15.00/hr minimum, $11.98 tipped) |
| `customer-experience-service-design-lead` | Checks whether service problems (slow lines, short staffing) are driving customers away |
| `marketing-pr-launch-manager` | Summer promotions aimed at locals and offices (tourism drops in summer) |
| `social-media-community-manager` | Local content, reviews, and community events to bring regulars back |
| `financial-modeling-funding-strategist` | Adds up the savings and new sales, and checks how much cash you need to get through the summer |

**How their work connects**

```text
technology-pos-data (what's really happening?)
        │
        ├──► cafe-operations (schedule / labor) ◄── employment-law-hr (stay legal)
        │                     ▲
        │          talent-acquisition (rehire / retain)
        │
        ├──► food-program-purchasing (waste, milk, cups) + coffee-sourcing (beans)
        │
        └──► customer-experience (service fixes) ──► marketing-pr + social-media (win back sales)
                                    │
                                    ▼
          financial-modeling (savings, cash for summer) → orchestrator → 30-day plan
```

The research warns that Miami cafés usually slow down in summer (June–September) [REPORTED]. The team should separate the normal **seasonal dip** from problems you can fix. Labor is often the biggest lever, and staff shortages are a known risk in Miami right now [REPORTED].

**What you'll get back:** a ranked 30-day action list, the expected savings and sales gain for each step, a revised staff schedule, purchasing changes, a summer promotion plan, and a cash check.

---

## 7. How to read the answers you get back

A combined answer from the orchestrator usually has these parts:

0. **Routing decision:** the problems the orchestrator identified, and which experts it chose for each and why.
1. **Recommendation:** the bottom line. Read this first.
2. **Experts consulted:** who took part and what each one found.
3. **Where experts agree:** the safest conclusions.
4. **Disagreements & resolution:** where the real trade-offs are. Pay attention here.
5. **Numbers that matter:** each with an evidence label ([CONFIRMED], [REPORTED], [ESTIMATE], [UNVERIFIED]).
6. **Next steps:** each with an owner (an expert name) and what it depends on.
7. **Open questions & items to verify:** what you still need to check, and with whom.

Single experts give a shorter version: Answer → Details → Assumptions → Handoffs (which teammate should help next) → Evidence.

---

## 8. Tips for better answers

- **Give real details:** neighborhood, square feet, rent, budget, timeline, sales numbers. Vague questions get vague answers.
- **One decision per question.** "Should we sign this lease?" works better than "Tell me everything about opening a café."
- **Ask follow-ups** in the same conversation: "Rerun that with 200 customers a day," or "What would change if we skip the pastries?"
- **Ask for sources:** "Show me which numbers are [CONFIRMED] and which are estimates."
- **Ask for a fresh check** on fees and laws: "Use primary-source-verification to re-check the DBPR fees before we apply."
- **Use the skills directly** if you like: type `/unit-economics-modeling` or `/price-positioning` and then your question.
- **Always have a professional review** leases, contracts, tax filings, and insurance before you act.

---

## 9. Troubleshooting

| Problem | What to do |
|---|---|
| The expert's name doesn't pop up after `@` | Make sure you opened Claude Code in the **Experts21** project. Type the name exactly, with hyphens (see Appendix A). |
| The answer came from the main assistant, not an expert | Use the `@agent-` form, for example `@agent-orchestrator`, instead of just mentioning the name. |
| The orchestrator skipped an expert you wanted | Check its **Routing decision** to see why. Then ask a follow-up ("Also include the risk-insurance-hurricane-manager") or name the experts in the **"Experts to involve"** line (section 5). |
| An answer seems out of date | The research is dated 2026-11-23. Ask the expert to check the official source and give the date. |
| You want to call an expert by first name ("Marcus") | Plain language works: "Ask Marcus, the lease-negotiation-specialist, to…". For `@` mentions, use the agent name. All first names are in [agent-brains.md](agent-brains.md). |
| You want the experts to use your own documents (a lease, quotes, sales reports) | Save the file in that expert's folder, `knowledge/<agent-name>/`, and commit it. See the folder's README. |
| You want a new type of expert (for example, on-site roasting) | Ask `@agent-agent-builder Create a specialist for on-site roasting and air permits.` |

---

## Appendix A: The 26 experts and what to ask them

| Expert (type this name) | Ask them about… |
|---|---|
| `launch-program-director` | Overall plan, timeline, what to do first, go/no-go decisions |
| `concept-brand-strategist` | Café concept, name, brand, positioning |
| `market-customer-insights-analyst` | Who your customers are, demand in a neighborhood, surveys, price tests |
| `competitive-intelligence-analyst` | Competing cafés and chains near a site, gaps in the market |
| `financial-modeling-funding-strategist` | Startup budget, profit and break-even, loans and investors, cash flow |
| `entity-tax-bookkeeping-specialist` | Forming the LLC, sales tax, bookkeeping, tax registrations |
| `site-selection-real-estate-specialist` | Finding and comparing locations, rent levels, flood zones |
| `lease-negotiation-specialist` | LOIs and leases, counter-offers, personal guarantees, free rent |
| `permitting-zoning-expediter` | Zoning, building permits, Certificate of Use, business tax receipts, sidewalk seating |
| `environmental-utility-compliance-specialist` | Grease traps and DERM permits, water/sewer fees, impact fees |
| `design-buildout-project-manager` | Architect, contractor, construction budget and schedule, ADA |
| `food-safety-licensing-specialist` | DBPR food licence, inspections, food-safety certificates, alcohol licences |
| `employment-law-hr-compliance-specialist` | Minimum wage, tips, employee handbook, labor law |
| `risk-insurance-hurricane-manager` | Insurance, flood, hurricane plans |
| `coffee-sourcing-roaster-partnership-specialist` | Choosing a roaster, coffee contracts, bean prices and tariffs |
| `head-of-coffee-beverage-program` | Drink menu, recipes, espresso equipment, bar standards |
| `food-program-purchasing-manager` | Food menu, suppliers, ordering, inventory, waste |
| `talent-acquisition-training-manager` | Hiring, job descriptions, pay ranges, training baristas |
| `cafe-operations-manager` | Daily operations, staff schedules, checklists, maintenance, KPIs |
| `customer-experience-service-design-lead` | Service speed, hospitality, seating and comfort, complaints |
| `technology-pos-data-specialist` | POS system, loyalty app, mobile ordering, delivery apps, sales reports |
| `marketing-pr-launch-manager` | Grand opening, press, promotions, marketing calendar |
| `social-media-community-manager` | Instagram, TikTok, Google reviews, community events |
| `growth-expansion-strategist` | Retail beans, subscriptions, catering, wholesale, a second location |
| `orchestrator` | **Any question that needs several experts.** Gives one combined answer |
| `agent-builder` | Adding a new expert or improving an existing one |

---

## Appendix B: Plain-English glossary

| Term | Meaning |
|---|---|
| **Agent / expert** | One AI specialist with a defined job in this project |
| **Orchestrator** | The team leader that coordinates several experts and combines their answers |
| **Skill** | A shared method that several experts use, such as calculating drink costs or checking official sources |
| **LOI** | Letter of intent: a non-binding summary of lease terms before the full lease |
| **NNN (triple net)** | You pay the landlord's property taxes, insurance, and common-area costs on top of base rent |
| **CAM** | Common-area maintenance charges, part of NNN |
| **TI allowance** | Tenant improvement money the landlord gives you toward the build-out |
| **Personal guarantee** | You are personally responsible for the rent if the business can't pay |
| **Permit contingency** | A lease clause that lets you exit or delay if you can't get the permits |
| **Second-generation space** | A space that was already a restaurant or café, so it is cheaper to convert |
| **DERM / grease trap** | Miami-Dade's environmental department requires coffee shops to have an approved grease trap and permit |
| **DBPR** | Florida's agency that issues the food service licence and inspects restaurants |
| **Certificate of Use (CU) / BTR** | City approval that a café is allowed at your address / the city and county business tax receipts |
| **COGS** | Cost of goods sold: what the coffee, milk, food, and cups cost you |
| **Break-even** | The number of customers (or sales) at which you stop losing money |
| **Occupancy cost** | Rent + NNN. Keep it at or below about 10–12% of sales |
| **SBA loan** | A small-business loan partly guaranteed by the U.S. Small Business Administration |
| **POS** | Point of sale: the register system that also tracks your sales data |
