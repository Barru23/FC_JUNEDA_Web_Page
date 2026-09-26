"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Crest } from "@/components/Crest";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_token");
    fetch("/api/admin/session", { cache: "no-store" })
      .then(res => setAuthenticated(res.ok))
      .catch(() => setError("No s'ha pogut comprovar la sessió"))
      .finally(() => setChecking(false));
    const expired = () => { setAuthenticated(false); setError("La sessió ha caducat. Torna a entrar."); };
    window.addEventListener("admin-session-expired", expired);
    return () => window.removeEventListener("admin-session-expired", expired);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        setPassword("");
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "No s'ha pogut iniciar sessió");
      }
    } catch {
      setError("No s'ha pogut connectar. Torna-ho a provar.");
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
            <Crest className="mx-auto mb-4 h-24 w-[65px] drop-shadow-[0_0_28px_rgba(225,6,0,0.6)]" />
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
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
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

  return <>
    <div className="bg-carbon px-6 py-2 text-right">
      <button className="text-xs text-white/60 hover:text-white" onClick={async () => {
        const res = await fetch("/api/admin/session", { method: "DELETE" });
        if (res.ok) { setAuthenticated(false); setError(null); }
        else setError("No s'ha pogut tancar la sessió. Torna-ho a provar.");
      }}>Tancar sessió</button>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
    {children}
  </>;
}
