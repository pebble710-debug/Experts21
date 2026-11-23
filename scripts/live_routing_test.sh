#!/usr/bin/env bash
# Live orchestrator routing test (uses the Claude Code CLI and consumes model usage).
# Runs one multi-expert question through the orchestrator and checks which
# specialist subagents it actually called.
#
# Usage: bash scripts/live_routing_test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mktemp)"

claude -p --agent orchestrator --output-format stream-json --verbose \
  --allowedTools "Agent,Read,Grep,Glob,Skill" --disallowedTools "WebSearch,WebFetch" \
  --max-turns 30 \
  "We found a 1,200 sq ft second-generation space in Wynwood at \$95/sq ft NNN with no grease trap. Should we sign the lease? Keep each expert brief short (under 250 words) and use only the docs/ research, no web lookups." \
  < /dev/null > "$OUT"

python3 - "$OUT" <<'EOF'
import json, sys
expected = {"lease-negotiation-specialist", "site-selection-real-estate-specialist",
            "environmental-utility-compliance-specialist"}
called, result = [], ""
for line in open(sys.argv[1]):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "assistant":
        for c in ev["message"].get("content", []):
            if c.get("type") == "tool_use" and c["name"] in ("Agent", "Task"):
                called.append(c["input"].get("subagent_type"))
    if ev.get("type") == "result":
        result = ev.get("result", "")
print("Subagents called:", called)
checks = {
    "expected experts consulted": expected <= set(called),
    "combined recommendation present": "Recommendation" in result,
    "disagreements section present": "Disagreement" in result,
    "evidence labels used": any(l in result for l in ("[CONFIRMED]", "[ESTIMATE]", "[REPORTED]")),
}
for k, v in checks.items():
    print(("PASS " if v else "FAIL ") + k)
sys.exit(0 if all(checks.values()) else 1)
EOF
