"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket, ShoppingBag, Users, Plus, ExternalLink,
  RefreshCw, FileDown, Calendar, Loader2, CheckCircle, Clock,
  Euro, ChevronRight, X, Pencil, PackageCheck
} from "lucide-react";
import type { DashboardStats, Purchase } from "@/lib/data";
import { Crest } from "@/components/Crest";
import { Modal } from "@/components/ui/Modal";

function getToken(): string {
  return sessionStorage.getItem("admin_token") ?? "";
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "brand" }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    brand: "from-brand/20 to-brand/5 border-brand/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    gold: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  };
  const iconColors: Record<string, string> = { brand: "text-brand", green: "text-green-400", blue: "text-blue-400", gold: "text-yellow-400" };

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border bg-gradient-to-br p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</span>
        <Icon size={18} className={iconColors[color]} />
      </div>
      <p className="font-display text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

// ─── Purchase Row ─────────────────────────────────────────────────────────────
function PurchaseRow({ p }: { p: Purchase }) {
  const typeConfig = {
    event: { icon: "🎟️", label: p.event?.title ?? "Esdeveniment", color: "text-brand" },
    merch: { icon: "👕", label: p.product?.name ?? "Producte", color: "text-blue-400" },
    membership: { icon: "🔴", label: p.tier?.name ?? "Soci/Socia", color: "text-yellow-400" },
  };
  const tc = typeConfig[p.purchase_type] ?? typeConfig.event;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
      <span className="text-xl">{tc.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{p.buyer_name}</p>
        <p className={`text-xs truncate ${tc.color}`}>{tc.label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-white">{p.amount_eur.toFixed(2)} €</p>
        <div className="flex items-center justify-end gap-1">
          {p.payment_status === "completed" ? (
            <><CheckCircle size={10} className="text-green-400" /><span className="text-xs text-green-400">Pagat</span></>
          ) : (
            <><Clock size={10} className="text-yellow-400" /><span className="text-xs text-yellow-400">Pendent</span></>
          )}
          {p.payment_method === "cash" && (
            <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">💵</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Event Modal (create or edit) ──────────────────────────────────────────────
type AdminEvent = {
  id: string; title: string; description?: string | null; event_type?: string;
  date: string; location: string; menu?: string | null; image_url?: string | null;
  price_eur: number; total_spots: number; spots_remaining: number;
  booking_fee_eur: number; status: string; sheet_id?: string;
};

function EventModal({ event, onClose, onSaved }: { event?: AdminEvent; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ?? "",
    location: event?.location ?? "",
    menu: event?.menu ?? "",
    image_url: event?.image_url ?? "",
    price_eur: event ? String(event.price_eur) : "",
    total_spots: event ? String(event.total_spots) : "",
    booking_fee_eur: event ? String(event.booking_fee_eur) : "0.75",
    event_type: event?.event_type ?? "dinner",
    spots_remaining: event ? String(event.spots_remaining) : "",
    status: event?.status ?? "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title, description: form.description, event_type: form.event_type,
        date: form.date, location: form.location, menu: form.menu,
        image_url: form.image_url.trim() || null,
        price_eur: parseFloat(form.price_eur), total_spots: parseInt(form.total_spots),
        booking_fee_eur: parseFloat(form.booking_fee_eur),
      };
      if (isEdit) {
        payload.id = event!.id;
        payload.spots_remaining = parseInt(form.spots_remaining);
        payload.status = form.status;
      }
      const res = await fetch("/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors";

  return (
    <Modal onClose={onClose} ariaLabel={isEdit ? "Editar esdeveniment" : "Nou esdeveniment"}>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-6 max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">{isEdit ? "Editar Esdeveniment" : "Nou Esdeveniment"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nom de l&apos;esdeveniment *</label>
            <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} required placeholder="Sopar de Temporada 2026/27" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripció</label>
            <input className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} placeholder="El sopar anual del club per celebrar la temporada" />
          </div>
          <div>
            <label className="label">Data *</label>
            <input className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} required placeholder="28 de setembre de 2026" />
          </div>
          <div>
            <label className="label">Tipus</label>
            <select className={inputCls} value={form.event_type} onChange={e => set("event_type", e.target.value)}>
              <option value="dinner">Sopar</option>
              <option value="lunch">Dinar</option>
              <option value="party">Festa</option>
              <option value="other">Altre</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Lloc *</label>
            <input className={inputCls} value={form.location} onChange={e => set("location", e.target.value)} required placeholder="Pavelló Municipal de Juneda" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Menú</label>
            <input className={inputCls} value={form.menu} onChange={e => set("menu", e.target.value)} placeholder="Menú 3 plats + postres + vi" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL de la imatge</label>
            <input className={inputCls} value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://..." />
            {form.image_url.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url.trim()} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = "none")} onLoad={(e) => (e.currentTarget.style.display = "block")} />
            )}
          </div>
          <div>
            <label className="label">Preu (€) *</label>
            <input className={inputCls} type="number" min="0.01" step="0.01" value={form.price_eur} onChange={e => set("price_eur", e.target.value)} required placeholder="18.00" />
          </div>
          <div>
            <label className="label">Places totals *</label>
            <input className={inputCls} type="number" min="1" value={form.total_spots} onChange={e => set("total_spots", e.target.value)} required placeholder="150" />
          </div>
          <div>
            <label className="label">Taxa de gestió (€)</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={form.booking_fee_eur} onChange={e => set("booking_fee_eur", e.target.value)} placeholder="0.75" />
          </div>
          {isEdit && (
            <div>
              <label className="label">Places disponibles</label>
              <input className={inputCls} type="number" min="0" max={form.total_spots || undefined} value={form.spots_remaining} onChange={e => set("spots_remaining", e.target.value)} />
            </div>
          )}
          {isEdit && (
            <div className="sm:col-span-2">
              <label className="label">Estat</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Actiu</option>
                <option value="sold_out">Exhaurit</option>
                <option value="cancelled">Cancel·lat</option>
              </select>
            </div>
          )}
          {error && <p className="sm:col-span-2 text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>}
          <div className="sm:col-span-2 flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/15 py-3 text-sm text-white/70">Cancel·lar</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Desant...</> : isEdit ? "Desar Canvis" : "Crear Esdeveniment"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Modal>
  );
}

