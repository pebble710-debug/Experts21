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
      return "Network problem";
    case "too_long":
      return "Message too long";
    default:
      return "Something went wrong";
  }
}
