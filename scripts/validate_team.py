#!/usr/bin/env python3
"""Validate the Experts21 agent team.

Checks agent configuration, shared-skill references, roster consistency,
research references, handoffs, CLAUDE.md, and orchestrator routing.

Usage:  python3 scripts/validate_team.py        (exit code 0 = all passed)
Requires PyYAML (pip install pyyaml).
"""
import os
import re
import sys

import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import routing_cases  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENTS_DIR = os.path.join(ROOT, ".claude", "agents")
SKILLS_DIR = os.path.join(ROOT, ".claude", "skills")
ROSTER = os.path.join(ROOT, "docs", "expert-roster.md")

EXPECTED_AGENTS = 26          # 24 specialists + orchestrator + agent-builder
EXPECTED_SPECIALISTS = 24
EXPECTED_SKILLS = 24
META_AGENTS = {"orchestrator", "agent-builder"}
VALID_TOOLS = {"Read", "Write", "Edit", "Glob", "Grep", "Bash", "WebSearch",
               "WebFetch", "Skill", "Agent", "NotebookEdit", "TodoWrite"}
VALID_COLORS = {"red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"}
SPECIALIST_SECTIONS = ["## Mission", "## Responsibilities", "## Research to read first",
                       "## Shared skills (preloaded)", "## Deliverables you own",
                       "## How to work", "## Collaboration and handoffs",
                       "## Evidence rules (required)", "## Answer format"]
SKILL_SECTIONS = ["## When to use", "## Procedure", "## Reference facts",
                  "## Output", "## Guardrails", "## Used by"]
LABELS = ["[CONFIRMED]", "[REPORTED]", "[ESTIMATE]", "[UNVERIFIED]"]

# Sample questions -> experts the orchestrator must include (primary routing).
ROUTING_CASES = [
    ("What permits and Certificate of Use do I need for a cafe in Wynwood?",
     {"permitting-zoning-expediter"}),
    ("Does the space need a grease trap and a DERM permit?",
     {"environmental-utility-compliance-specialist"}),
    ("How much will it cost to open, and how do we get an SBA loan?",
     {"financial-modeling-funding-strategist"}),
    ("Review the LOI: the landlord wants a personal guarantee and NNN of $25",
     {"lease-negotiation-specialist"}),
    ("Should we open in Brickell or Coral Gables?",
     {"site-selection-real-estate-specialist"}),
    ("What do we pay baristas now that the minimum wage is $15 and how do tips work?",
     {"employment-law-hr-compliance-specialist"}),
    ("Design a menu with a specialty cortadito and colada and price the latte",
     {"head-of-coffee-beverage-program"}),
    ("Which roaster should supply our beans and should we lock a fixed price given arabica swings?",
     {"coffee-sourcing-roaster-partnership-specialist"}),
    ("What insurance do we need for hurricane and flood risk?",
     {"risk-insurance-hurricane-manager"}),
    ("Plan the grand opening and press outreach for Art Basel week",
     {"marketing-pr-launch-manager"}),
    ("Grow our Instagram and TikTok and handle Google reviews",
     {"social-media-community-manager"}),
    ("Which POS and loyalty app should we use for mobile order?",
     {"technology-pos-data-specialist"}),
    ("How do we hire and train bilingual baristas?",
     {"talent-acquisition-training-manager"}),
    ("Write the daily opening checklist and SOP for the shift leads",
     {"cafe-operations-manager"}),
    ("Who are our main competitors near the site, like Panther and Black Sheep?",
     {"competitive-intelligence-analyst"}),
    ("Which customer segments and demographics should we target?",
     {"market-customer-insights-analyst"}),
    ("Help define the concept and brand positioning",
     {"concept-brand-strategist"}),
    ("How do we form the LLC on Sunbiz and register for sales tax?",
     {"entity-tax-bookkeeping-specialist"}),
    ("Manage the contractor and architect for the build-out",
     {"design-buildout-project-manager"}),
    ("What does DBPR require for the food service license and food manager certification?",
     {"food-safety-licensing-specialist"}),
    ("Choose pastry vendors and set inventory par levels for milk and packaging",
     {"food-program-purchasing-manager"}),
    ("Improve speed of service and seating comfort for a better customer experience",
     {"customer-experience-service-design-lead"}),
    ("When can we open a second location or sell retail beans and subscriptions?",
     {"growth-expansion-strategist"}),
    ("Build the overall launch timeline and critical path to opening day",
     {"launch-program-director"}),
    # multi-expert questions
    ("We found a Wynwood space at $95/sq ft NNN with no grease trap. Should we sign the lease?",
     {"site-selection-real-estate-specialist", "lease-negotiation-specialist",
      "environmental-utility-compliance-specialist"}),
    ("Can we afford $15 minimum wage staffing and still break even with our budget?",
     {"employment-law-hr-compliance-specialist", "financial-modeling-funding-strategist"}),
]
MAX_PRIMARY_FOR_NARROW = 6

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


