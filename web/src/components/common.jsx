import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }) {
  // react-markdown does not render raw HTML by default, so model output can't inject markup.
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ""}</ReactMarkdown>
    </div>
  );
}

export function ModelBadge({ model }) {
  return (
    <span className={`badge badge-${model}`} title={`Claude ${model[0].toUpperCase()}${model.slice(1)}`}>
      {model}
    </span>
  );
}

export function Avatar({ agent, size = "md" }) {
  return (
    <span className={`avatar avatar-${size} tone-${agent.color}`} aria-hidden="true">
      {agent.firstName.slice(0, 1)}
    </span>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-note" role="alert">
      <strong>{errorTitle(error.code)}</strong>
      <span>{error.message}</span>
      {error.code && <code className="error-code">{error.code}</code>}
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function errorTitle(code) {
  switch (code) {
    case "missing_api_key":
      return "API key not configured";
    case "invalid_api_key":
      return "API key rejected";
    case "unauthorized":
      return "Password required";
    case "rate_limited":
    case "anthropic_rate_limited":
      return "Rate limit reached";
    case "network_error":
    case "connection_lost":
      return "Connection problem";
    case "job_stalled":
    case "job_not_started":
    case "worker_not_started":
      return "The experts could not finish";
    case "job_deadline":
    case "job_timeout":
      return "Took too long";
    case "too_long":
      return "Message too long";
    default:
      return "Something went wrong";
  }
}

/** Seconds since `since`, updating every second while `active`. */
export function useElapsed(since, active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return since ? Math.max(0, Math.round((now - since) / 1000)) : 0;
}

export const formatElapsed = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** One-line progress indicator: what is happening, elapsed time, connection state. */
export function Progress({ label, since, active, connection }) {
  const secs = useElapsed(since, active);
  if (!active) return null;
  return (
    <p className="progress" role="status" data-testid="progress">
      <span className="typing" aria-hidden="true">●●●</span> {label}
      <span className="muted small"> · {formatElapsed(secs)}</span>
      {connection === "retrying" && <span className="note inline"> Reconnecting…</span>}
    </p>
  );
}
