import { useMemo, useState } from "react";
import { Avatar, ModelBadge } from "./common.jsx";

const PHASE_LABELS = {
  Coordination: "Whole team",
  Meta: "Team maintenance",
};

export default function Sidebar({ phases, agents, selected, onSelect, open, onClose }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      agents.filter(
        (a) =>
          !q ||
          [a.firstName, a.title, a.slug, a.personality, a.phase].some((t) => t.toLowerCase().includes(q)),
      ),
    [agents, q],
  );
  const ava = agents.find((a) => a.isOrchestrator);

  return (
    <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Experts">
      <div className="sidebar-head">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">☕</span>
          <div>
            <div className="brand-name">Experts21</div>
            <div className="brand-sub">Miami specialty coffee team</div>
          </div>
        </div>
        <button type="button" className="icon-btn only-mobile" onClick={onClose} aria-label="Close expert list">
          ✕
        </button>
      </div>

      <button
        type="button"
        className={`team-btn ${selected === ava.slug ? "is-active" : ""}`}
        onClick={() => onSelect(ava.slug)}
      >
        <span className="team-btn-title">Ask the Whole Team</span>
        <span className="team-btn-sub">
          {ava.firstName} routes your question to the right specialists and combines their answers
        </span>
      </button>

      <label className="search">
        <span className="visually-hidden">Search experts</span>
        <input
          type="search"
          placeholder="Search by name, role, or topic"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <nav className="expert-groups" data-testid="expert-list">
        {phases.map((phase) => {
          const group = visible.filter((a) => a.phase === phase);
          if (!group.length) return null;
          return (
            <section key={phase} className="group">
              <h2 className="group-title">{PHASE_LABELS[phase] ?? phase.replace(/^\d+\.\s*/, "")}</h2>
              <ul>
                {group.map((a) => (
                  <li key={a.slug}>
                    <button
                      type="button"
                      className={`expert-row ${selected === a.slug ? "is-active" : ""}`}
                      onClick={() => onSelect(a.slug)}
                      data-testid={`expert-${a.slug}`}
                      title={a.personality}
                    >
                      <Avatar agent={a} size="sm" />
                      <span className="expert-row-text">
                        <span className="expert-row-top">
                          <span className="expert-name">{a.firstName}</span>
                          <ModelBadge model={a.model} />
                        </span>
                        <span className="expert-role">{a.title}</span>
                        <span className="expert-persona">{a.personality}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!visible.length && <p className="muted pad">No experts match “{query}”.</p>}
      </nav>
    </aside>
  );
}
