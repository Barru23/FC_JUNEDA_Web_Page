"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock3,
  Home,
  Mail,
  ShoppingBag,
  Users,
  XCircle,
} from "lucide-react";

type PageStatus = "checking" | "paid" | "processing" | "failed" | "invalid";

type StatusData = {
  status: Exclude<PageStatus, "checking">;
  fulfillmentStatus?: "complete" | "processing";
  purchaseType?: "event" | "merch" | "membership";
  itemTitle?: string | null;
  quantity?: number | null;
  size?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  amountTotal?: number;
  customerEmail?: string | null;
  emailSent?: boolean;
  message?: string;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = useRef(searchParams.get("session_id")).current;
  const [status, setStatus] = useState<PageStatus>(sessionId ? "checking" : "invalid");
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      try {
        const response = await fetch("/api/checkout/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ sessionId }),
        });
        const result = (await response.json()) as StatusData;
        if (cancelled) return;

        setData(result);
        setStatus(result.status);

        // L'identificador dona acces a un resum privat de la compra. Un cop
        // verificat, no cal conservar-lo a la barra, historial ni captures.
        window.history.replaceState({}, "", "/success");

        if (result.status === "processing" && attempts < 4) {
          attempts += 1;
          timeout = setTimeout(check, 2000);
        }
      } catch {
        if (!cancelled) {
          setData({ status: "invalid", message: "No hem pogut verificar el pagament ara mateix" });
          setStatus("invalid");
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionId]);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-carbon" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-white/50">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>Verificant el pagament amb Stripe...</p>
        </div>
      </main>
    );
  }

  if (status !== "paid") {
    const processing = status === "processing";
    const Icon = processing ? Clock3 : status === "failed" ? XCircle : AlertTriangle;
    const title = processing
      ? "Pagament en procés"
      : status === "failed"
        ? "Pagament no completat"
        : "No podem verificar la compra";
    const message =
      data?.message ??
      (processing
        ? "Stripe encara està processant el mètode de pagament. No cal tornar a pagar: actualitza aquesta pàgina més tard o revisa el teu correu."
        : "Torna a la pàgina principal i inicia el procés de nou. Si veus un càrrec, contacta amb el club abans de repetir-lo.");

    return (
      <StatusShell>
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border ${
            processing
              ? "border-amber-400/30 bg-amber-400/15 text-amber-300"
              : "border-red-400/30 bg-red-400/15 text-red-300"
          }`}
        >
          <Icon size={40} />
        </div>
        <h1 className="mb-3 font-display text-3xl font-extrabold text-white">{title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-white/55" role="status">
          {message}
        </p>
        <HomeLink />
      </StatusShell>
    );
  }

  const type = data?.purchaseType ?? "event";
  const TypeIcon = type === "merch" ? ShoppingBag : type === "membership" ? Users : Calendar;
  const registrationPending = data?.fulfillmentStatus === "processing";

  return (
    <StatusShell>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/15"
      >
        <CheckCircle size={40} className="text-green-400" />
      </motion.div>

      <h1 className="mb-2 font-display text-3xl font-extrabold text-white">Pagament confirmat!</h1>
      <p className="mb-8 text-sm text-white/55">
        Stripe ha confirmat el cobrament. Gràcies per donar suport al CF Juneda!
      </p>

      <div className="mb-8 rounded-xl border border-white/10 bg-black/20 p-5 text-left">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
            <TypeIcon size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              {type === "event" ? "Reserva d’esdeveniment" : type === "merch" ? "Comanda de botiga" : "Alta de soci/sòcia"}
            </p>
            <p className="text-sm font-semibold text-white">{data?.itemTitle ?? "Compra CF Juneda"}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {data?.eventDate && <Row label="Data" value={data.eventDate} />}
          {data?.eventLocation && <Row label="Lloc" value={data.eventLocation} />}
          {data?.quantity && data.quantity > 0 && <Row label="Tiquets" value={String(data.quantity)} />}
          {data?.size && <Row label="Talla" value={data.size} />}
          {data?.customerEmail && <Row label="Correu" value={data.customerEmail} />}
          {data?.amountTotal !== undefined && (
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-white/50">Total pagat</span>
              <span className="font-display text-lg font-bold text-white">{data.amountTotal.toFixed(2)} €</span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${
          registrationPending
            ? "border-amber-400/20 bg-amber-400/10"
            : "border-brand/20 bg-brand/10"
        }`}
        role="status"
      >
        {registrationPending ? (
          <Clock3 size={18} className="shrink-0 text-amber-300" />
        ) : (
          <Mail size={18} className="shrink-0 text-brand" />
        )}
        <p className="text-xs text-white/65">
          {registrationPending
            ? "El cobrament és correcte. Estem acabant de registrar la compra i el webhook ho reintentarà automàticament."
            : data?.emailSent
              ? `Hem enviat el correu de confirmació a ${data.customerEmail ?? "la teva adreça"}.`
              : "La compra ha quedat registrada. Stripe també t’enviarà el seu rebut; el correu del club pot arribar una mica més tard."}
        </p>
      </div>

      <HomeLink />
    </StatusShell>
  );
}

function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-carbon px-4">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[40vh] w-[40vh] rounded-full bg-brand/10 blur-[120px]" />
      </div>
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
      >
        {children}
        <p className="mt-4 text-xs text-white/25">Club Futbol Juneda · Som-hi Rojos! 🔴</p>
      </motion.section>
    </main>
  );
}

function HomeLink() {
  return (
    <a
      href="/"
      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(225,6,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Home size={16} />
      Tornar a la pàgina principal
    </a>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-carbon">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