def read_frontmatter(path):
    text = open(path, encoding="utf-8").read()
    if not text.startswith("---\n"):
        return None, text, "frontmatter must start on line 1"
    end = text.find("\n---\n", 4)
    if end == -1:
        return None, text, "frontmatter not closed"
    try:
        meta = yaml.safe_load(text[4:end])
    except yaml.YAMLError as exc:
        return None, text, f"YAML error: {exc}"
    if not isinstance(meta, dict):
        return None, text, "frontmatter is not a mapping"
    return meta, text[end + 5:], ""


def split_tools(value):
    if isinstance(value, list):
        return [t.strip() for t in value]
    return [t.strip() for t in str(value).split(",") if t.strip()]


def parse_roster():
    """Return {slug: set(skill ids)} parsed from docs/expert-roster.md."""
    text = open(ROSTER, encoding="utf-8").read()
    id_to_slug = dict(re.findall(r"#### (A\d\d) — .*?\n\n- \*\*Slug:\*\* `([^`]+)`", text))
    m = re.search(r"\| Expert \| (S\d\d(?: \| S\d\d)*) \|", text)
    skill_cols = m.group(1).split(" | ")
    mapping = {}
    for line in text.splitlines():
        row = re.match(r"\| (A\d\d) [^|]+\|(.*)\|$", line)
        if row and row.group(1) in id_to_slug:
            cells = [c.strip() for c in row.group(2).split("|")]
            mapping[id_to_slug[row.group(1)]] = {s for s, c in zip(skill_cols, cells) if c == "●"}
    return mapping, skill_cols


