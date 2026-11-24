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


def assigned_models():
    """Model family assigned in each agent file's frontmatter (opus/sonnet/haiku)."""
    out = {}
    adir = os.path.join(ROOT, ".claude", "agents")
    for fn in os.listdir(adir):
        for line in open(os.path.join(adir, fn), encoding="utf-8"):
            if line.startswith("model:"):
                out[fn[:-3]] = line.split(":", 1)[1].strip()
                break
    return out


def run_case(case, attempts=2):
    """Run one case; retry once if the CLI returns no answer (e.g. a transient API error)."""
    for attempt in range(1, attempts + 1):
        out = _run_once(case)
        out["attempts"] = attempt
        if out["has_result"]:
            return out
    return out


def _run_once(case):
    cmd = ["claude", "-p", "--agent", "orchestrator", "--output-format", "stream-json", "--verbose",
           "--allowedTools", "Agent,Read,Grep,Glob,Skill",
           "--disallowedTools", "WebSearch,WebFetch",
           "--max-turns", "40", case["prompt"] + HARNESS_NOTE]
    proc = subprocess.run(cmd, cwd=ROOT, stdin=subprocess.DEVNULL, capture_output=True,
                          text=True, timeout=1800)
    called, results, errors = [], [], []
    tool_to_agent, models = {}, {}
    for line in proc.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "assistant":
            for c in ev["message"].get("content", []):
                if c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                    called.append(c["input"].get("subagent_type"))
                    tool_to_agent[c.get("id")] = c["input"].get("subagent_type")
            parent = ev.get("parent_tool_use_id")
            if parent and parent in tool_to_agent and ev["message"].get("model"):
                models.setdefault(tool_to_agent[parent], set()).add(ev["message"]["model"])
        if ev.get("type") == "result":
            # A run can emit more than one result event (for example, a late
            # background subagent triggers a short follow-up turn); keep them all.
            results.append(ev.get("result", "") or "")
            errors.append(bool(ev.get("is_error")))
    result = "\n\n".join(results)
    is_error = any(errors) or not results
    ok_route, missing = routing_cases.passes(called, case["required"])
    expected_models = assigned_models()
    model_mismatch = {a: sorted(m) for a, m in models.items()
                      if a in expected_models and not all(expected_models[a] in x for x in m)}
    checks = {
        "required experts selected": ok_route,
        "routing decision shown": "routing decision" in result.lower(),
        "combined recommendation": "recommendation" in result.lower(),
        "disagreements addressed": "disagree" in result.lower(),
        "evidence labels used": any(l in result for l in ("[CONFIRMED]", "[REPORTED]", "[ESTIMATE]")),
        "run completed without error": proc.returncode == 0 and not is_error,
        "experts ran on their assigned models": not model_mismatch,
    }
    return {"case": case, "called": called, "missing": missing, "checks": checks, "result": result,
            "has_result": bool(results), "models": {a: sorted(m) for a, m in models.items()},
            "model_mismatch": model_mismatch, "stderr": proc.stderr[-1500:], "returncode": proc.returncode}


def short(model_ids):
    """'claude-opus-5-5' -> 'opus'; unknown -> '?'."""
    if not model_ids:
        return "?"
    fams = sorted({f for m in model_ids for f in ("opus", "sonnet", "haiku", "fable") if f in m})
    return "/".join(fams) or ",".join(model_ids)


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
    with ThreadPoolExecutor(max_workers=min(3, len(cases))) as pool:
        outcomes = list(pool.map(run_case, cases))

    passed = 0
    lines = ["# Orchestrator Routing Test Results", "",
             f"- **Run date:** {datetime.date.today().isoformat()}",
             "- **What was tested:** each prompt was sent to `orchestrator` **without naming any experts**. "
             "The four guide examples come from `docs/how-to-talk-to-your-experts.md` with their "
             "\"Experts to involve\" and \"Order\" lines removed. A fifth prompt describes a staffing problem "
             "without the word \"barista\".",
             "- **How:** `python3 scripts/live_routing_test.py` (Claude Code CLI, `--agent orchestrator`). "
             "\"Experts called\" lists the specialist subagents the orchestrator actually launched, "
             "with the model each one actually ran on (checked against its `model:` field).",
             "- **Pass rule:** at least one expert from every required group was called, and the answer shows "
             "a routing decision, a combined recommendation, disagreements, and evidence labels.", "",
             "| Case | Result | Experts called | Required groups missing |", "|---|---|---|---|"]
    for o in outcomes:
        ok = all(o["checks"].values())
        passed += ok
        uniq = list(dict.fromkeys(o["called"]))
        experts = ", ".join(f"`{a}` ({short(o['models'].get(a))})" for a in uniq)
        lines.append(f"| {o['case']['title']} | {'PASS' if ok else 'FAIL'} | "
                     f"{len(uniq)}: {experts} | "
                     f"{'none' if not o['missing'] else o['missing']} |")
    lines += ["", f"**{passed}/{len(outcomes)} cases passed.**", ""]
    for o in outcomes:
        lines += [f"## {o['case']['title']}", "", "**Prompt (no experts named):**", "", "```text",
                  o["case"]["prompt"], "```", "", "**Checks:**", ""]
        lines += [f"- {'PASS' if v else 'FAIL'}: {k}" for k, v in o["checks"].items()]
        lines += ["", "**Required groups (at least one from each):**", ""]
        lines += [f"- {' or '.join(f'`{a}`' for a in sorted(grp))}" for grp in o["case"]["required"]]
        if not o["has_result"]:
            lines += ["", f"**Run error** (exit code {o['returncode']}, attempts {o['attempts']}):", "",
                      "```text", o["stderr"].strip() or "(no error output)", "```"]
        exc = routing_excerpt(o["result"])
        if exc:
            lines += ["", "**Orchestrator's routing decision (excerpt):**", ""]
            lines += ["> " + l if l else ">" for l in exc.splitlines()]
        lines.append("")
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    for o in outcomes:
        if not o["has_result"]:
            print(o["case"]["id"], "NO ANSWER; stderr:", o["stderr"][-400:])
        print(o["case"]["id"], "PASS" if all(o["checks"].values()) else "FAIL",
              list(dict.fromkeys(o["called"])), {k: v for k, v in o["checks"].items() if not v})
    print(f"{passed}/{len(outcomes)} cases passed. Report: {os.path.relpath(REPORT, ROOT)}")
    return 0 if passed == len(outcomes) else 1


if __name__ == "__main__":
    sys.exit(main())
