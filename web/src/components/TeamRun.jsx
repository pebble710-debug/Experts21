import { useState } from "react";
import { Avatar, ErrorNote, Markdown, ModelBadge } from "./common.jsx";

const STAGES = [
  ["routing", "Routing"],
  ["experts", "Experts answering"],
  ["synthesizing", "Combining"],
  ["done", "Done"],
];

function Stepper({ stage, failed }) {
  const idx = STAGES.findIndex(([s]) => s === stage);
  return (
    <ol className="stepper" aria-label="Team progress">
      {STAGES.map(([key, label], i) => (
        <li key={key} className={i < idx || stage === "done" ? "is-done" : i === idx ? (failed ? "is-failed" : "is-current") : ""}>
          {label}
        </li>
      ))}
    </ol>
  );
}

function ExpertCard({ agent, slot, reason }) {
  const [open, setOpen] = useState(false);
  const statusText = { waiting: "Waiting", running: "Answering…", done: "Answered", failed: "Failed" }[slot.status];
  return (
    <div className={`expert-card card-${slot.status}`} data-testid={`contribution-${agent.slug}`}>
      <button type="button" className="expert-card-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Avatar agent={agent} size="sm" />
        <span className="expert-card-title">
          <strong>{agent.firstName}</strong> <span className="muted">· {agent.title}</span>
          <span className="small muted block">{reason}</span>
        </span>
        <ModelBadge model={agent.model} />
        <span className={`status status-${slot.status}`}>{statusText}</span>
        <span className="chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="expert-card-body">
          {slot.meta?.modelId && <p className="small muted">Model: {slot.done?.model || slot.meta.modelId}</p>}
          {slot.text ? <Markdown>{slot.text}</Markdown> : <p className="muted">No answer yet.</p>}
          {slot.done?.truncated && <p className="note">This answer reached the length limit and was cut off.</p>}
          {slot.error && <p className="note">Not included in the combined answer: {slot.error}</p>}
        </div>
      )}
    </div>
  );
}

export default function TeamRun({ run, ava, agentsBySlug, onRetry }) {
  const s = run.state;
  const plan = s?.plan;
  const contributors = plan ? plan.experts.filter((e) => s.experts[e.agent]?.status === "done") : [];
  return (
    <div className="team-run" data-testid="team-run">
      <div className="team-run-head">
        <Avatar agent={ava} size="sm" />
        <div>
          <strong>{ava.firstName}</strong> <ModelBadge model={ava.model} />{" "}
          <span className="muted small">orchestrator</span>
        </div>
      </div>
      <Stepper stage={s?.stage ?? "routing"} failed={Boolean(run.error)} />

      {plan && (
        <div className="plan" data-testid="routing-plan">
          <h3>Routing decision</h3>
          {plan.problems.length > 0 && (
            <ul className="problems">
              {plan.problems.map((p, i) => (
                <li key={i}>
                  {p.problem}
                  {p.implied && <span className="tag">implied</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="expert-cards">
            {plan.experts.map((e) => (
              <ExpertCard key={e.agent} agent={agentsBySlug.get(e.agent)} slot={s.experts[e.agent]} reason={e.reason} />
            ))}
          </div>
          {plan.left_out.length > 0 && (
            <details className="left-out">
              <summary>Left out on purpose ({plan.left_out.length})</summary>
              <ul>
                {plan.left_out.map((e) => (
                  <li key={e.agent}>
                    <strong>{agentsBySlug.get(e.agent)?.firstName ?? e.agent}</strong>: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {(s?.final || s?.stage === "synthesizing") && (
        <div className="final" data-testid="final-answer">
          <h3>Combined recommendation</h3>
          {s.final ? <Markdown>{s.final}</Markdown> : <p className="muted">{ava.firstName} is combining the answers…</p>}
          {s.finalMeta?.truncated && <p className="note">This answer reached the length limit and was cut off.</p>}
          {s.refusal && <p className="note">{s.refusal}</p>}
        </div>
      )}

      {contributors.length > 0 && s?.stage === "done" && (
        <div className="contributors" data-testid="contributors">
          <span className="small muted">Contributors:</span>
          {contributors.map((e) => {
            const a = agentsBySlug.get(e.agent);
            return (
              <span key={e.agent} className="contributor">
                <Avatar agent={a} size="xs" /> {a.firstName} <ModelBadge model={a.model} />
              </span>
            );
          })}
          <span className="contributor">
            <Avatar agent={ava} size="xs" /> {ava.firstName} (combined) <ModelBadge model={ava.model} />
          </span>
        </div>
      )}

      {run.error && <ErrorNote error={run.error} onRetry={onRetry} />}
    </div>
  );
}
