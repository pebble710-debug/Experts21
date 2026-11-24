import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import data from "./generated/experts.json";
import { ApiError, getConfig, getPassword, runTeam, setPassword, streamRequest } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import ExpertProfile from "./components/ExpertProfile.jsx";
import PasswordGate from "./components/PasswordGate.jsx";
import { Composer, ExpertChat, TeamChat } from "./components/Chat.jsx";
import { ErrorNote } from "./components/common.jsx";

const agentsBySlug = new Map(data.agents.map((a) => [a.slug, a]));
const ava = data.agents.find((a) => a.isOrchestrator);
const toError = (err) =>
  err instanceof ApiError ? { code: err.code, message: err.message } : { code: "unknown", message: err?.message || String(err) };

export default function App() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [password, setPw] = useState(getPassword());
  const [locked, setLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [selected, setSelected] = useState(ava.slug);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState({}); // slug -> messages
  const [runs, setRuns] = useState([]); // whole-team runs
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    getConfig()
      .then((c) => {
        setConfig(c);
        if (c.passwordRequired && !getPassword()) setLocked(true);
      })
      .catch((err) => setConfigError(toError(err)));
  }, []);

  const agent = agentsBySlug.get(selected);
  const isTeam = agent.isOrchestrator;
  const maxChars = config?.limits?.maxQuestionChars ?? 2000;

  const handleAuthError = useCallback((err) => {
    if (err instanceof ApiError && err.code === "unauthorized") {
      setPassword("");
      setPw("");
      setLockMessage(err.message);
      setLocked(true);
    }
  }, []);

  const updateChat = (slug, fn) => setChats((c) => ({ ...c, [slug]: fn(c[slug] ?? []) }));

  const askExpert = async (slug, history) => {
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    updateChat(slug, () => [...history, { role: "assistant", content: "", streaming: true }]);
    const patchLast = (patch) =>
      updateChat(slug, (msgs) => {
        const copy = [...msgs];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, ...(typeof patch === "function" ? patch(last) : patch) };
        return copy;
      });
    try {
      await streamRequest(
        "/api/expert",
        { agent: slug, messages: history.map(({ role, content }) => ({ role, content })) },
        {
          password,
          signal: controller.signal,
          onEvent: (ev) => {
            if (ev.type === "meta") patchLast({ meta: ev });
            if (ev.type === "delta") patchLast((m) => ({ content: m.content + ev.text }));
            if (ev.type === "refusal") patchLast({ refusal: ev.message });
            if (ev.type === "done") patchLast((m) => ({ meta: { ...m.meta, model: ev.model }, truncated: ev.truncated }));
          },
        },
      );
      patchLast({ streaming: false });
    } catch (err) {
      if (err?.name === "AbortError") return;
      handleAuthError(err);
      patchLast({ streaming: false, error: toError(err) });
    } finally {
      setBusy(false);
    }
  };

  const askTeam = async (question, index) => {
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const setRun = (patch) =>
      setRuns((rs) => {
        const copy = [...rs];
        copy[index] = { ...copy[index], ...patch };
        return copy;
      });
    try {
      await runTeam(question, {
        password,
        signal: controller.signal,
        onUpdate: (state) => setRun({ state }),
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      handleAuthError(err);
      setRun({ error: toError(err) });
    } finally {
      setBusy(false);
    }
  };

  const send = (text) => {
    if (isTeam) {
      const index = runs.length;
      setRuns((rs) => [...rs, { question: text, state: null, error: null }]);
      askTeam(text, index);
    } else {
      const history = [...(chats[selected] ?? []).filter((m) => !m.error && !m.streaming), { role: "user", content: text }];
      askExpert(selected, history);
    }
  };

  const retry = () => {
    if (isTeam) {
      const index = runs.length - 1;
      setRuns((rs) => rs.map((r, i) => (i === index ? { ...r, state: null, error: null } : r)));
      askTeam(runs[index].question, index);
    } else {
      const msgs = chats[selected] ?? [];
      const history = msgs.filter((m) => !m.error && !m.streaming && !(m.role === "assistant" && !m.content));
      if (history.length && history[history.length - 1].role === "user") askExpert(selected, history);
    }
  };

  const select = (slug) => {
    if (busy) abortRef.current?.abort();
    setBusy(false);
    setSelected(slug);
    setSidebarOpen(false);
  };

  const unlock = (pw) => {
    setPassword(pw);
    setPw(pw);
    setLocked(false);
    setLockMessage("");
  };

  const banner = useMemo(() => {
    if (configError) {
      return {
        code: configError.code,
        message: `Could not load the server configuration: ${configError.message}`,
      };
    }
    if (config && !config.apiKeyConfigured) {
      return {
        code: "missing_api_key",
        message:
          "The server has no ANTHROPIC_API_KEY, so the experts can't answer yet. Add it in Netlify: Site configuration > Environment variables, then redeploy.",
      };
    }
    return null;
  }, [config, configError]);

  return (
    <div className="app">
      {locked && <PasswordGate onUnlock={unlock} message={lockMessage} />}
      <Sidebar
        phases={data.phases}
        agents={data.agents}
        selected={selected}
        onSelect={select}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="scrim only-mobile" onClick={() => setSidebarOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <button type="button" className="icon-btn only-mobile" onClick={() => setSidebarOpen(true)} aria-label="Open expert list">
            ☰
          </button>
          <span className="topbar-title">{isTeam ? "Ask the Whole Team" : `${agent.firstName} · ${agent.title}`}</span>
          <span className="muted small topbar-count">{data.agents.length} experts</span>
        </header>
        {banner && (
          <div className="banner" data-testid="config-banner">
            <ErrorNote error={banner} />
          </div>
        )}
        <ExpertProfile key={agent.slug} agent={agent} />
        {isTeam ? (
          <TeamChat ava={ava} agentsBySlug={agentsBySlug} runs={runs} busy={busy} onRetry={retry} />
        ) : (
          <ExpertChat agent={agent} messages={chats[selected] ?? []} busy={busy} onRetry={retry} />
        )}
        <Composer
          onSend={send}
          disabled={busy || locked}
          maxChars={maxChars}
          placeholder={isTeam ? "Ask the whole team a question…" : `Ask ${agent.firstName} a question…`}
        />
        <p className="disclaimer">
          AI planning guidance from the research in <code>docs/</code> (2026-11-23). Not legal, tax, or insurance advice.
          Have a licensed professional review before you sign or file.
        </p>
      </main>
    </div>
  );
}
