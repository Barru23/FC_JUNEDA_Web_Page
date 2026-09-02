"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_auth");
    if (stored === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        sessionStorage.setItem("admin_auth", "true");
        sessionStorage.setItem("admin_token", password.trim());
        setAuthenticated(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-carbon">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-carbon px-4">
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
          <div className="h-[30vh] w-[30vh] rounded-full bg-brand/10 blur-[100px]" />
        </div>
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Shield size={28} className="text-brand" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white">Panell d&apos;Admin</h1>
            <p className="mt-1 text-sm text-white/40">Club Futbol Juneda</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasenya d&apos;administrador"
              autoFocus
              className={`w-full rounded-xl border px-5 py-4 text-sm bg-black/40 text-white outline-none focus:border-brand transition-colors ${
                error ? "border-red-500/50" : "border-white/10"
              }`}
            />
            {error && <p className="text-xs text-red-400">Contrasenya incorrecta. Prova amb &apos;admin&apos;.</p>}
            <button
              type="submit"
              disabled={!password || loading}
              className="w-full rounded-xl bg-brand py-4 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verificant...</> : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
