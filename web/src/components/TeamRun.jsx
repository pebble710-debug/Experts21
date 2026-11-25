import { useState } from "react";
import { Avatar, ErrorNote, Markdown, ModelBadge, Progress } from "./common.jsx";

const STAGES = [
  ["routing", "Routing"],
  ["experts", "Experts answering"],
  ["synthesizing", "Combining"],
  ["done", "Done"],
];

const STAGE_LABEL = {
  queued: "Starting the team…",
  routing: "Ava is reading your question and choosing the right specialists…",
  experts: "Specialists are answering in parallel…",
  synthesizing: "Ava is combining the answers…",
};

function Stepper({ stage, failed }) {
  const idx = Math.max(0, STAGES.findIndex(([s]) => s === (stage === "queued" ? "routing" : stage)));
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
          <p className="small muted">Model: {slot.servedModel || slot.modelId}</p>
          {slot.text ? <Markdown>{slot.text}</Markdown> : <p className="muted">No answer yet.</p>}
          {slot.truncated && <p className="note">This answer reached the length limit and was cut off.</p>}
          {slot.error && <p className="note">Not included in the combined answer: {slot.error.message}</p>}
        </div>
      )}
    </div>
  );
}

export default function TeamRun({ run, ava, agentsBySlug, onRetry }) {
  const s = run.view; // job status from GET /api/jobs/:id
  const plan = s?.plan;
  const done = s?.status === "done";
  const contributors = plan && s.experts ? plan.experts.filter((e) => s.experts[e.agent]?.status === "done") : [];
  const working = !run.error && !done;
  const answered = plan && s.experts ? plan.experts.filter((e) => ["done", "failed"].includes(s.experts[e.agent]?.status)).length : 0;
  const label =
    s?.stage === "experts" && plan
      ? `${STAGE_LABEL.experts} (${answered} of ${plan.experts.length} finished)`
      : STAGE_LABEL[s?.stage ?? "queued"] ?? "Working…";
  return (
    <div className="team-run" data-testid="team-run">
      <div className="team-run-head">
        <Avatar agent={ava} size="sm" />
        <div>
          <strong>{ava.firstName}</strong> <ModelBadge model={ava.model} />{" "}
          <span className="muted small">orchestrator</span>
        </div>
      </div>
      <Stepper stage={s?.stage ?? "queued"} failed={Boolean(run.error)} />
      <Progress label={label} since={run.startedAt} active={working} connection={run.connection} />

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

      {s?.final && (
        <div className="final" data-testid="final-answer">
          <h3>Combined recommendation</h3>
          {s.final.text ? <Markdown>{s.final.text}</Markdown> : <p className="muted">{ava.firstName} is combining the answers…</p>}
          {s.final.truncated && <p className="note">This answer reached the length limit and was cut off.</p>}
          {s.final.refusal && <p className="note">{s.final.refusal}</p>}
        </div>
      )}

      {contributors.length > 0 && done && (
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
