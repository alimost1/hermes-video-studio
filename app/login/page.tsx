"use client";
import { useState } from "react";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const token = new FormData(e.currentTarget).get("token");
            const r = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            window.location.href = "/";
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="brand">
          <span className="brand-icon">◈</span> hermes
          <span className="brand-light">studio</span>
        </div>
        <p className="eyebrow">YOUR PRIVATE CREATIVE SPACE</p>
        <h1>
          Welcome to
          <br />
          your studio.
        </h1>
        <p>Enter the access token configured on your server.</p>
        <label htmlFor="token">Studio access token</label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="current-password"
        />
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Enter studio →"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <small>Your API keys stay on the server.</small>
      </form>
    </main>
  );
}
