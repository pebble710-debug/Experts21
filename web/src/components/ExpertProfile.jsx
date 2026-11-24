import { useState } from "react";
import { Avatar, ModelBadge } from "./common.jsx";

export default function ExpertProfile({ agent }) {
  const [open, setOpen] = useState(false);
  const extraDocs = agent.knowledgeFiles.filter((f) => f !== "README.md");
  return (
    <section className="profile" data-testid="expert-profile">
      <div className="profile-main">
        <Avatar agent={agent} size="lg" />
        <div className="profile-text">
          <h1>
            {agent.firstName} <span className="profile-role">· {agent.title}</span>
          </h1>
          <p className="profile-meta">
            <ModelBadge model={agent.model} /> <span className="muted">{agent.phase}</span>
          </p>
          <p className="profile-persona">{agent.personality}</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide details" : "About"}
        </button>
      </div>
      {open && (
        <dl className="profile-details">
          <dt>Mission</dt>
          <dd>{agent.mission}</dd>
          <dt>Communication style</dt>
          <dd>{agent.communicationStyle}</dd>
          <dt>Working style</dt>
          <dd>{agent.workingStyle}</dd>
          <dt>Why this model</dt>
          <dd>{agent.modelReason}</dd>
          <dt>Knowledge folder</dt>
          <dd>
            <code>{agent.knowledgeFolder}</code>{" "}
            {extraDocs.length ? (
              <span>
                with {extraDocs.length} document{extraDocs.length > 1 ? "s" : ""}:{" "}
                {extraDocs.map((f) => (
                  <code key={f} className="chip">
                    {f}
                  </code>
                ))}
              </span>
            ) : (
              <span className="muted">(README only. Uses the shared research in docs/)</span>
            )}
          </dd>
          <dt>Research</dt>
          <dd>
            {agent.research.map((r) => (
              <code key={r} className="chip">
                {r}
              </code>
            ))}
          </dd>
          {agent.skills.length > 0 && (
            <>
              <dt>Shared skills</dt>
              <dd>
                {agent.skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}