// ─── Product Modal (edit) ──────────────────────────────────────────────────────
type AdminProduct = {
  id: string; slug: string; name: string; description?: string | null; price_eur: number;
  sizes: string[]; swatches: string[]; customizable: boolean; image_url?: string | null;
  stock: Record<string, number>; status: string;
};

function parseList(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function ProductModal({ product, onClose, onSaved }: { product?: AdminProduct; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price_eur: product ? String(product.price_eur) : "",
    sizes: product?.sizes?.join(", ") ?? "Única",
    swatches: product?.swatches?.join(", ") ?? "",
    customizable: product?.customizable ?? false,
    image_url: product?.image_url ?? "",
    status: product?.status ?? "active",
    stock: { ...(product?.stock ?? {}) },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStock = (size: string, v: string) => setForm((f) => ({ ...f, stock: { ...f.stock, [size]: parseInt(v) || 0 } }));
  const sizes = parseList(form.sizes);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        price_eur: parseFloat(form.price_eur),
        sizes,
        swatches: parseList(form.swatches),
        customizable: form.customizable,
        image_url: form.image_url,
        status: form.status,
        stock: Object.fromEntries(sizes.map((size) => [size, form.stock[size] ?? 0])),
      };
      if (isEdit) payload.id = product!.id;

      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors";

  return (
    <Modal onClose={onClose} ariaLabel={isEdit ? "Editar producte" : "Nou producte"}>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-6 max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">{isEdit ? "Editar Producte" : "Nou Producte"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Nom *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Descripció</label>
            <textarea className={`${inputCls} min-h-20 resize-y`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Preu (€) *</label>
              <input className={inputCls} type="number" min="0.01" step="0.01" value={form.price_eur} onChange={e => setForm(f => ({ ...f, price_eur: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Estat</label>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Actiu</option>
                <option value="out_of_stock">Exhaurit</option>
                <option value="hidden">Amagat</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Talles o variants *</label>
            <input className={inputCls} value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} required placeholder="S, M, L, XL o Única" />
            <p className="mt-1 text-[10px] text-white/35">Separa-les amb comes. Per a una bufanda, pots posar “Única”.</p>
          </div>
          <div>
            <label className="label">Estoc per talla o variant</label>
            <div className="grid grid-cols-2 gap-2 mt-1 sm:grid-cols-3">
              {sizes.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
                  <span className="text-xs font-bold text-white/50 w-10">{s}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.stock[s] ?? 0}
                    onChange={(e) => setStock(s, e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="label">URL de la imatge</label>
            <input className={inputCls} value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            {form.image_url.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url.trim()} alt="" className="mt-2 h-24 w-full rounded-lg object-contain bg-white/5" />
            )}
          </div>
          <div>
            <label className="label">Colors (opcional)</label>
            <input className={inputCls} value={form.swatches} onChange={e => setForm(f => ({ ...f, swatches: e.target.value }))} placeholder="#E10600, #0B2E83" />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
            <input type="checkbox" checked={form.customizable} onChange={e => setForm(f => ({ ...f, customizable: e.target.checked }))} className="h-4 w-4 accent-brand" />
            Permetre dorsal personalitzat
          </label>
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/15 py-3 text-sm text-white/70">Cancel·lar</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Desant...</> : isEdit ? "Desar Canvis" : "Crear Producte"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Modal>
  );
}

// ─── Cash Payment Modal ───────────────────────────────────────────────────────
function CashModal({ events, onClose, onCreated }: {
  events: { id: string; title: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ purchase_type: "event", buyer_name: "", buyer_email: "", buyer_phone: "", event_id: "", quantity: "1", dietary: "", amount_eur: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cash", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...form, quantity: parseInt(form.quantity), amount_eur: parseFloat(form.amount_eur) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors";

  return (
    <Modal onClose={onClose} ariaLabel="Registrar pagament en efectiu">
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">Pagament en Efectiu 💵</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="label">Tipus</label>
            <select className={inputCls} value={form.purchase_type} onChange={e => set("purchase_type", e.target.value)}>
              <option value="event">Tiquet Esdeveniment</option>
              <option value="merch">Botiga</option>
              <option value="membership">Soci/Socia</option>
            </select>
          </div>
          {form.purchase_type === "event" && (
            <div>
              <label className="label">Esdeveniment</label>
              <select className={inputCls} value={form.event_id} onChange={e => set("event_id", e.target.value)}>
                <option value="">Selecciona...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Nom complet *</label>
            <input className={inputCls} value={form.buyer_name} onChange={e => set("buyer_name", e.target.value)} required placeholder="Joan Garcia" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className={inputCls} type="email" value={form.buyer_email} onChange={e => set("buyer_email", e.target.value)} placeholder="joan@exemple.com" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.purchase_type === "event" && (
              <div>
                <label className="label">Tiquets</label>
                <input className={inputCls} type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Import (€) *</label>
              <input className={inputCls} type="number" step="0.01" value={form.amount_eur} onChange={e => set("amount_eur", e.target.value)} required placeholder="18.00" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/15 py-3 text-sm text-white/70">Cancel·lar</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Registrant...</> : "Registrar Pagament"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Modal>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventModalTarget, setEventModalTarget] = useState<AdminEvent | "new" | null>(null);
  const [productModalTarget, setProductModalTarget] = useState<AdminProduct | "new" | null>(null);
  const [showCash, setShowCash] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "event" | "merch" | "membership">("all");
  const masterSheetId = process.env.NEXT_PUBLIC_MASTER_SHEET_ID ?? "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const h = authHeaders();
    try {
      const [statsRes, eventsRes, productsRes, purchasesRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: h }),
        fetch("/api/admin/events", { headers: h }),
        fetch("/api/admin/products", { headers: h }),
        fetch(`/api/admin/purchases${activeTab !== "all" ? `?type=${activeTab}` : ""}`, { headers: h }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function exportCSV() {
    if (!purchases.length) return;
    const headers = ["Nom", "Email", "Tipus", "Detall", "Import", "Metode", "Estat", "Data"];
    const rows = purchases.map((p) => [
      p.buyer_name, p.buyer_email, p.purchase_type,
      p.event?.title ?? p.product?.name ?? p.tier?.name ?? "",
      p.amount_eur, p.payment_method ?? "", p.payment_status,
      new Date(p.created_at).toLocaleDateString("ca-ES"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cfjuneda-compres-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const TABS = [{ key: "all", label: "Totes" }, { key: "event", label: "Tiquets" }, { key: "merch", label: "Botiga" }, { key: "membership", label: "Socis" }] as const;

  return (
    <div className="min-h-screen bg-carbon text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div>
          <div className="flex items-center gap-2">
            <Crest className="h-7 w-[19px]" />
            <span className="text-brand font-display font-extrabold text-lg">CF Juneda</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60 text-sm">Panell d&apos;Administració</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualitzar
          </button>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors">
            <ExternalLink size={13} /> Stripe
          </a>
          <a href="/" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors">
            Web pública
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <StatCard icon={Euro} label="Ingressos Totals" value={`${stats?.total_revenue?.toFixed(2) ?? "—"} €`} sub="Pagaments confirmats" color="brand" />
          <StatCard icon={Ticket} label="Tiquets Venuts" value={stats?.tickets_sold ?? "—"} sub="Tots els esdeveniments" color="green" />
          <StatCard icon={ShoppingBag} label="Comandes Botiga" value={stats?.merch_orders ?? "—"} sub="Peces venudes" color="blue" />
          <StatCard icon={Users} label="Socis Actuals" value={stats?.active_members ?? "—"} sub="Temporada 2026/27" color="gold" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Events panel */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-white">Esdeveniments</h2>
              <button onClick={() => setEventModalTarget("new")} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
                <Plus size={13} /> Nou
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {events.length === 0 && !loading && (
                <p className="text-sm text-white/30 text-center py-8">Sense esdeveniments. Crea el primer!</p>
              )}
              {events.map((ev) => {
                const pct = ev.total_spots ? Math.round(((ev.total_spots - ev.spots_remaining) / ev.total_spots) * 100) : 0;
                const [sheetId, tabName] = (ev.sheet_id ?? "::").split("::");
                const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : null;

                return (
                  <div
                    key={ev.id}
                    onClick={() => router.push(`/admin/events/${ev.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/events/${ev.id}`); }}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-brand/40 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm text-white leading-tight">{ev.title}</p>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ev.status === "active" ? "bg-green-500/15 text-green-400" : ev.status === "sold_out" ? "bg-brand/15 text-brand" : "bg-white/10 text-white/40"}`}>
                          {ev.status}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEventModalTarget(ev); }}
                          className="rounded-md p-1 text-white/40 hover:text-white hover:bg-white/10"
                          aria-label="Editar esdeveniment"
                        >
                          <Pencil size={12} />
                        </button>
                        <ChevronRight size={14} className="text-white/25" />
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>{ev.total_spots - ev.spots_remaining} venuts</span>
                        <span>{ev.spots_remaining} disponibles</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {sheetUrl && (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        <ExternalLink size={11} /> Obrir Full de Calcul {tabName && `(${tabName})`}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botiga panel */}
            <div className="flex items-center justify-between mb-4 mt-8">
              <h2 className="font-display text-lg font-bold text-white">Botiga</h2>
              <button onClick={() => setProductModalTarget("new")} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity">
                <Plus size={13} /> Nou
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {products.length === 0 && !loading && (
                <p className="text-sm text-white/30 text-center py-8">Sense productes.</p>
              )}
              {products.map((p) => {
                const totalStock = Object.values(p.stock ?? {}).reduce((a, b) => a + b, 0);
                return (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-sm text-white leading-tight">{p.name}</p>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "active" ? "bg-green-500/15 text-green-400" : p.status === "out_of_stock" ? "bg-brand/15 text-brand" : "bg-white/10 text-white/40"}`}>
                          {p.status}
                        </span>
                        <button
                          onClick={() => setProductModalTarget(p)}
                          className="rounded-md p-1 text-white/40 hover:text-white hover:bg-white/10"
                          aria-label="Editar producte"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                      <span className="font-display text-lg font-bold text-white">{p.price_eur.toFixed(2)} €</span>
                      <span className="flex items-center gap-1"><PackageCheck size={12} /> {totalStock} unitats</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-white/40">
                      {Object.entries(p.stock ?? {}).map(([size, qty]) => (
                        <span key={size} className={`rounded-md border px-1.5 py-0.5 ${qty > 0 ? "border-white/10" : "border-red-500/20 text-red-400/70"}`}>
                          {size}: {qty}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purchases panel */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-brand text-white" : "text-white/50 hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCash(true)} className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-bold text-brand hover:bg-brand/20 transition-colors">
                  <Plus size={13} /> Efectiu
                </button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors">
                  <FileDown size={13} /> CSV
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
                ))
              ) : purchases.length === 0 ? (
                <div className="py-12 text-center text-white/30">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sense compres registrades</p>
                </div>
              ) : (
                purchases.map((p) => <PurchaseRow key={p.id} p={p} />)
              )}
            </div>
          </div>
        </div>

        {/* Revenue breakdown */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">Ingressos Esdeveniments</span>
                <Calendar size={14} className="text-brand" />
              </div>
              <p className="font-display text-2xl font-bold">{stats.event_revenue.toFixed(2)} €</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">Ingressos Botiga</span>
                <ShoppingBag size={14} className="text-blue-400" />
              </div>
              <p className="font-display text-2xl font-bold">{stats.merch_revenue.toFixed(2)} €</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">Ingressos Socis</span>
                <Users size={14} className="text-yellow-400" />
              </div>
              <p className="font-display text-2xl font-bold">{stats.membership_revenue.toFixed(2)} €</p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {eventModalTarget && (
        <EventModal
          event={eventModalTarget === "new" ? undefined : eventModalTarget}
          onClose={() => setEventModalTarget(null)}
          onSaved={() => { setEventModalTarget(null); fetchData(); }}
        />
      )}
      {productModalTarget && (
        <ProductModal
          product={productModalTarget === "new" ? undefined : productModalTarget}
          onClose={() => setProductModalTarget(null)}
          onSaved={() => { setProductModalTarget(null); fetchData(); }}
        />
      )}
      {showCash && <CashModal events={events} onClose={() => setShowCash(false)} onCreated={() => { setShowCash(false); fetchData(); }} />}
    </div>
  );
}
