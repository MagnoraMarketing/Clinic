"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Appointment } from "@/lib/types";
import { assistantApi, type AvailabilityResult } from "@/lib/client/api";
import { dayShort, dkk, duration, formatDate } from "@/lib/format";
import { addDays, clinicNow, hoursForDate, hoursUntil } from "@/lib/hours";
import { Icon } from "@/components/ui/Icon";
import { useClinic } from "@/components/clinic/ClinicShell";
import { openReceptionist } from "@/components/widget/events";

export default function ManagePage() {
  return (
    <Suspense>
      <Manage />
    </Suspense>
  );
}

/** Self-service rebooking & cancellation – the same API the AI receptionist uses. */
function Manage() {
  const { t, locale } = useI18n();
  const { clinic: c } = useClinic();
  const params = useSearchParams();
  const accent = c.accentColor;
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<Appointment[] | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [mode, setMode] = useState<"move" | "cancel" | null>(null);
  const [date, setDate] = useState("");
  const [avail, setAvail] = useState<AvailabilityResult | null>(null);
  const [done, setDone] = useState<{ a: Appointment; text: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const days = Array.from({ length: 21 }, (_, i) => addDays(clinicNow().date, i));

  useEffect(() => {
    if (!selected || mode !== "move" || !date) return;
    setAvail(null);
    assistantApi
      .availability({ clinicId: c.id, serviceId: selected.serviceId, date, excludeAppointmentId: selected.id })
      .then(setAvail)
      .catch(() => setAvail(null));
  }, [selected, mode, date, c.id]);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const list = await assistantApi.lookup(c.id, ref.trim(), phone);
      setFound(list);
      setSelected(list.length === 1 ? list[0] : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (body: Record<string, unknown>, text: (a: Appointment) => string) => {
    if (!selected) return;
    setError("");
    setBusy(true);
    try {
      const a = await assistantApi.updateAppointment(selected.id, { ...body, phone, source: "website" });
      setDone({ a, text: text(a) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="container-x max-w-xl py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Icon name={done.a.status === "cancelled" ? "close" : "refresh"} className="h-8 w-8" />
          </span>
          <h1 className="h-display mt-4 text-3xl">{done.a.status === "cancelled" ? t("Appointment cancelled") : t("Appointment moved")}</h1>
          <p className="mt-3 text-ink-300">{done.text}</p>
          <p className="mt-1 text-sm text-ink-400">{t("Reference {ref}", { ref: done.a.reference })}</p>
        </div>
      </div>
    );

  const late = selected ? hoursUntil(selected.date, selected.time) < c.booking.cancellationHours : false;

  return (
    <div className="container-x max-w-3xl py-10 sm:py-14">
      <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
        {c.name}
      </p>
      <h1 className="h-display mt-1 text-4xl sm:text-5xl">{t("Move or cancel your appointment")}</h1>
      <p className="mt-2 text-ink-400">{t(c.booking.rules)}</p>

      {!found && (
        <form onSubmit={lookup} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label>
            <span className="label">{t("Booking reference")}</span>
            <input required className="input uppercase" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("e.g. {example}", { example: "CA-4201" })} />
          </label>
          <label>
            <span className="label">{t("Phone number")}</span>
            <input required type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("The number you booked with")} />
          </label>
          <button disabled={busy} className="btn text-ink-950" style={{ background: accent }}>
            {busy ? t("Finding…") : t("Find booking")}
          </button>
          {error && <p className="text-sm text-red-300 sm:col-span-3">{error}</p>}
          <p className="text-xs text-ink-400 sm:col-span-3">
            {t("Don't have your reference?")}{" "}
            <button type="button" onClick={() => openReceptionist(t("I need to move my appointment"))} className="font-semibold underline" style={{ color: accent }}>
              {t("Ask the AI receptionist")}
            </button>{" "}
            {t("or call {phone}.", { phone: c.phone })}
          </p>
        </form>
      )}

      {found && !selected && (
        <div className="mt-8 grid gap-3">
          {found.map((a) => (
            <button key={a.id} onClick={() => setSelected(a)} className="card flex items-center justify-between gap-3 p-5 text-start hover:border-white/20">
              <span>
                <span className="block font-semibold">{t(a.serviceName)}</span>
                <span className="text-sm text-ink-400">
                  {formatDate(a.date, locale)} · {a.time} · {a.practitionerName}
                </span>
              </span>
              <Icon name="arrow" className="h-5 w-5 text-ink-400" />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-8 space-y-5">
          <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{t("Your appointment")} · {selected.reference}</p>
              <p className="mt-1 text-lg font-semibold">{t(selected.serviceName)}</p>
              <p className="text-sm text-ink-300">
                {t("{date} at {time}", { date: formatDate(selected.date, locale), time: selected.time })} · {duration(selected.durationMinutes, locale)} · {t("with {name}", { name: selected.practitionerName })}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode("move")} className={`btn !py-2.5 ${mode === "move" ? "text-ink-950" : "btn-secondary"}`} style={mode === "move" ? { background: accent } : undefined}>
                <Icon name="refresh" className="h-4 w-4" /> {t("Move")}
              </button>
              <button onClick={() => setMode("cancel")} className={`btn !py-2.5 ${mode === "cancel" ? "bg-red-400 text-ink-950" : "btn-secondary"}`}>
                <Icon name="close" className="h-4 w-4" /> {t("Cancel")}
              </button>
            </div>
          </div>

          {mode === "move" && (
            <div className="card space-y-5 p-5">
              <div>
                <p className="label">{t("New date")}</p>
                <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const dt = new Date(`${d}T12:00:00`);
                    return (
                      <button key={d} disabled={!hoursForDate(c, d)} onClick={() => setDate(d)} className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition disabled:opacity-30 ${date === d ? "border-transparent text-ink-950" : "border-white/10 hover:border-white/25"}`} style={date === d ? { background: accent } : undefined}>
                        <span className="text-[10px] uppercase opacity-80">{dayShort(dt.getDay(), locale)}</span>
                        <span className="font-semibold">{dt.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {date && (
                <div>
                  <p className="label">{t("New time")} · {formatDate(date, locale)}</p>
                  {!avail ? (
                    <p className="text-sm text-ink-400">{t("Finding free times…")}</p>
                  ) : avail.slots.length === 0 ? (
                    <p className="text-sm text-ink-400">{t("No free times this day")}{avail.alternatives[0] ? ` – ${t("next free: {date} from {time}", { date: formatDate(avail.alternatives[0].date, locale), time: avail.alternatives[0].times[0] })}` : ""}.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {avail.slots.map((s) => (
                        <button
                          key={s.time}
                          disabled={busy}
                          onClick={() => update({ date, time: s.time }, (a) => t("Your {service} is now on {date} at {time} with {name}.", { service: t(a.serviceName), date: formatDate(a.date, locale), time: a.time, name: a.practitionerName }))}
                          className="rounded-xl border border-white/10 py-2.5 text-sm font-semibold tabular-nums transition hover:border-white/30"
                          title={s.practitioners.map((p) => p.name).join(", ")}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === "cancel" && (
            <div className="card space-y-4 p-5">
              {late && c.booking.lateCancellationFee > 0 ? (
                <p className="rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                  {t("It's less than {hours} hours until your appointment, so the late cancellation fee of {fee} applies. Moving it instead is free.", { hours: c.booking.cancellationHours, fee: dkk(c.booking.lateCancellationFee, locale) })}
                </p>
              ) : (
                <p className="text-sm text-ink-300">{t("Cancellation is free. The time will be released for other clients.")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => update({ status: "cancelled" }, (a) => t("{service} on {date} at {time} has been cancelled.", { service: t(a.serviceName), date: formatDate(a.date, locale), time: a.time }))} className="btn bg-red-400 text-ink-950">
                  {t("Yes, cancel it")}
                </button>
                <button onClick={() => setMode("move")} className="btn-secondary">
                  {t("Move it instead")}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
