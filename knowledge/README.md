# Knowledge Folders

Each of the 26 Experts21 agents has its own folder here: `knowledge/<agent-name>/`. The agent reads its folder **before answering**.

- **Only `README.md` in the folder** (the starting state): the agent uses the shared research in `docs/` and tells you no additional documents have been provided.
- **Documents added:** the agent reads the relevant ones first, cites them by file name, labels them by source, and flags any conflict with `docs/`.

Each folder's `README.md` lists the documents that belong there and the `docs/` research that agent consults. Agent names, models, and personalities are in [`docs/agent-brains.md`](../docs/agent-brains.md).

| Folder | Agent | First name | Model |
|---|---|---|---|
| [`launch-program-director/`](launch-program-director/README.md) | Launch Program Director | Elena | `opus` |
| [`concept-brand-strategist/`](concept-brand-strategist/README.md) | Concept & Brand Strategist | Camila | `sonnet` |
| [`market-customer-insights-analyst/`](market-customer-insights-analyst/README.md) | Market & Customer Insights Analyst | Priya | `sonnet` |
| [`competitive-intelligence-analyst/`](competitive-intelligence-analyst/README.md) | Competitive Intelligence Analyst | Diego | `haiku` |
| [`financial-modeling-funding-strategist/`](financial-modeling-funding-strategist/README.md) | Financial Modeling & Funding Strategist | Raymond | `opus` |
| [`entity-tax-bookkeeping-specialist/`](entity-tax-bookkeeping-specialist/README.md) | Entity, Tax & Bookkeeping Specialist | Grace | `opus` |
| [`site-selection-real-estate-specialist/`](site-selection-real-estate-specialist/README.md) | Site Selection & Commercial Real Estate Specialist | Andrés | `sonnet` |
| [`lease-negotiation-specialist/`](lease-negotiation-specialist/README.md) | Lease Negotiation Specialist | Marcus | `opus` |
| [`permitting-zoning-expediter/`](permitting-zoning-expediter/README.md) | Permitting & Zoning Expediter | Teresa | `opus` |
| [`environmental-utility-compliance-specialist/`](environmental-utility-compliance-specialist/README.md) | Environmental & Utility Compliance Specialist | Hector | `opus` |
| [`design-buildout-project-manager/`](design-buildout-project-manager/README.md) | Café Design & Build-Out Project Manager | Nadia | `sonnet` |
| [`food-safety-licensing-specialist/`](food-safety-licensing-specialist/README.md) | Food Safety & Licensing Compliance Specialist | Patricia | `opus` |
| [`employment-law-hr-compliance-specialist/`](employment-law-hr-compliance-specialist/README.md) | Employment Law & HR Compliance Specialist | Jonathan | `opus` |
| [`risk-insurance-hurricane-manager/`](risk-insurance-hurricane-manager/README.md) | Risk, Insurance & Hurricane Preparedness Manager | Walter | `opus` |
| [`coffee-sourcing-roaster-partnership-specialist/`](coffee-sourcing-roaster-partnership-specialist/README.md) | Coffee Sourcing & Roaster Partnership Specialist | Lucía | `sonnet` |
| [`head-of-coffee-beverage-program/`](head-of-coffee-beverage-program/README.md) | Head of Coffee (Beverage Program & Bar Standards) | Mateo | `sonnet` |
| [`food-program-purchasing-manager/`](food-program-purchasing-manager/README.md) | Food Program & Purchasing Manager | Rosa | `sonnet` |
| [`talent-acquisition-training-manager/`](talent-acquisition-training-manager/README.md) | Talent Acquisition & Training Manager | Jasmine | `sonnet` |
| [`cafe-operations-manager/`](cafe-operations-manager/README.md) | Café Operations Manager | Luis | `sonnet` |
| [`customer-experience-service-design-lead/`](customer-experience-service-design-lead/README.md) | Customer Experience & Service Design Lead | Sofia | `sonnet` |
| [`technology-pos-data-specialist/`](technology-pos-data-specialist/README.md) | Technology, POS & Data Systems Specialist | Kevin | `sonnet` |
| [`marketing-pr-launch-manager/`](marketing-pr-launch-manager/README.md) | Marketing, PR & Launch Manager | Valentina | `sonnet` |
| [`social-media-community-manager/`](social-media-community-manager/README.md) | Social Media & Community Manager | Gabriel | `haiku` |
| [`growth-expansion-strategist/`](growth-expansion-strategist/README.md) | Growth & Expansion Strategist | Isabel | `opus` |
| [`orchestrator/`](orchestrator/README.md) | Orchestrator | Ava | `opus` |
| [`agent-builder/`](agent-builder/README.md) | Agent Builder | Theo | `opus` |

**Privacy:** don't store passwords, financial account numbers, or personal employee records in this repository.
