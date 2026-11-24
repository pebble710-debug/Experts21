#!/usr/bin/env python3
"""Live orchestrator routing test (uses the Claude Code CLI; consumes model usage).

Runs each case in scripts/routing_cases.py through `claude -p --agent orchestrator`
WITHOUT naming any experts, records which specialist subagents the orchestrator
actually called, and checks:
  1. the required experts were selected (by meaning, not by being named),
  2. the answer shows a Routing decision,
  3. the answer combines findings (Recommendation + Disagreements + evidence labels).

Writes a report to docs/orchestrator-routing-test-results.md.

Usage:  python3 scripts/live_routing_test.py [case-id ...]
"""
import datetime
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import routing_cases  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "docs", "orchestrator-routing-test-results.md")
HARNESS_NOTE = ("\n\n(Test run: keep each expert's brief and answer short, under 200 words, "
                "and use only the docs/ research, no web lookups.)")


def run_case(case):
    cmd = ["claude", "-p", "--agent", "orchestrator", "--output-format", "stream-json", "--verbose",
           "--allowedTools", "Agent,Read,Grep,Glob,Skill",
           "--disallowedTools", "WebSearch,WebFetch",
           "--max-turns", "40", case["prompt"] + HARNESS_NOTE]
    proc = subprocess.run(cmd, cwd=ROOT, stdin=subprocess.DEVNULL, capture_output=True,
                          text=True, timeout=1800)
    called, results, errors = [], [], []
    for line in proc.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "assistant":
            for c in ev["message"].get("content", []):
                if c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                    called.append(c["input"].get("subagent_type"))
        if ev.get("type") == "result":
            # A run can emit more than one result event (for example, a late
            # background subagent triggers a short follow-up turn); keep them all.
            results.append(ev.get("result", "") or "")
            errors.append(bool(ev.get("is_error")))
    result = "\n\n".join(results)
    is_error = any(errors) or not results
    ok_route, missing = routing_cases.passes(called, case["required"])
    checks = {
        "required experts selected": ok_route,
        "routing decision shown": "routing decision" in result.lower(),
        "combined recommendation": "recommendation" in result.lower(),
        "disagreements addressed": "disagree" in result.lower(),
        "evidence labels used": any(l in result for l in ("[CONFIRMED]", "[REPORTED]", "[ESTIMATE]")),
        "run completed without error": proc.returncode == 0 and not is_error,
    }
    return {"case": case, "called": called, "missing": missing, "checks": checks, "result": result}


def routing_excerpt(result):
    low = result.lower()
    i = low.find("routing decision")
    if i == -1:
        return ""
    chunk = result[i:i + 1800]
    end = chunk.find("\n## ", 5)
    return chunk[:end if end > 0 else len(chunk)].strip()


def main():
    wanted = set(sys.argv[1:])
    cases = [c for c in routing_cases.CASES if not wanted or c["id"] in wanted]
    with ThreadPoolExecutor(max_workers=len(cases)) as pool:
        outcomes = list(pool.map(run_case, cases))

    passed = 0
    lines = ["# Orchestrator Routing Test Results", "",
             f"- **Run date:** {datetime.date.today().isoformat()}",
             "- **What was tested:** each prompt was sent to `orchestrator` **without naming any experts**. "
             "The four guide examples come from `docs/how-to-talk-to-your-experts.md` with their "
             "\"Experts to involve\" and \"Order\" lines removed. A fifth prompt describes a staffing problem "
             "without the word \"barista\".",
             "- **How:** `python3 scripts/live_routing_test.py` (Claude Code CLI, `--agent orchestrator`). "
             "\"Experts called\" lists the specialist subagents the orchestrator actually launched.",
             "- **Pass rule:** at least one expert from every required group was called, and the answer shows "
             "a routing decision, a combined recommendation, disagreements, and evidence labels.", "",
             "| Case | Result | Experts called | Required groups missing |", "|---|---|---|---|"]
    for o in outcomes:
        ok = all(o["checks"].values())
        passed += ok
        uniq = list(dict.fromkeys(o["called"]))
        lines.append(f"| {o['case']['title']} | {'PASS' if ok else 'FAIL'} | "
                     f"{len(uniq)}: {', '.join(f'`{a}`' for a in uniq)} | "
                     f"{'none' if not o['missing'] else o['missing']} |")
    lines += ["", f"**{passed}/{len(outcomes)} cases passed.**", ""]
    for o in outcomes:
        lines += [f"## {o['case']['title']}", "", "**Prompt (no experts named):**", "", "```text",
                  o["case"]["prompt"], "```", "", "**Checks:**", ""]
        lines += [f"- {'PASS' if v else 'FAIL'}: {k}" for k, v in o["checks"].items()]
        lines += ["", "**Required groups (at least one from each):**", ""]
        lines += [f"- {' or '.join(f'`{a}`' for a in sorted(grp))}" for grp in o["case"]["required"]]
        exc = routing_excerpt(o["result"])
        if exc:
            lines += ["", "**Orchestrator's routing decision (excerpt):**", ""]
            lines += ["> " + l if l else ">" for l in exc.splitlines()]
        lines.append("")
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    for o in outcomes:
        print(o["case"]["id"], "PASS" if all(o["checks"].values()) else "FAIL",
              list(dict.fromkeys(o["called"])), {k: v for k, v in o["checks"].items() if not v})
    print(f"{passed}/{len(outcomes)} cases passed. Report: {os.path.relpath(REPORT, ROOT)}")
    return 0 if passed == len(outcomes) else 1


if __name__ == "__main__":
    sys.exit(main())
