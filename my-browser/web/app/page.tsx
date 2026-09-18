"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  async function startBrowser() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/browser", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start browser");
      }
      setBrowserUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start browser");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>MY BROWSER</h1>

      <label htmlFor="browser-select">Browser</label>
      <select id="browser-select" disabled defaultValue="chromium">
        <option value="chromium">Chromium</option>
      </select>

      <label htmlFor="url-input">URL</label>
      <input id="url-input" type="text" defaultValue="https://google.com" disabled />

      <button onClick={startBrowser} disabled={loading}>
        {loading ? "Starting..." : "🚀 Start Browser"}
      </button>

      {error && <p className="status error">{error}</p>}
      {!error && browserUrl && <p className="status">Connected to remote Chromium</p>}

      <div className="screen">
        {browserUrl ? (
          <iframe
            src={browserUrl}
            title="Remote browser"
            allow="fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
          />
        ) : (
          <div className="screen-placeholder">Start a browser to see it here</div>
        )}
      </div>
    </main>
  );
}
