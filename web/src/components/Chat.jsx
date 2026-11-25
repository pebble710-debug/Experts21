import { useEffect, useRef, useState } from "react";
import { Avatar, ErrorNote, Markdown, ModelBadge, Progress } from "./common.jsx";
import TeamRun from "./TeamRun.jsx";

export function Composer({ onSend, disabled, maxChars, placeholder }) {
  const [text, setText] = useState("");
  const tooLong = text.length > maxChars;
  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled || tooLong) return;
    onSend(t);
    setText("");
  };
  return (
    <form className="composer" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="question">
        Your question
      </label>
      <textarea
        id="question"
        data-testid="composer-input"
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
      />
      <div className="composer-bar">
        <span className={`count ${tooLong ? "over" : ""}`}>
          {text.length}/{maxChars}
        </span>
        <span className="muted hint">Enter to send · Shift+Enter for a new line</span>
        <button type="submit" className="btn btn-primary" disabled={disabled || !text.trim() || tooLong} data-testid="send">
          {disabled ? "Working…" : "Send"}
        </button>
      </div>
    </form>
  );
}

function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

export function ExpertChat({ agent, messages, busy, onRetry }) {
  const ref = useAutoScroll(messages);
  return (
    <div className="messages" ref={ref} aria-live="polite" data-testid="messages">
      {!messages.length && (
        <div className="empty">
          <Avatar agent={agent} size="lg" />
          <p>
            Ask <strong>{agent.firstName}</strong> anything about {agent.title.toLowerCase()} for your Miami café.
          </p>
          <p className="muted">
            {agent.firstName} answers from their instructions, shared skills, knowledge folder (
            <code>{agent.knowledgeFolder}</code>), and the project research, and labels each fact [CONFIRMED],
            [REPORTED], [ESTIMATE], or [UNVERIFIED].
          </p>
        </div>
      )}
      {messages.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className="msg msg-user">
            <div className="bubble">{m.content}</div>
          </div>
        ) : (
          <div key={i} className="msg msg-agent" data-testid="agent-message">
            <Avatar agent={agent} size="sm" />
            <div className="bubble">
              <div className="msg-head">
                <strong>{agent.firstName}</strong> <ModelBadge model={agent.model} />
                {m.meta?.model && <span className="muted small"> · {m.meta.model}</span>}
                {m.streaming && <span className="typing" aria-label="typing">●●●</span>}
              </div>
              {m.content && <Markdown>{m.content}</Markdown>}
              <Progress
                label={m.stage === "queued" ? `Starting ${agent.firstName}…` : m.content ? `${agent.firstName} is writing…` : `${agent.firstName} is thinking…`}
                since={m.startedAt}
                active={Boolean(m.streaming)}
                connection={m.connection}
              />
              {m.truncated && <p className="note">This answer reached the length limit and was cut off.</p>}
              {m.refusal && <p className="note">{m.refusal}</p>}
              {m.error && <ErrorNote error={m.error} onRetry={!busy && i === messages.length - 1 ? onRetry : null} />}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function TeamChat({ ava, agentsBySlug, runs, busy, onRetry }) {
  const ref = useAutoScroll(runs);
  return (
    <div className="messages" ref={ref} aria-live="polite" data-testid="messages">
      {!runs.length && (
        <div className="empty">
          <Avatar agent={ava} size="lg" />
          <p>
            <strong>Ask the whole team.</strong> {ava.firstName} reads your question, picks the specialists it really
            needs, asks each of them separately, then combines their answers into one recommendation and shows where
            they disagree.
          </p>
          <p className="muted">Example: “We found a Brickell space at $78/sq ft NNN with no grease trap. Should we sign?”</p>
        </div>
      )}
      {runs.map((r, i) => (
        <div key={i} className="team-turn">
          <div className="msg msg-user">
            <div className="bubble">{r.question}</div>
          </div>
          <TeamRun run={r} ava={ava} agentsBySlug={agentsBySlug} onRetry={!busy && i === runs.length - 1 ? onRetry : null} />
        </div>
      ))}
    </div>
  );
}
