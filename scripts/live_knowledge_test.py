#!/usr/bin/env python3
"""Live knowledge-folder and persona test (uses the Claude Code CLI; consumes model usage).

Case 1 (README-only folder): runs `competitive-intelligence-analyst` (Diego, haiku)
  and checks it uses docs/ and says no additional documents were provided.
Case 2 (folder with a document): temporarily adds a clearly marked TEST document to
  knowledge/lease-negotiation-specialist/, runs that agent (Marcus, opus), checks it
  cites the document, then deletes the document.

Both cases also check the persona introduction and the model actually used.
Writes docs/knowledge-folder-test-results.md.

Usage: python3 scripts/live_knowledge_test.py
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

CASES = [
    {"id": "readme-only-folder", "agent": "competitive-intelligence-analyst", "name": "Diego",
     "model": "haiku",
     "prompt": "In under 200 words: which competitor types should we watch near a Brickell site? "
               "Use only the docs/ research, no web lookups.",
     "must_contain": ["No additional documents have been provided"]},
    {"id": "folder-with-document", "agent": "lease-negotiation-specialist", "name": "Marcus",
     "model": "opus",
     "prompt": "In under 250 words: review the LOI in your knowledge folder. Should we sign it as written, "
               "and what are the top three changes to ask for? Use only local files, no web lookups.",
     "must_contain": ["TEST-2026-11-24-sample-loi-coral-way", "58"]},
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
        "introduces itself by first name": case["name"] in result,
        "expected content present": all(m in result for m in case["must_contain"]),
        f"ran on assigned model ({case['model']})": bool(models) and all(case["model"] in m for m in models),
        "evidence labels used": any(l in result for l in ("[CONFIRMED]", "[REPORTED]", "[ESTIMATE]", "[UNVERIFIED]")),
    }
    return {"case": case, "checks": checks, "models": sorted(models), "result": result,
            "stderr": proc.stderr[-800:]}


def main():
    outcomes = []
    # case 1: folder has only README.md
    outcomes.append(run(CASES[0]))
    # case 2: add a temporary test document, always remove it afterwards
    try:
        with open(TEST_DOC, "w", encoding="utf-8") as f:
            f.write(TEST_DOC_TEXT)
        outcomes.append(run(CASES[1]))
    finally:
        if os.path.exists(TEST_DOC):
            os.remove(TEST_DOC)

    passed = sum(all(o["checks"].values()) for o in outcomes)
    L = ["# Knowledge Folder & Persona Test Results", "",
         f"- **Run date:** {datetime.date.today().isoformat()}",
         "- **How:** `python3 scripts/live_knowledge_test.py` runs each agent directly (`claude -p --agent <name>`).",
         "- **Case 1:** the agent's folder contains only `README.md`. Expect the agent to use `docs/` and say no additional documents were provided.",
         "- **Case 2:** a temporary, clearly marked TEST LOI is placed in the folder. Expect the agent to read it and cite it. The file is deleted after the run.", "",
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
