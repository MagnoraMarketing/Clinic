"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { QrCode } from "@/components/landing/QrCode";

export default function QrNfcPage() {
  const t = useT();
  const { clinic, catalog, refreshClinic } = useAdmin();
  const [review, setReview] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [msg, setMsg] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setReview(clinic?.reviewUrl ?? ""), [clinic]);
  if (!clinic) return null;

  const bookingPath = `/demo/${clinic.slug}/book${serviceId ? `?service=${encodeURIComponent(serviceId)}` : ""}`;
  const nfcPath = `/r/${clinic.slug}`;

  const saveReview = async () => {
    setMsg("");
    try {
      await api(`/api/clinics/${clinic.id}`, { method: "PATCH", body: JSON.stringify({ reviewUrl: review.trim() }) });
      await refreshClinic();
      setMsg(t("Saved ✓ The NFC chip now sends clients to the new link – no need to change the chip."));
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <>
      <PageTitle title="QR & NFC" text="QR codes open your booking page (reception, mirrors, business cards, flyers). The NFC chip on the counter sends happy clients to your reviews. €30 per piece." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">{t("🔳 Booking QR code")}</h2>
          <label className="block">
            <span className="label">{t("Open booking with a treatment pre-selected (optional)")}</span>
            <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">{t("– Any treatment –")}</option>
              {catalog?.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.name)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-6">
            <div className="rounded-2xl bg-cream p-4 text-ink-950 shadow-xl">
              <p className="text-center font-display font-semibold">{clinic.name}</p>
              <p className="text-center text-[10px]">{t("Scan to book")}</p>
              <div className="mt-2 h-40 w-40 rounded-lg bg-white p-1">
                <QrCode value={bookingPath} className="h-full w-full" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <p className="break-all rounded-xl bg-ink-850 px-3 py-2 font-mono text-xs">{origin}{bookingPath}</p>
              <button onClick={() => window.print()} className="btn-secondary !py-2">
                🖨️ {t("Print")}
              </button>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">{t("⭐ NFC review chip")}</h2>
          <p className="text-sm text-ink-400">{t("The chip is programmed with a fixed address. You decide where it points – e.g. your Google review page – and can change it anytime.")}</p>
          <p className="break-all rounded-xl bg-ink-850 px-3 py-2 font-mono text-xs">
            {t("Chip address:")} {origin}
            {nfcPath}
          </p>
          <label className="block">
            <span className="label">{t("Review link (https://)")}</span>
            <input className="input" value={review} onChange={(e) => setReview(e.target.value)} placeholder="https://g.page/r/…/review" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveReview} className="btn-primary !py-2.5">
              {t("Save link")}
            </button>
            <a href={nfcPath} target="_blank" className="btn-secondary !py-2.5">
              {t("Test the chip")}
            </a>
          </div>
          {msg && <p className="text-sm text-sage-200">{msg}</p>}
        </section>
      </div>
    </>
  );
}
