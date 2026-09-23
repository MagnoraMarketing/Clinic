"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Appointment, AppointmentStatus, Slot } from "@/lib/types";
import { api, assistantApi } from "@/lib/client/api";
import { dkk, duration, formatDate, formatDateShort, formatDateTime } from "@/lib/format";
import { addDays, clinicNow, hoursForDate, toMin } from "@/lib/hours";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { Kpi, PageTitle } from "@/components/admin/AdminShell";
import { SOURCE, STATUS } from "@/components/admin/labels";

const PX_PER_MIN = 1.1;

export default function AppointmentsPage() {
  const { t, locale } = useI18n();
  const { clinic, catalog } = useAdmin();
  const [date, setDate] = useState(() => clinicNow().date);
  const [view, setView] = useState<"day" | "list">("day");
  const { data, setData, reload } = usePoll<Appointment[]>(clinic ? `/api/appointments?clinicId=${clinic.id}&${view === "day" ? `date=${date}` : `from=${clinicNow().date}`}` : null, 6000);
  const [selected, setSelected] = useState<string | null>(null);
  if (!clinic) return null;

  const list = data ?? [];
  const hours = hoursForDate(clinic, date);
  const staff = (catalog?.practitioners ?? []).filter((p) => p.active);
  const day = new Date(`${date}T12:00:00`).getDay();
  const open = hours ? toMin(hours.open) : 8 * 60;
  const close = hours ? toMin(hours.close) : 17 * 60;
  const active = list.filter((a) => a.date === date && a.status !== "cancelled");
  const sel = list.find((a) => a.id === selected) ?? null;

  const patch = async (a: Appointment, body: Record<string, unknown>) => {
    const updated = await api<Appointment>(`/api/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setData((prev) => (prev ?? []).map((x) => (x.id === a.id ? updated : x)));
    return updated;
  };

  return (
    <>
      <PageTitle
        title="Appointments"
        text={t(clinic.booking.rules)}
        actions={
          <>
            <div className="flex rounded-full bg-white/5 p-1 text-sm">
              {(["day", "list"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 ${view === v ? "bg-white text-ink-950" : "text-ink-300"}`}>
                  {v === "day" ? t("Day calendar") : t("Upcoming list")}
                </button>
              ))}
            </div>
            <Link href={`/demo/${clinic.slug}/book`} target="_blank" className="btn-secondary !py-2">
              + {t("New booking")}
            </Link>
          </>
        }
      />

      {view === "day" ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={() => setDate(addDays(date, -1))} className="btn-secondary !px-3 !py-2" aria-label={t("Previous day")}>
              ←
            </button>
            <p className="min-w-56 text-center font-semibold">{formatDate(date, locale)}</p>
            <button onClick={() => setDate(addDays(date, 1))} className="btn-secondary !px-3 !py-2" aria-label={t("Next day")}>
              →
            </button>
            <button onClick={() => setDate(clinicNow().date)} className="btn-ghost !py-2 text-xs">
              {t("Today")}
            </button>
            <span className="ms-auto text-sm text-ink-400">
              {t("{n} appointments", { n: active.length })} · {dkk(active.reduce((s, a) => s + a.price, 0), locale)}
            </span>
          </div>

          {!hours ? (
            <p className="card p-10 text-center text-ink-400">{t("The clinic is closed on this day.")}</p>
          ) : (
            <div className="card overflow-x-auto p-4">
              <div className="grid min-w-[720px] gap-2" style={{ gridTemplateColumns: `48px repeat(${staff.length}, minmax(160px, 1fr))` }}>
                <span />
                {staff.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 pb-2 text-sm font-semibold">
                    <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="truncate">{p.name}</span>
                    {!p.workDays.includes(day as never) && <span className="text-[10px] font-normal text-ink-400">{t("off")}</span>}
                  </div>
                ))}
                <div className="relative" style={{ height: (close - open) * PX_PER_MIN }}>
                  {Array.from({ length: Math.ceil((close - open) / 60) }, (_, i) => (
                    <span key={i} className="absolute text-[11px] text-ink-400 tabular-nums" style={{ top: i * 60 * PX_PER_MIN - 6 }}>
                      {String(Math.floor(open / 60) + i).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
                {staff.map((p) => (
                  <div key={p.id} className={`relative rounded-xl ${p.workDays.includes(day as never) ? "bg-white/[0.03]" : "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(255,255,255,0.03)_8px,rgba(255,255,255,0.03)_16px)]"}`} style={{ height: (close - open) * PX_PER_MIN }}>
                    {Array.from({ length: Math.ceil((close - open) / 60) }, (_, i) => (
                      <span key={i} className="absolute inset-x-0 border-t border-white/5" style={{ top: i * 60 * PX_PER_MIN }} />
                    ))}
                    {list
                      .filter((a) => a.date === date && a.practitionerId === p.id && a.status !== "cancelled")
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-start text-[11px] leading-tight transition hover:brightness-125 ${selected === a.id ? "ring-2 ring-white" : ""} ${a.status === "pending" ? "border border-dashed border-amber-300" : ""}`}
                          style={{ top: (toMin(a.time) - open) * PX_PER_MIN + 1, height: a.durationMinutes * PX_PER_MIN - 2, background: `color-mix(in oklab, ${p.color} ${a.status === "completed" || a.status === "no_show" ? 18 : 38}%, #0c1816)` }}
                        >
                          <span className="block truncate font-semibold">
                            {a.time} {a.customer.name}
                          </span>
                          <span className="block truncate opacity-80">
                            {SOURCE[a.source].icon} {t(a.serviceName)}
                            {a.changes.length ? " · 🔄" : ""}
                          </span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {list.some((a) => a.date === date && a.status === "cancelled") && (
            <p className="mt-3 text-xs text-ink-400">
              {t("Cancelled today:")}{" "}
              {list
                .filter((a) => a.date === date && a.status === "cancelled")
                .map((a) => `${a.time} ${a.customer.name}${a.lateCancellation ? ` (${t("late")})` : ""}`)
                .join(" · ")}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Kpi label="Upcoming" value={String(list.filter((a) => a.status === "confirmed" || a.status === "pending").length)} />
            <Kpi label="Awaiting approval" value={String(list.filter((a) => a.status === "pending").length)} hint="new patients" />
            <Kpi label="Rebooked" value={String(list.filter((a) => a.changes.length).length)} hint="moved at least once" />
          </div>
          <div className="card divide-y divide-white/5">
            {list.map((a) => (
              <button key={a.id} onClick={() => setSelected(a.id)} className={`flex w-full flex-wrap items-center gap-4 p-4 text-start hover:bg-white/[0.02] ${a.status === "cancelled" ? "opacity-50" : ""}`}>
                <span className="w-28 text-sm">
                  <span className="block font-semibold tabular-nums">{a.time}</span>
                  <span className="text-xs text-ink-400">{formatDateShort(a.date, locale)}</span>
                </span>
                <span className="min-w-40 flex-1">
                  <span className="block font-semibold">{a.customer.name}</span>
                  <span className="text-xs text-ink-400">
                    {t(a.serviceName)} · {a.practitionerName} · {SOURCE[a.source].icon} {t(SOURCE[a.source].label)}
                    {a.changes.length ? ` · 🔄 ${t("moved {n}×", { n: a.changes.length })}` : ""}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[a.status].cls}`}>{t(STATUS[a.status].label)}</span>
              </button>
            ))}
            {list.length === 0 && <p className="p-10 text-center text-ink-400">{t("No upcoming appointments.")}</p>}
          </div>
        </>
      )}

      {sel && <Drawer a={sel} onClose={() => setSelected(null)} onPatch={patch} onMoved={reload} />}
    </>
  );
}

function Drawer({ a, onClose, onPatch, onMoved }: { a: Appointment; onClose: () => void; onPatch: (a: Appointment, body: Record<string, unknown>) => Promise<Appointment>; onMoved: () => void }) {
  const { t, locale } = useI18n();
  const { clinic } = useAdmin();
  const [moveDate, setMoveDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setMoveDate("");
    setSlots(null);
    setErr("");
  }, [a.id]);

  useEffect(() => {
    if (!moveDate || !clinic) return;
    setSlots(null);
    assistantApi
      .availability({ clinicId: clinic.id, serviceId: a.serviceId, date: moveDate, excludeAppointmentId: a.id })
      .then((r) => setSlots(r.slots))
      .catch(() => setSlots([]));
  }, [moveDate, a.id, a.serviceId, clinic]);

  const act = async (body: Record<string, unknown>) => {
    setErr("");
    try {
      await onPatch(a, body);
      if (body.date) onMoved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const btn = "rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold hover:bg-white/15";
  const setStatus = (status: AppointmentStatus) => act({ status });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <aside className="h-full w-full max-w-md animate-slide-in overflow-y-auto border-s border-white/10 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-400">{a.reference}</p>
            <h2 className="h-display text-2xl">{a.customer.name}</h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white" aria-label={t("Close")}>
            ✕
          </button>
        </div>
        <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[a.status].cls}`}>{t(STATUS[a.status].label)}</span>
        {a.lateCancellation && <span className="ms-2 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">{t("Late cancellation")}</span>}
        <dl className="mt-5 space-y-2 text-sm">
          {[
            ["Treatment", t(a.serviceName)],
            ["When", `${formatDate(a.date, locale)} · ${a.time}`],
            ["Duration", duration(a.durationMinutes, locale)],
            ["With", a.practitionerName],
            ["Price", dkk(a.price, locale)],
            ["Phone", a.customer.phone],
            ["Email", a.customer.email ?? "–"],
            ["Booked via", `${SOURCE[a.source].icon} ${t(SOURCE[a.source].label)}`],
            ["New client", a.newClient ? t("Yes") : t("No")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-ink-400">{t(k)}</dt>
              <dd className="text-end">{v}</dd>
            </div>
          ))}
        </dl>
        {a.comment && <p className="mt-4 rounded-2xl bg-sage-400/10 px-3 py-2 text-sm text-sage-100">“{a.comment}”</p>}

        {a.status !== "cancelled" && a.status !== "completed" && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.status === "pending" && (
              <button onClick={() => setStatus("confirmed")} className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-ink-950">
                {t("Approve new patient")}
              </button>
            )}
            {(a.status === "confirmed" || a.status === "pending") && (
              <button onClick={() => setStatus("checked_in")} className={btn}>
                {t("Check in")}
              </button>
            )}
            {a.status === "checked_in" && (
              <button onClick={() => setStatus("completed")} className={btn}>
                {t("Complete")}
              </button>
            )}
            {a.status === "confirmed" && (
              <button onClick={() => setStatus("no_show")} className={`${btn} text-ink-300`}>
                {t("No-show")}
              </button>
            )}
            <button onClick={() => setStatus("cancelled")} className={`${btn} text-red-300`}>
              {t("Cancel")}
            </button>
          </div>
        )}

        {(a.status === "confirmed" || a.status === "pending") && (
          <div className="mt-6 rounded-2xl border border-white/8 p-4">
            <p className="text-sm font-semibold">{t("🔄 Move appointment")}</p>
            <input type="date" className="input mt-3 !py-2" value={moveDate} min={clinicNow().date} onChange={(e) => setMoveDate(e.target.value)} />
            {moveDate && (
              <div className="mt-3">
                {slots === null ? (
                  <p className="text-xs text-ink-400">{t("Finding free times…")}</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-ink-400">{t("No free times that day.")}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map((s) => (
                      <button key={s.time} onClick={() => act({ date: moveDate, time: s.time, practitionerId: s.practitionerIds.includes(a.practitionerId) ? a.practitionerId : s.practitionerIds[0] })} className="rounded-lg border border-white/10 py-1.5 text-xs tabular-nums hover:border-white/30">
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}

        {a.changes.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{t("Change log")}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {a.changes.map((c, i) => (
                <li key={i} className="rounded-xl bg-ink-850 px-3 py-2">
                  <span className="text-ink-400 line-through">{c.from}</span> → <strong>{c.to}</strong>
                  <span className="block text-xs text-ink-400">
                    {SOURCE[c.by]?.icon} {t(SOURCE[c.by]?.label ?? "")} · {formatDateTime(c.at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
