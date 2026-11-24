#!/usr/bin/env python3
"""Live knowledge-folder and persona test (uses the Claude Code CLI; consumes model usage).

Case 1 (README-only folder): runs `competitive-intelligence-analyst` (Diego, haiku)
  and checks it uses docs/ and says no additional documents were provided.
Case 3 (committed document, no filename given): asks Marcus about "the Brickell lease
  offer" without naming the file or its location; checks he finds and reads
  knowledge/lease-negotiation-specialist/sample-brickell-lease.md and cites it and docs/.
Case 2 (folder with a document): temporarily adds a clearly marked TEST document to
  knowledge/lease-negotiation-specialist/, runs that agent (Marcus, opus), checks it
  cites the document, then deletes the document.

Both cases also check the persona introduction and the model actually used.
Writes docs/knowledge-folder-test-results.md.

Usage: python3 scripts/live_knowledge_test.py [case-id ...]
"""
import datetime
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "docs", "knowledge-folder-test-results.md")
TEST_DOC = os.path.join(ROOT, "knowledge", "lease-negotiation-specialist",
                        "TEST-2026-11-24-sample-loi-coral-way.md")
TEST_DOC_TEXT = """# TEST DOCUMENT (temporary, created by scripts/live_knowledge_test.py)

- Source: sample landlord LOI for testing (not a real offer)
- Date: 2026-11-24
- Status: draft

Premises: 1,100 sq ft, 2nd-generation café, Coral Way, Miami.
Base rent: $58/sq ft NNN. Estimated NNN: $21/sq ft. Term: 7 years.
Tenant improvement allowance: $0. Free rent: none.
Personal guarantee: unlimited, full term. Permit contingency: none.
"""

DISCOVERY_DOC = os.path.join(ROOT, "knowledge", "lease-negotiation-specialist", "sample-brickell-lease.md")

CASES = [
    {"id": "readme-only-folder", "agent": "competitive-intelligence-analyst", "name": "Diego",
     "model": "haiku",
     "prompt": "In under 200 words: which competitor types should we watch near a Brickell site? "
               "Use only the docs/ research, no web lookups.",
     # meaning-based: the agent must say the folder had no extra documents (any of these wordings)
     "must_contain_any": ["no additional documents", "contains only readme", "only readme.md",
                          "only the readme", "no documents have been provided"]},
    {"id": "folder-with-document", "agent": "lease-negotiation-specialist", "name": "Marcus",
     "model": "opus",
     "prompt": "In under 250 words: review the LOI in your knowledge folder. Should we sign it as written, "
               "and what are the top three changes to ask for? Use only local files, no web lookups.",
     "must_contain": ["TEST-2026-11-24-sample-loi-coral-way", "58"]},
    # Case 3: a document the owner committed. The prompt gives NO filename or location;
    # the agent must find it by checking its own knowledge folder.
    {"id": "finds-committed-document", "agent": "lease-negotiation-specialist", "name": "Marcus",
     "model": "opus",
     "prompt": "Briefly, in under 250 words: what are the top three risks in the Brickell lease offer "
               "we're considering? Use only local files, no web lookups.",
     "must_contain": ["sample-brickell-lease.md", "docs/0"],
     "must_read": "knowledge/lease-negotiation-specialist/sample-brickell-lease.md",
     "requires_file": DISCOVERY_DOC},
]


