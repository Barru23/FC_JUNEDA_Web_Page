"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Home, Mail, Calendar, ShoppingBag, Users } from "lucide-react";

type StatusData = {
  status: "paid" | "pending";
  metadata?: Record<string, string>;
  customerEmail?: string;
  amountTotal?: number;
  purchase?: {
    purchase_type: string;
    buyer_name: string;
    quantity?: number;
    dietary?: string;
    size?: string;
    event?: { title: string; date: string; location: string };
    product?: { name: string };
    tier?: { name: string };
  };
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }

    // Poll until webhook has processed (retry up to 5 times)
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/status?session_id=${sessionId}`);
        const json = await res.json();
        setData(json);
        if (json.status === "pending" && attempts < 5) {
          attempts++;
          setTimeout(poll, 1500);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    poll();
  }, [sessionId]);

  const type = data?.purchase?.purchase_type ?? data?.metadata?.purchase_type;
  const TypeIcon = type === "merch" ? ShoppingBag : type === "membership" ? Users : Calendar;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-carbon">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>Verificant el pagament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-carbon px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[40vh] w-[40vh] rounded-full bg-brand/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30"
        >
          <CheckCircle size={40} className="text-green-400" />
        </motion.div>

        <h1 className="font-display text-3xl font-extrabold text-white mb-2">
          Pagament Confirmat!
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Gràcies{data?.purchase?.buyer_name ? `, ${data.purchase.buyer_name}` : ""}! La teva compra s&apos;ha processat correctament.
        </p>

        {/* Purchase details */}
        <div className="mb-8 rounded-xl border border-white/10 bg-black/20 p-5 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
              <TypeIcon size={20} />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {type === "event" ? "Reserva d Esdeveniment" : type === "merch" ? "Comanda Botiga" : "Alta Soci/Socia"}
              </p>
              <p className="font-semibold text-white text-sm">
                {data?.purchase?.event?.title ?? data?.purchase?.product?.name ?? data?.purchase?.tier?.name ?? "Compra confirmada"}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {data?.purchase?.event && (
              <>
                <Row label="Data" value={data.purchase.event.date} />
                <Row label="Lloc" value={data.purchase.event.location} />
              </>
            )}
            {data?.purchase?.quantity && data.purchase.quantity > 0 && (
              <Row label="Tiquets" value={String(data.purchase.quantity)} />
            )}
            {data?.purchase?.dietary && (
              <Row label="Dietètica" value={data.purchase.dietary} />
            )}
            {data?.purchase?.size && (
              <Row label="Talla" value={data.purchase.size} />
            )}
            {data?.customerEmail && (
              <Row label="Correu" value={data.customerEmail} />
            )}
            {data?.amountTotal !== undefined && (
              <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-3">
                <span className="text-white/50">Total pagat</span>
                <span className="font-display text-lg font-bold text-white">{data.amountTotal.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>

        {/* Email notice */}
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-brand/10 border border-brand/20 px-4 py-3 text-left">
          <Mail size={18} className="shrink-0 text-brand" />
          <p className="text-xs text-white/60">
            Hem enviat un correu de confirmació a <strong>{data?.customerEmail ?? "la teva adreça"}</strong>.
          </p>
        </div>

        <a
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(225,6,0,0.5)]"
        >
          <Home size={16} />
          Tornar a la pàgina principal
        </a>

        <p className="mt-4 text-xs text-white/25">
          Club Futbol Juneda · Som-hi Rojos! 🔴
        </p>
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-carbon">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
