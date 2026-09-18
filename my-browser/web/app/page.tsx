"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  async function startDesktop() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/browser", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start desktop");
      }
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start desktop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>MY DESKTOP</h1>

      <button onClick={startDesktop} disabled={loading}>
        {loading ? "Starting..." : "🚀 Start Desktop"}
      </button>

      {error && <p className="status error">{error}</p>}
      {!error && url && <p className="status">Connected to remote Linux desktop</p>}

      <div className="screen">
        {url ? (
          <iframe
            src={url}
            title="Remote desktop"
            allow="fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
          />
        ) : (
          <div className="screen-placeholder">Start the desktop to see it here</div>
        )}
      </div>
    </main>
  );
}
