"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  ArrowLeft, ExternalLink, FileDown, Calendar, MapPin,
  Utensils, Users, CheckCircle, Clock, RefreshCw, Loader2
} from "lucide-react";
import type { Purchase } from "@/lib/data";
import { Crest } from "@/components/Crest";
import { downloadCsv } from "@/lib/csv";
import { getSheetUrl } from "@/lib/sheets-link";



function authHeaders() {
  return { "Content-Type": "application/json" };
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<{
    id: string;
    title: string;
    date: string;
    location: string;
    menu: string;
    price_eur: number;
    total_spots: number;
    spots_remaining: number;
    sheet_id?: string;
    status: string;
  } | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const h = authHeaders();
    try {
      const [eventsRes, purchasesRes] = await Promise.all([
        fetch("/api/admin/events", { headers: h }),
        fetch(`/api/admin/purchases?event_id=${eventId}`, { headers: h }),
      ]);
      if (eventsRes.status === 401 || purchasesRes.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!eventsRes.ok || !purchasesRes.ok) throw new Error("No s'han pogut carregar els assistents. Torna-ho a provar.");
      if (eventsRes.ok) {
        const allEvents = await eventsRes.json();
        const found = allEvents.find((e: { id: string }) => e.id === eventId);
        if (found) setEvent(found);
      }
      if (purchasesRes.ok) {
        setPurchases(await purchasesRes.json());
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No s'han pogut carregar les dades");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPurchases = purchases.filter((p) => {
    if (dietaryFilter === "all") return true;
    if (dietaryFilter === "intolerances") return p.dietary && p.dietary !== "Cap intolerància";
    return p.dietary === dietaryFilter;
  });

  // La llista de sota ensenya totes les compres, pendents incloses, perque la
  // Junta les vol veure. Els totals, en canvi, nomes poden comptar les pagades:
  // sumar-hi una compra pendent o fallida inflava la recaptacio i no quadrava
  // amb la xifra del panell principal, que si que filtra per `completed`.
  const compresPagades = purchases.filter((p) => p.payment_status === "completed");
  const totalAttendees = compresPagades.reduce((acc, p) => acc + (p.quantity ?? 1), 0);
  const totalRevenue = compresPagades.reduce((acc, p) => acc + (p.amount_eur ?? 0), 0);
  const pendents = purchases.length - compresPagades.length;

  const tabName = event?.sheet_id ?? event?.title;
  const sheetUrl = getSheetUrl();

  function exportCSV() {
    if (!purchases.length) return;
    const headers = ["Nom", "Email", "Telèfon", "Tiquets", "Dietètica", "Import (€)", "Gestió (€)", "Mètode", "Estat", "Data"];
    const rows = purchases.map((p) => [
      p.buyer_name,
      p.buyer_email,
      p.buyer_phone ?? "",
      p.quantity ?? 1,
      p.dietary ?? "Cap",
      p.amount_eur,
      p.fee_eur ?? 0,
      p.payment_method === "cash" ? "Efectiu" : p.payment_method === "bizum" ? "Bizum" : p.payment_method === "card" ? "Targeta" : "Stripe",
      p.payment_status === "completed" ? "Pagat" : p.payment_status,
      new Date(p.created_at).toLocaleDateString("ca-ES"),
    ]);
    downloadCsv(`${event?.title.replace(/\s+/g, "_") || "assistents"}.csv`, headers, rows);
  }

  if (loading && !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-carbon text-white">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon text-white">
      {loadError && <p role="alert" className="bg-red-950 p-4 text-sm text-red-200">{loadError}</p>}
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex min-w-0 items-center gap-4">
          <Crest className="h-7 w-[19px] shrink-0" />
          <a
            href="/admin"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={14} /> Tornar al panell
          </a>
          <span className="hidden text-white/30 sm:inline">/</span>
          <h1 className="font-display font-bold text-base text-white truncate max-w-xs md:max-w-md">
            {event?.title ?? "Detall de l'Esdeveniment"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualitzar
          </button>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener"
              title="Obre el full de calcul de la Junta al Google Drive"
              className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <ExternalLink size={13} /> Google Sheet {tabName && `(pestanya "${tabName}")`}
            </a>
          )}
          <button
            onClick={exportCSV}
            title="Descarrega un fitxer al teu ordinador per obrir-lo amb l'Excel"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <FileDown size={13} /> Baixar Excel
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Event Highlights banner */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">Esdeveniment Oficial</span>
              <h2 className="font-display text-2xl font-extrabold text-white mt-1">{event?.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-right">
                <span className="block text-[10px] uppercase tracking-wider text-white/40">Recaptació</span>
                <span className="font-display text-xl font-bold text-white">{totalRevenue.toFixed(2)} €</span>
                <span className="block text-[10px] text-white/35">
                  {pendents > 0 ? `${pendents} pendent${pendents === 1 ? "" : "s"} sense comptar` : "Només compres pagades"}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-right">
                <span className="block text-[10px] uppercase tracking-wider text-white/40">Places Ocupades</span>
                <span className="font-display text-xl font-bold text-brand">
                  {totalAttendees} / {event?.total_spots ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-white/60 border-t border-white/10 pt-4">
            <span className="flex items-center gap-2"><Calendar size={14} className="text-brand" /> {event?.date}</span>
            <span className="flex items-center gap-2"><MapPin size={14} className="text-brand" /> {event?.location}</span>
            {event?.menu && <span className="flex items-center gap-2"><Utensils size={14} className="text-brand" /> {event?.menu}</span>}
          </div>
        </div>

        {/* Filter & Attendee list */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand" />
              <h3 className="font-display text-lg font-bold text-white">Llistat d&apos;Assistents</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                {filteredPurchases.length} reserves
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5 bg-white/5 rounded-xl p-1 text-xs">
              {[
                { key: "all", label: "Tots" },
                { key: "intolerances", label: "Amb Intoleràncies" },
                { key: "Sense gluten", label: "Sense Gluten" },
                { key: "Vegetarià", label: "Vegetarià" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDietaryFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    dietaryFilter === f.key ? "bg-brand text-white font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">
              No s&apos;han trobat reserves amb aquest filtre.
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/40">
                    <th className="pb-3 pl-2">Assistent</th>
                    <th className="pb-3">Contacte</th>
                    <th className="pb-3 text-center">Tiquets</th>
                    <th className="pb-3">Requeriment Dietètic</th>
                    <th className="pb-3 text-right">Import</th>
                    <th className="pb-3 text-center">Mètode</th>
                    <th className="pb-3 text-right pr-2">Estat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPurchases.map((p) => {
                    const hasDiet = p.dietary && p.dietary !== "Cap intolerància";
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pl-2 font-semibold text-white">{p.buyer_name}</td>
                        <td className="py-3.5 text-xs text-white/60">
                          <div>{p.buyer_email}</div>
                          {p.buyer_phone && <div className="text-white/40">{p.buyer_phone}</div>}
                        </td>
                        <td className="py-3.5 text-center font-bold text-white">{p.quantity ?? 1}</td>
                        <td className="py-3.5">
                          {hasDiet ? (
                            <span className="rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                              ⚠️ {p.dietary}
                            </span>
                          ) : (
                            <span className="text-xs text-white/35">Estàndard</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-white">{p.amount_eur.toFixed(2)} €</td>
                        <td className="py-3.5 text-center text-xs">
                          {p.payment_method === "cash" ? (
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/70">Efectiu 💵</span>
                          ) : (
                            <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-blue-400">Targeta 💳</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          {p.payment_status === "completed" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                              <CheckCircle size={12} /> Pagat
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-400 font-medium">
                              <Clock size={12} /> Pendent
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
