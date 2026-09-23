"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import type { Service } from "@/lib/types";
import { api } from "@/lib/client/api";
import { priceLabel } from "@/lib/format";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

export default function ServicesPage() {
  const { t, locale } = useI18n();
  const { clinic, catalog, refreshCatalog } = useAdmin();
  const [saved, setSaved] = useState("");
  const [err, setErr] = useState("");
  if (!clinic || !catalog) return null;

  const save = async (s: Service, patch: Partial<Service>) => {
    setErr("");
    try {
      await api(`/api/clinics/${clinic.id}/services`, { method: "PATCH", body: JSON.stringify({ serviceId: s.id, ...patch }) });
      await refreshCatalog();
      setSaved(t("{name} saved ✓ – the AI receptionist uses it on the next call.", { name: s.name }));
      setTimeout(() => setSaved(""), 3500);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <>
      <PageTitle title="Services & prices" text="The price list the AI receptionist, the booking page and the voice widget use. Duration controls how much time is blocked in the calendar." />
      {saved && <p className="mb-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{saved}</p>}
      {err && <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>}
      <div className="space-y-8">
        {catalog.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-3 text-sm font-semibold text-ink-300">
              {cat.emoji} {cat.name}
            </h2>
            <div className="card divide-y divide-white/5">
              {catalog.services
                .filter((s) => s.categoryId === cat.id)
                .map((s) => (
                  <div key={s.id} className={`grid items-center gap-3 p-4 sm:grid-cols-[1fr_110px_120px_auto] ${s.available ? "" : "opacity-50"}`}>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {s.emoji} {s.name} {s.popular && <span className="ms-1 rounded-full bg-sage-400/15 px-2 py-0.5 text-[10px] font-bold text-sage-300">{t("Popular")}</span>}
                        {s.newClientsOnly && <span className="ms-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">{t("New clients")}</span>}
                      </p>
                      <p className="text-xs text-ink-400">
                        {s.description} · {s.practitionerIds.length ? s.practitionerIds.map((id) => catalog.practitioners.find((p) => p.id === id)?.name.split(" ")[0]).join(", ") : t("All practitioners")}
                      </p>
                    </div>
                    <label className="text-xs text-ink-400">
                      {t("Minutes")}
                      <input type="number" min={5} max={480} step={5} defaultValue={s.durationMinutes} onBlur={(e) => Number(e.target.value) !== s.durationMinutes && save(s, { durationMinutes: Number(e.target.value) })} className="input mt-1 !py-2" />
                    </label>
                    <label className="text-xs text-ink-400">
                      {t("Price (DKK)")}{s.priceFrom ? ` · ${t("from")}` : ""}
                      <input type="number" min={0} step={5} defaultValue={s.price} onBlur={(e) => Number(e.target.value) !== s.price && save(s, { price: Number(e.target.value) })} className="input mt-1 !py-2" />
                    </label>
                    <div className="flex items-center gap-3 justify-self-end">
                      <span className="hidden text-sm font-semibold tabular-nums lg:inline">{priceLabel(s, locale)}</span>
                      <label className="flex items-center gap-2 text-xs text-ink-300">
                        <input type="checkbox" checked={s.available} onChange={(e) => save(s, { available: e.target.checked })} className="accent-[#3fcfab]" /> {t("Bookable")}
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
