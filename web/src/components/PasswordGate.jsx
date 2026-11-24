import { useState } from "react";
import { checkPassword } from "../api.js";

export default function PasswordGate({ onUnlock, message }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(message || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setError("");
    try {
      await checkPassword(pw); // validated on the server; the password is never in the app bundle
      onUnlock(pw);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className="gate-card" onSubmit={submit}>
        <div className="brand-mark big" aria-hidden="true">☕</div>
        <h1 id="gate-title">Experts21</h1>
        <p className="muted">This expert team is password-protected. Enter the access password to continue.</p>
        <label htmlFor="app-password" className="visually-hidden">
          Access password
        </label>
        <input
          id="app-password"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Access password"
          data-testid="password-input"
          autoFocus
        />
        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !pw} data-testid="password-submit">
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