def parse_routing(body):
    rows = []
    in_table = False
    for line in body.splitlines():
        if line.startswith("| Topic | Trigger keywords |"):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break
            if line.startswith("|---"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            topic, kws, prim, sup = cells
            rows.append((topic,
                         [k.strip().lower() for k in kws.split(",") if k.strip()],
                         [p.strip() for p in prim.split(",") if p.strip()],
                         [s.strip() for s in sup.split(",") if s.strip()]))
    return rows


def parse_playbooks(body):
    """Parse the 'Problem playbooks' table: (problem, signals, core, add)."""
    rows, in_table = [], False
    for line in body.splitlines():
        if line.startswith("| Business problem | How users might say it"):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break
            if line.startswith("|---"):
                continue
            problem, signals, core, add = [c.strip() for c in line.strip("|").split("|")]
            core = re.sub(r"\([^)]*\)", "", core)  # allow short notes in parentheses
            rows.append((problem,
                         [k.strip().lower() for k in signals.split(",") if k.strip()],
                         [x.strip() for x in core.split(",") if x.strip()],
                         [x.strip() for x in add.split(",") if x.strip()]))
    return rows


def _hit(phrase, text):
    # whole-word match that also accepts simple plurals ("barista" ~ "baristas")
    pat = r"(?<![a-z])" + re.escape(phrase) + r"(?:s|es)?(?![a-z])"
    return re.search(pat, text) is not None


def route(question, rows, playbooks=()):
    """Offline approximation of the orchestrator's routing.

    The real orchestrator routes by meaning (Steps A-E in its file). This
    proxy checks that the documented signals and keyword hints alone already
    reach the right experts for the test phrasings.
    """
    q = question.lower().replace("’", "'")
    primary, support = set(), set()
    for _, kws, prim, sup in rows:
        if any(_hit(k, q) for k in kws):
            primary.update(prim)
            support.update(sup)
    for _, signals, core, add in playbooks:
        if any(_hit(k, q) for k in signals):
            primary.update(core)
            support.update(add)
    return primary, support


def main():
    # ---------------------------------------------------------------- agents
    agent_files = sorted(f for f in os.listdir(AGENTS_DIR) if f.endswith(".md"))
    check("T01 agent file count == 26", len(agent_files) == EXPECTED_AGENTS,
          f"found {len(agent_files)}")
    agents = {}
    for fn in agent_files:
        meta, body, err = read_frontmatter(os.path.join(AGENTS_DIR, fn))
        check(f"T02 {fn}: frontmatter parses", meta is not None, err)
        if meta is None:
            continue
        name = meta.get("name", "")
        ok = (bool(name) and bool(meta.get("description")) and ":" not in name
              and not name.startswith("-") and len(name) <= 256 and fn == f"{name}.md")
        check(f"T03 {fn}: name/description valid and name matches filename", ok)
        tools = split_tools(meta.get("tools", ""))
        bad = [t for t in tools if t not in VALID_TOOLS]
        check(f"T04 {fn}: tools valid", tools and not bad, f"invalid: {bad}")
        check(f"T05 {fn}: color valid", meta.get("color") in VALID_COLORS)
        agents[name] = (meta, body)
    check("T06 agent names unique", len(agents) == len(agent_files))
    check("T07 orchestrator and agent-builder exist", META_AGENTS <= set(agents))
    specialists = {n: v for n, v in agents.items() if n not in META_AGENTS}
    check("T08 specialist count == 24", len(specialists) == EXPECTED_SPECIALISTS,
          f"found {len(specialists)}")

    # ---------------------------------------------------------------- skills
    skill_dirs = sorted(d for d in os.listdir(SKILLS_DIR)
                        if os.path.isdir(os.path.join(SKILLS_DIR, d)))
    check("T09 skill count == 24", len(skill_dirs) == EXPECTED_SKILLS, f"found {len(skill_dirs)}")
    skills, id_to_skill = {}, {}
    for d in skill_dirs:
        path = os.path.join(SKILLS_DIR, d, "SKILL.md")
        if not os.path.exists(path):
            check(f"T10 {d}: SKILL.md exists", False)
            continue
        meta, body, err = read_frontmatter(path)
        check(f"T10 {d}: SKILL.md frontmatter parses", meta is not None, err)
        if meta is None:
            continue
        listing = (meta.get("description", "") + " " + meta.get("when_to_use", "")).strip()
        ok = (meta.get("name") == d and meta.get("description")
              and not re.search(r"[<>:]", meta["name"]) and len(listing) <= 1536)
        check(f"T11 {d}: name == directory, description present, listing <= 1536 chars", ok,
              f"listing length {len(listing)}")
        missing = [s for s in SKILL_SECTIONS if s not in body]
        check(f"T12 {d}: required sections present", not missing, f"missing {missing}")
        sid = (meta.get("metadata") or {}).get("id")
        check(f"T13 {d}: metadata id present", bool(sid))
        skills[d] = (meta, body)
        id_to_skill[sid] = d
    check("T14 skill ids are S01..S24 and unique",
          sorted(id_to_skill) == [f"S{i:02d}" for i in range(1, 25)])

    # ---------------------------------------------------------- references
    for name, (meta, body) in agents.items():
        listed = meta.get("skills") or []
        missing = [s for s in listed if s not in skills]
        check(f"T15 {name}: every preloaded skill exists", not missing, f"missing {missing}")
        check(f"T16 {name}: <= 32 preloaded skills", len(listed) <= 32)

    for d, (meta, _) in skills.items():
        declared = set((meta.get("metadata") or {}).get("used_by", []))
        actual = {n for n, (m, _) in specialists.items() if d in (m.get("skills") or [])}
        check(f"T17 {d}: used_by metadata matches the specialists that preload it",
              declared == actual, f"declared-only {declared - actual}, actual-only {actual - declared}")
        check(f"T18 {d}: shared by >= 2 specialists", len(actual) >= 2, f"{len(actual)}")

    # ------------------------------------------------------- roster mapping
    roster_map, cols = parse_roster()
    check("T19 roster parsed: 24 experts x 24 skills",
          len(roster_map) == 24 and len(cols) == 24, f"{len(roster_map)} x {len(cols)}")
    check("T20 every roster expert has an agent file", set(roster_map) == set(specialists),
          f"diff {set(roster_map) ^ set(specialists)}")
    for slug, expected_ids in roster_map.items():
        if slug not in specialists:
            continue
        got = {(skills.get(s, ({}, ""))[0].get("metadata") or {}).get("id")
               for s in specialists[slug][0].get("skills") or []}
        check(f"T21 {slug}: preloaded skills match roster", got == expected_ids,
              f"missing {sorted(expected_ids - got)}, extra {sorted(got - expected_ids)}")

    # --------------------------------------------- docs references & content
    all_text = {f"agent:{n}": b for n, (_, b) in agents.items()}
    all_text.update({f"skill:{d}": b for d, (_, b) in skills.items()})
    for key, body in all_text.items():
        paths = set(re.findall(r"docs/[\w.\-]+\.md", body))
        bad = [p for p in paths if not os.path.exists(os.path.join(ROOT, p))]
        check(f"T22 {key}: referenced docs files exist", not bad, f"missing {bad}")
    for name, (_, body) in specialists.items():
        missing = [s for s in SPECIALIST_SECTIONS if s not in body]
        check(f"T23 {name}: required sections present", not missing, f"missing {missing}")
        check(f"T24 {name}: references at least one research file 01-09",
              re.search(r"docs/0\d-", body))
    for name, (_, body) in agents.items():
        check(f"T25 {name}: evidence labels + no-invention rule present",
              all(l in body for l in LABELS) and "Never invent" in body)
    for name, (_, body) in specialists.items():
        sect = body.split("## Collaboration and handoffs", 1)[1].split("\n## ", 1)[0]
        targets = re.findall(r"^\| `([a-z0-9\-]+)`", sect, flags=re.M)
        bad = [t for t in targets if t not in agents]
        check(f"T26 {name}: handoff targets exist ({len(targets)})", targets and not bad, f"bad {bad}")

    total_desc = sum(len(m.get("description", "")) for m, _ in agents.values())
    check("T27 combined agent descriptions well under the 15,000-token limit",
          total_desc / 4 < 15000 * 0.5, f"~{total_desc // 4} tokens")

    # ------------------------------------------------------- orchestrator
    ometa, obody = agents.get("orchestrator", ({}, ""))
    check("T28 orchestrator has the Agent tool", "Agent" in split_tools(ometa.get("tools", "")))
    rows = parse_routing(obody)
    check("T29 routing table parsed", len(rows) >= 20, f"{len(rows)} rows")
    routed_agents = {a for _, _, p, s in rows for a in p + s}
    check("T30 routing table names only real agents", routed_agents <= set(agents),
          f"unknown {routed_agents - set(agents)}")
    primaries = {a for _, _, p, _ in rows for a in p}
    check("T31 every specialist is a primary route", primaries == set(specialists),
          f"unrouted {set(specialists) - primaries}")
    for slug in list(specialists) + ["agent-builder"]:
        check(f"T32 orchestrator directory lists {slug}", f"`{slug}`" in obody)
    for q, expected in ROUTING_CASES:
        prim, sup = route(q, rows, parse_playbooks(obody))
        ok = expected <= prim
        if len(expected) == 1:
            ok = ok and len(prim) <= MAX_PRIMARY_FOR_NARROW
        check(f"T33 route: {q[:60]}", ok,
              f"expected {sorted(expected)} got {sorted(prim)}")

    # ---------------------------------------------- semantic routing (T39-T43)
    check("T39 orchestrator routes by meaning (section + steps A-E + routing decision)",
          "## Route by meaning, not by keywords" in obody
          and all(f"**Step {x}" in obody for x in "ABCDE")
          and "`## Routing decision`" in obody)
    books = parse_playbooks(obody)
    names_in_books = {a for _, _, c, ad in books for a in c + ad}
    check("T40 problem playbooks parsed (>= 12) and name only real agents",
          len(books) >= 12 and names_in_books <= set(agents),
          f"{len(books)} rows; unknown {names_in_books - set(agents)}")
    area_sect = obody.split("**Step C:", 1)[-1].split("**Step D:", 1)[0]
    area_agents = set(re.findall(r"`([a-z0-9\-]+)`", area_sect))
    check("T41 eight-area check covers every specialist with real names",
          area_agents == set(specialists), f"missing {set(specialists) - area_agents}")
    for phrase in routing_cases.STAFFING_PHRASES:
        prim, _ = route(phrase, rows, books)
        ok, missing = routing_cases.passes(prim, [{a} for a in routing_cases.STAFF])
        check(f"T42 staffing paraphrase routes to talent/ops/employment-law: {phrase}", ok,
              f"missing {missing}; got {sorted(prim)}")
    for case in routing_cases.CASES:
        prim, _ = route(case["prompt"], rows, books)
        ok, missing = routing_cases.passes(prim, case["required"])
        check(f"T43 guide example without expert names routes correctly: {case['id']}", ok,
              f"missing {missing}; got {sorted(prim)}")

    bmeta, bbody = agents.get("agent-builder", ({}, ""))
    btools = set(split_tools(bmeta.get("tools", "")))
    check("T34 agent-builder can write files and run tests", {"Write", "Edit", "Bash"} <= btools)
    check("T35 agent-builder references the validator", "scripts/validate_team.py" in bbody)

    # ---------------------------------------------------------- CLAUDE.md
    cpath = os.path.join(ROOT, "CLAUDE.md")
    ctext = open(cpath, encoding="utf-8").read() if os.path.exists(cpath) else ""
    for heading in ["## Purpose", "## How the 26 agents are organized", "## How shared skills are used",
                    "## Ask one expert", "## Ask the whole team", "## Add a new agent or skill"]:
        check(f"T36 CLAUDE.md has '{heading}'", heading in ctext)
    missing = [n for n in agents if f"`{n}`" not in ctext]
    check("T37 CLAUDE.md lists all 26 agents", not missing, f"missing {missing}")
    missing = [d for d in skills if f"`{d}`" not in ctext]
    check("T38 CLAUDE.md lists all 24 skills", not missing, f"missing {missing}")

    # ---------------------------------------------------------- report
    failed = [r for r in results if not r[1]]
    for name, ok, detail in results:
        if not ok:
            print(f"FAIL {name} {detail}")
    groups = sorted({r[0].split()[0] for r in results})
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed "
          f"across {len(groups)} test groups (T01-T43).")
    print(f"Agents: {len(agents)} ({len(specialists)} specialists + "
          f"{len(META_AGENTS & set(agents))} meta). Skills: {len(skills)}. "
          f"Routing cases: {len(ROUTING_CASES)} keyword + {len(routing_cases.STAFFING_PHRASES)} paraphrase "
          f"+ {len(routing_cases.CASES)} guide/no-names.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
