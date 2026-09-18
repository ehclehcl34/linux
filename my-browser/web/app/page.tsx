"use client";

import { useState } from "react";

type SessionType = "chromium" | "desktop";

const LABELS: Record<SessionType, string> = {
  chromium: "Chromium",
  desktop: "Linux Desktop (XFCE)",
};

export default function Home() {
  const [type, setType] = useState<SessionType>("chromium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ url: string; type: SessionType } | null>(null);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start session");
      }
      setSession({ url: data.url, type: data.type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>MY BROWSER</h1>

      <label htmlFor="type-select">Environment</label>
      <select
        id="type-select"
        value={type}
        onChange={(e) => setType(e.target.value as SessionType)}
        disabled={loading}
      >
        {(Object.keys(LABELS) as SessionType[]).map((key) => (
          <option key={key} value={key}>
            {LABELS[key]}
          </option>
        ))}
      </select>

      <button onClick={startSession} disabled={loading}>
        {loading ? "Starting..." : `🚀 Start ${LABELS[type]}`}
      </button>

      {error && <p className="status error">{error}</p>}
      {!error && session && <p className="status">Connected to remote {LABELS[session.type]}</p>}

      <div className="screen">
        {session ? (
          <iframe
            key={session.url + session.type}
            src={session.url}
            title={`Remote ${LABELS[session.type]}`}
            allow="fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
          />
        ) : (
          <div className="screen-placeholder">Start a session to see it here</div>
        )}
      </div>
    </main>
  );
}
