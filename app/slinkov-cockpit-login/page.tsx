"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function CockpitLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Неверный email или пароль.");
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next?.startsWith("/oauth/authorize?") ? next : "/documents";
    window.location.assign(safeNext);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Media OS Cockpit</h1>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        {error && <p className="login-error">{error}</p>}
        <Link href="/" className="login-back">
          ← На главную
        </Link>
      </div>
    </div>
  );
}
