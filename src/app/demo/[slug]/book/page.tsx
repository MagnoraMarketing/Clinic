"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";
import { api, assistantApi, type AvailabilityResult } from "@/lib/client/api";
import { dayShort, duration, formatDate, initials, monthShort, priceLabel } from "@/lib/format";
import { addDays, clinicNow, hoursForDate, practitionersFor } from "@/lib/hours";
import { Icon } from "@/components/ui/Icon";
import { useClinic } from "@/components/clinic/ClinicShell";
import { openReceptionist } from "@/components/widget/events";

export default function BookPage() {
  return (
    <Suspense>
      <BookFlow />
    </Suspense>
  );
}

function BookFlow() {
  const { t, locale } = useI18n();
  const { clinic: c, catalog } = useClinic();
  const params = useSearchParams();
  const accent = c.accentColor;
  const services = catalog.services.filter((s) => s.available);
  const [serviceId, setServiceId] = useState(() => services.find((s) => s.id === params.get("service"))?.id ?? "");
  const [practitionerId, setPractitionerId] = useState(params.get("practitioner") ?? "");
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [avail, setAvail] = useState<AvailabilityResult | null>(null);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const staff = useMemo(() => (service ? practitionersFor(catalog, service) : catalog.practitioners.filter((p) => p.active)), [service, catalog]);

  // A practitioner chosen from the team section limits the list of treatments
  const visibleServices = practitionerId ? services.filter((s) => practitionersFor(catalog, s).some((p) => p.id === practitionerId)) : services;

  useEffect(() => {
    const today = clinicNow().date;
    const list = Array.from({ length: 21 }, (_, i) => addDays(today, i));
    setDays(list);
    setDate((d) => d || (list.find((x) => hoursForDate(c, x)) ?? list[0]));
  }, [c]);

  useEffect(() => {
    if (practitionerId && service && !staff.some((p) => p.id === practitionerId)) setPractitionerId("");
  }, [service, staff, practitionerId]);

  useEffect(() => {
    if (!date || !serviceId) return;
    setAvail(null);
    setTime("");
    assistantApi
      .availability({ clinicId: c.id, serviceId, date, practitionerId: practitionerId || undefined })
      .then(setAvail)
      .catch(() => setAvail({ date, service: service!, slots: [], alternatives: [], rules: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, practitionerId, c.id]);

  const slot = avail?.slots.find((s) => s.time === time);
  const assigned = slot ? catalog.practitioners.find((p) => p.id === (practitionerId || slot.practitionerIds[0])) : undefined;

  if (booked)
    return (
      <div className="container-x max-w-xl py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <h1 className="h-display mt-4 text-3xl">{booked.status === "pending" ? t("Request received") : t("You're booked!")}</h1>
          <p className="mt-3 text-ink-300">
            {t("{service} with {name}", { service: t(booked.serviceName), name: booked.practitionerName })}
            <br />
            {t("{date} at {time}", { date: formatDate(booked.date, locale), time: booked.time })} · {duration(booked.durationMinutes, locale)}
          </p>
          <p className="mt-1 text-sm text-ink-400">
            {t("Reference:")} <strong className="text-white">{booked.reference}</strong>
          </p>
          {booked.status === "pending" && <p className="mt-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{t("New patients are confirmed personally by the clinic – usually within one working day.")}</p>}
          <p className="mt-6 text-xs text-ink-400">{t("Need to move or cancel? Use your reference on the “Manage booking” page – or just tell the AI receptionist.")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/demo/${c.slug}/manage?ref=${booked.reference}`} className="btn-secondary">
              {t("Manage booking")}
            </Link>
            <Link href="/admin/appointments" target="_blank" className="btn-ghost">
              {t("See it in the admin →")}
            </Link>
          </div>
        </div>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const a = await api<Appointment>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          clinicId: c.id,
          source: "website",
          serviceId,
          practitionerId: practitionerId || slot?.practitionerIds[0],
          date,
          time,
          customer: { name: form.name, phone: form.phone, email: form.email || undefined },
          comment: form.comment || undefined,
        }),
      });
      setBooked(a);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const chip = (active: boolean) => `rounded-2xl border px-4 py-3 text-start text-sm transition ${active ? "border-transparent text-ink-950" : "border-white/10 hover:border-white/25"}`;

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
            {c.name}
          </p>
          <h1 className="h-display mt-1 text-4xl sm:text-5xl">{t("Book an appointment")}</h1>
          <p className="mt-2 max-w-lg text-ink-400">{t(c.booking.rules)}</p>
        </div>
        <button onClick={() => openReceptionist(service ? `I'd like to book ${service.name}` : t("I'd like to book an appointment"))} className="btn-secondary">
          <Icon name="sparkles" className="h-4 w-4" /> {t("Let the AI book for you")}
        </button>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card min-w-0 space-y-8 p-5 sm:p-7">
          {/* 1. Treatment */}
          <div>
            <p className="label">{t("1 · Treatment")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleServices.map((s) => (
                <button type="button" key={s.id} onClick={() => setServiceId(s.id)} className={chip(serviceId === s.id)} style={serviceId === s.id ? { background: accent } : undefined}>
                  <span className="flex items-center justify-between gap-2 font-semibold">
                    <span>
                      {s.emoji} {t(s.name)}
                    </span>
                  </span>
                  <span className={`text-xs ${serviceId === s.id ? "text-ink-950/75" : "text-ink-400"}`}>
                    {duration(s.durationMinutes, locale)} · {priceLabel(s, locale)}
                    {s.newClientsOnly ? ` · ${t("new clients")}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {service && (
            <>
              {/* 2. Practitioner */}
              <div>
                <p className="label">{t("2 · Practitioner")}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPractitionerId("")} className={`${chip(!practitionerId)} !py-2.5`} style={!practitionerId ? { background: accent } : undefined}>
                    ✨ {t("First available")}
                  </button>
                  {staff.map((p) => (
                    <button type="button" key={p.id} onClick={() => setPractitionerId(p.id)} className={`${chip(practitionerId === p.id)} flex items-center gap-2 !py-2.5`} style={practitionerId === p.id ? { background: accent } : undefined}>
                      <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-ink-950" style={{ background: p.color }}>
                        {initials(p.name.replace(/^Dr\.\s+/, ""))}
                      </span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Date */}
              <div>
                <p className="label">{t("3 · Date")}</p>
                <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const dt = new Date(`${d}T12:00:00`);
                    const closed = !hoursForDate(c, d);
                    return (
                      <button type="button" key={d} disabled={closed} onClick={() => setDate(d)} className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition disabled:opacity-30 ${date === d ? "border-transparent text-ink-950" : "border-white/10 hover:border-white/25"}`} style={date === d ? { background: accent } : undefined}>
                        <span className="text-[11px] uppercase opacity-80">{dayShort(dt.getDay(), locale)}</span>
                        <span className="text-lg font-semibold">{dt.getDate()}</span>
                        <span className="text-[10px] opacity-70">{monthShort(dt, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Time */}
              <div>
                <p className="label">
                  {t("4 · Time")} {date && <span className="text-ink-400 normal-case">· {formatDate(date, locale)}</span>}
                </p>
                {avail === null ? (
                  <p className="text-sm text-ink-400">{t("Finding free times…")}</p>
                ) : avail.slots.length === 0 ? (
                  <div className="text-sm text-ink-400">
                    <p>{t("No free times this day.")}</p>
                    {avail.alternatives.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {avail.alternatives.map((a) => (
                          <button type="button" key={a.date} onClick={() => setDate(a.date)} className="chip hover:text-white">
                            {formatDate(a.date, locale)} · {t("from {time}", { time: a.times[0] })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {avail.slots.map((s) => (
                      <button type="button" key={s.time} onClick={() => setTime(s.time)} className={`rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition ${time === s.time ? "border-transparent text-ink-950" : "border-white/10 hover:border-white/25"}`} style={time === s.time ? { background: accent } : undefined}>
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="label sm:col-span-2 !mb-0">{t("5 · Your details")}</p>
                <label>
                  <span className="label">{t("Name *")}</span>
                  <input required minLength={2} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </label>
                <label>
                  <span className="label">{t("Phone *")}</span>
                  <input required type="tel" inputMode="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
                </label>
                <label className="sm:col-span-2">
                  <span className="label">{t("Email")}</span>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </label>
                <label className="sm:col-span-2">
                  <span className="label">{t("Anything we should know?")}</span>
                  <textarea rows={3} className="input" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder={t("E.g. injuries, pregnancy, allergies or if you're nervous")} />
                </label>
              </div>
            </>
          )}
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">{t("Your appointment")}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">{t("Treatment")}</dt>
              <dd className="text-end">{service ? t(service.name) : t("Choose a treatment")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">{t("Date")}</dt>
              <dd className="text-end">{date ? formatDate(date, locale) : "–"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">{t("Time")}</dt>
              <dd>{time || t("Choose a time")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">{t("With")}</dt>
              <dd>{assigned?.name ?? (practitionerId ? catalog.practitioners.find((p) => p.id === practitionerId)?.name : t("First available"))}</dd>
            </div>
            {service && (
              <div className="flex justify-between gap-3 border-t border-white/8 pt-2 font-semibold">
                <dt>{t("Price")}</dt>
                <dd>{priceLabel(service, locale)}</dd>
              </div>
            )}
          </dl>
          {error && <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button disabled={!time || sending} className="btn w-full text-ink-950" style={{ background: accent }}>
            {sending ? t("Booking…") : t("Confirm booking")}
          </button>
          <p className="text-xs text-ink-400">{t("You pay at the clinic.")} {c.booking.lateCancellationFee ? t("Free cancellation up to {h} h before.", { h: c.booking.cancellationHours }) : ""}</p>
        </aside>
      </form>
    </div>
  );
}
