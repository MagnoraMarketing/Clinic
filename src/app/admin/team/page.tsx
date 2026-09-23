"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import type { Practitioner, Weekday } from "@/lib/types";
import { api } from "@/lib/client/api";
import { dayShort, initials } from "@/lib/format";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function TeamPage() {
  const { t, locale } = useI18n();
  const { clinic, catalog, refreshCatalog } = useAdmin();
  if (!clinic || !catalog) return null;

  const save = async (p: Practitioner, patch: Partial<Practitioner>) => {
    await api(`/api/clinics/${clinic.id}/practitioners`, { method: "PATCH", body: JSON.stringify({ practitionerId: p.id, ...patch }) });
    await refreshCatalog();
  };

  return (
    <>
      <PageTitle title="Team" text="Working days per practitioner. The AI only offers times on days a practitioner works – and only for the treatments they perform." />
      <div className="grid gap-4 lg:grid-cols-2">
        {catalog.practitioners.map((p) => {
          const services = catalog.services.filter((s) => s.practitionerIds.length === 0 || s.practitionerIds.includes(p.id));
          return (
            <div key={p.id} className={`card p-5 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-ink-950" style={{ background: p.color }}>
                  {initials(p.name.replace(/^Dr\.\s+/, ""))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-400">{t(p.title)}</p>
                  <p className="mt-1 text-sm text-ink-300">{t(p.bio)}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-300">
                  <input type="checkbox" checked={p.active} onChange={(e) => save(p, { active: e.target.checked })} className="accent-[#3fcfab]" /> {t("Active")}
                </label>
              </div>
              <p className="label mt-5">{t("Working days")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ORDER.map((d) => {
                  const on = p.workDays.includes(d);
                  const closed = clinic.openingHours.find((h) => h.day === d)?.closed;
                  return (
                    <button
                      key={d}
                      disabled={closed}
                      onClick={() => save(p, { workDays: on ? p.workDays.filter((x) => x !== d) : [...p.workDays, d] })}
                      className={`w-12 rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-25 ${on ? "border-transparent text-ink-950" : "border-white/10 text-ink-300 hover:border-white/25"}`}
                      style={on ? { background: p.color } : undefined}
                    >
                      {dayShort(d, locale)}
                    </button>
                  );
                })}
              </div>
              <p className="label mt-5">{t("Performs")}</p>
              <p className="text-sm text-ink-300">{services.map((s) => t(s.name)).join(" · ")}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