def run(case):
    cmd = ["claude", "-p", "--agent", case["agent"], "--output-format", "stream-json", "--verbose",
           "--allowedTools", "Read,Grep,Glob,Skill", "--disallowedTools", "WebSearch,WebFetch",
           "--max-turns", "20", case["prompt"]]
    proc = subprocess.run(cmd, cwd=ROOT, stdin=subprocess.DEVNULL, capture_output=True,
                          text=True, timeout=1200)
    models, results, read_paths = set(), [], []
    for line in proc.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "assistant":
            if ev["message"].get("model"):
                models.add(ev["message"]["model"])
            for c in ev["message"].get("content", []):
                if c.get("type") == "tool_use":
                    read_paths.append(json.dumps(c.get("input", {})))
        if ev.get("type") == "result":
            results.append(ev.get("result", "") or "")
    result = "\n\n".join(results)
    folder = f"knowledge/{case['agent']}"
    checks = {
        "agent opened its knowledge folder": any(folder in p for p in read_paths),
        "read the expected document": (not case.get("must_read")
                                       or any(case["must_read"] in p for p in read_paths)),
        "introduces itself by first name": case["name"] in result,
        "expected content present": (all(m in result for m in case.get("must_contain", []))
                                     and (not case.get("must_contain_any")
                                          or any(m in result.lower() for m in case["must_contain_any"]))),
        f"ran on assigned model ({case['model']})": bool(models) and all(case["model"] in m for m in models),
        "evidence labels used": any(l in result for l in ("[CONFIRMED]", "[REPORTED]", "[ESTIMATE]", "[UNVERIFIED]")),
    }
    return {"case": case, "checks": checks, "models": sorted(models), "result": result,
            "stderr": proc.stderr[-800:]}


def main():
    wanted = set(sys.argv[1:])
    selected = [c for c in CASES if not wanted or c["id"] in wanted]
    outcomes = []
    for case in selected:
        if case["id"] == "folder-with-document":
            # add a temporary test document, always remove it afterwards
            try:
                with open(TEST_DOC, "w", encoding="utf-8") as f:
                    f.write(TEST_DOC_TEXT)
                outcomes.append(run(case))
            finally:
                if os.path.exists(TEST_DOC):
                    os.remove(TEST_DOC)
        elif case.get("requires_file") and not os.path.exists(case["requires_file"]):
            print(case["id"], "SKIPPED: missing", os.path.relpath(case["requires_file"], ROOT))
        else:
            outcomes.append(run(case))

    passed = sum(all(o["checks"].values()) for o in outcomes)
    L = ["# Knowledge Folder & Persona Test Results", "",
         f"- **Run date:** {datetime.date.today().isoformat()}",
         "- **How:** `python3 scripts/live_knowledge_test.py` runs each agent directly (`claude -p --agent <name>`).",
         "- **Case 1:** the agent's folder contains only `README.md`. Expect the agent to use `docs/` and say no additional documents were provided.",
         "- **Case 2:** a temporary, clearly marked TEST LOI is placed in the folder. Expect the agent to read it and cite it. The file is deleted after the run.",
         "- **Case 3:** the owner's committed `sample-brickell-lease.md` is in the folder. The question does **not** give the file name or location. Expect the agent to find it by checking its folder, read it, and cite it along with `docs/` research.", "",
         "| Case | Agent | Result | Model actually used |", "|---|---|---|---|"]
    for o in outcomes:
        c = o["case"]
        L.append(f"| {c['id']} | `{c['agent']}` ({c['name']}) | {'PASS' if all(o['checks'].values()) else 'FAIL'} | "
                 f"{', '.join(o['models']) or '?'} |")
    L += ["", f"**{passed}/{len(outcomes)} cases passed.**", ""]
    for o in outcomes:
        L += [f"## {o['case']['id']}", "", "**Checks:**", ""]
        L += [f"- {'PASS' if v else 'FAIL'}: {k}" for k, v in o["checks"].items()]
        L += ["", "**Answer (first 1,500 characters):**", ""]
        L += ["> " + l if l else ">" for l in o["result"][:1500].splitlines()]
        L.append("")
    open(REPORT, "w", encoding="utf-8").write("\n".join(L))
    for o in outcomes:
        print(o["case"]["id"], "PASS" if all(o["checks"].values()) else "FAIL", o["models"],
              {k: v for k, v in o["checks"].items() if not v})
    print(f"{passed}/{len(outcomes)} passed. Report: {os.path.relpath(REPORT, ROOT)}")
    return 0 if passed == len(outcomes) else 1


if __name__ == "__main__":
    sys.exit(main())
