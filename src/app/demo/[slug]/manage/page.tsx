"use client";

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
          <h1 className="h-display mt-4 text-3xl">{done.a.status === "cancelled" ? "Appointment cancelled" : "Appointment moved"}</h1>
          <p className="mt-3 text-ink-300">{done.text}</p>
          <p className="mt-1 text-sm text-ink-400">Reference {done.a.reference}</p>
        </div>
      </div>
    );

  const late = selected ? hoursUntil(selected.date, selected.time) < c.booking.cancellationHours : false;

  return (
    <div className="container-x max-w-3xl py-10 sm:py-14">
      <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
        {c.name}
      </p>
      <h1 className="h-display mt-1 text-4xl sm:text-5xl">Move or cancel your appointment</h1>
      <p className="mt-2 text-ink-400">{c.booking.rules}</p>

      {!found && (
        <form onSubmit={lookup} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label>
            <span className="label">Booking reference</span>
            <input required className="input uppercase" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. CA-4201" />
          </label>
          <label>
            <span className="label">Phone number</span>
            <input required type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="The number you booked with" />
          </label>
          <button disabled={busy} className="btn text-ink-950" style={{ background: accent }}>
            {busy ? "Finding…" : "Find booking"}
          </button>
          {error && <p className="text-sm text-red-300 sm:col-span-3">{error}</p>}
          <p className="text-xs text-ink-400 sm:col-span-3">
            Don&apos;t have your reference?{" "}
            <button type="button" onClick={() => openReceptionist("I need to move my appointment")} className="font-semibold underline" style={{ color: accent }}>
              Ask the AI receptionist
            </button>{" "}
            or call {c.phone}.
          </p>
        </form>
      )}

      {found && !selected && (
        <div className="mt-8 grid gap-3">
          {found.map((a) => (
            <button key={a.id} onClick={() => setSelected(a)} className="card flex items-center justify-between gap-3 p-5 text-left hover:border-white/20">
              <span>
                <span className="block font-semibold">{a.serviceName}</span>
                <span className="text-sm text-ink-400">
                  {formatDate(a.date)} · {a.time} · {a.practitionerName}
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
              <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Your appointment · {selected.reference}</p>
              <p className="mt-1 text-lg font-semibold">{selected.serviceName}</p>
              <p className="text-sm text-ink-300">
                {formatDate(selected.date)} at {selected.time} · {duration(selected.durationMinutes)} · with {selected.practitionerName}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode("move")} className={`btn !py-2.5 ${mode === "move" ? "text-ink-950" : "btn-secondary"}`} style={mode === "move" ? { background: accent } : undefined}>
                <Icon name="refresh" className="h-4 w-4" /> Move
              </button>
              <button onClick={() => setMode("cancel")} className={`btn !py-2.5 ${mode === "cancel" ? "bg-red-400 text-ink-950" : "btn-secondary"}`}>
                <Icon name="close" className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>

          {mode === "move" && (
            <div className="card space-y-5 p-5">
              <div>
                <p className="label">New date</p>
                <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const dt = new Date(`${d}T12:00:00`);
                    return (
                      <button key={d} disabled={!hoursForDate(c, d)} onClick={() => setDate(d)} className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition disabled:opacity-30 ${date === d ? "border-transparent text-ink-950" : "border-white/10 hover:border-white/25"}`} style={date === d ? { background: accent } : undefined}>
                        <span className="text-[10px] uppercase opacity-80">{dayShort(dt.getDay())}</span>
                        <span className="font-semibold">{dt.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {date && (
                <div>
                  <p className="label">New time · {formatDate(date)}</p>
                  {!avail ? (
                    <p className="text-sm text-ink-400">Finding free times…</p>
                  ) : avail.slots.length === 0 ? (
                    <p className="text-sm text-ink-400">No free times this day{avail.alternatives[0] ? ` – next free: ${formatDate(avail.alternatives[0].date)} from ${avail.alternatives[0].times[0]}` : ""}.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {avail.slots.map((s) => (
                        <button
                          key={s.time}
                          disabled={busy}
                          onClick={() => update({ date, time: s.time }, (a) => `Your ${a.serviceName.toLowerCase()} is now on ${formatDate(a.date)} at ${a.time} with ${a.practitionerName}.`)}
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
                  It&apos;s less than {c.booking.cancellationHours} hours until your appointment, so the late cancellation fee of {dkk(c.booking.lateCancellationFee)} applies. Moving it instead is free.
                </p>
              ) : (
                <p className="text-sm text-ink-300">Cancellation is free. The time will be released for other clients.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => update({ status: "cancelled" }, (a) => `${a.serviceName} on ${formatDate(a.date)} at ${a.time} has been cancelled.`)} className="btn bg-red-400 text-ink-950">
                  Yes, cancel it
                </button>
                <button onClick={() => setMode("move")} className="btn-secondary">
                  Move it instead
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
