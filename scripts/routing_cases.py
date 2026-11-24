"""Shared routing test cases for the orchestrator (used by validate_team.py and
live_routing_test.py).

Each case has a prompt that does NOT name any expert, plus `required`: a list
of groups. A group is a set of agent names; the case passes when the
orchestrator selects at least one agent from every group (a one-name group
means that agent is required).

The four main cases are the worked examples in docs/how-to-talk-to-your-experts.md,
read from that file with their "Experts to involve" and "Order" lines removed.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = os.path.join(ROOT, "docs", "how-to-talk-to-your-experts.md")

STAFF = {"talent-acquisition-training-manager", "cafe-operations-manager",
         "employment-law-hr-compliance-specialist"}


def _guide_prompt(n):
    """Return example n's prompt from the guide, with expert names removed."""
    text = open(GUIDE, encoding="utf-8").read()
    section = text.split(f"### Example {n}:", 1)[1]
    block = re.search(r"```text\n(.*?)```", section, flags=re.S).group(1)
    keep = [line for line in block.splitlines()
            if line.strip()
            and not line.startswith("@agent-")
            and not line.startswith("Experts to involve:")
            and not line.startswith("Order")]
    prompt = "\n".join(keep)
    assert "-specialist" not in prompt and "-manager" not in prompt, "expert names leaked"
    return prompt


def g(*names):
    return set(names)


CASES = [
    {
        "id": "example-1-lease",
        "title": "Evaluating a commercial lease before signing",
        "prompt": _guide_prompt(1),
        "required": [g("site-selection-real-estate-specialist"),
                     g("lease-negotiation-specialist"),
                     g("financial-modeling-funding-strategist"),
                     g("environmental-utility-compliance-specialist"),
                     g("permitting-zoning-expediter")],
    },
    {
        "id": "example-2-budget",
        "title": "Startup budget and break-even plan",
        "prompt": _guide_prompt(2),
        "required": [g("financial-modeling-funding-strategist"),
                     g("design-buildout-project-manager"),
                     g("launch-program-director", "head-of-coffee-beverage-program",
                       "environmental-utility-compliance-specialist",
                       "entity-tax-bookkeeping-specialist", "talent-acquisition-training-manager",
                       "risk-insurance-hurricane-manager", "marketing-pr-launch-manager")],
    },
    {
        "id": "example-3-grand-opening",
        "title": "Grand opening and marketing strategy",
        "prompt": _guide_prompt(3),
        "required": [g("marketing-pr-launch-manager"),
                     g("social-media-community-manager"),
                     g("launch-program-director", "food-safety-licensing-specialist"),
                     g("cafe-operations-manager", "talent-acquisition-training-manager")],
    },
    {
        "id": "example-4-operations",
        "title": "Rising costs, staffing shortage, inventory waste, declining sales",
        "prompt": _guide_prompt(4),
        "required": [g("cafe-operations-manager"),
                     g("talent-acquisition-training-manager"),
                     g("employment-law-hr-compliance-specialist"),
                     g("food-program-purchasing-manager"),
                     g("financial-modeling-funding-strategist", "coffee-sourcing-roaster-partnership-specialist"),
                     g("technology-pos-data-specialist", "marketing-pr-launch-manager",
                       "customer-experience-service-design-lead", "social-media-community-manager")],
    },
    {
        "id": "staffing-paraphrase",
        "title": "Staffing problem in different words (no 'barista')",
        "prompt": ("We run a small café in Little Havana. Employee turnover is brutal: three people "
                   "left this quarter, we're constantly short-staffed on weekends, and our hiring "
                   "problems mean almost nobody decent applies. What should we do?"),
        "required": [g(n) for n in sorted(STAFF)],
    },
]

# Short paraphrases for the static (offline) check: each must reach all STAFF experts.
STAFFING_PHRASES = [
    "Two baristas quit last week.",
    "Employee turnover is out of control.",
    "We have staff shortages every weekend.",
    "We keep having hiring problems.",
    "We're short-staffed and can't find workers.",
    "Our team keeps quitting and retention is terrible.",
]


def passes(selected, required):
    """Return (ok, missing_groups)."""
    missing = [sorted(grp) for grp in required if not (set(selected) & grp)]
    return not missing, missing
