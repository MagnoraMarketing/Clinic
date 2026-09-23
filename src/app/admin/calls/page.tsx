"use client";

import { useRef, useState } from "react";
import type { Appointment, Call } from "@/lib/types";
import { api, assistantApi } from "@/lib/client/api";
import { dkk, formatDate, formatDateTime } from "@/lib/format";
import { addDays, clinicNow, hoursForDate } from "@/lib/hours";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { Kpi, PageTitle } from "@/components/admin/AdminShell";
import { OUTCOME } from "@/components/admin/labels";
import { Waveform } from "@/components/landing/Visuals";

const PACKAGE_MIN = 400;
const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const rndPhone = () => `+45 ${Math.floor(20 + Math.random() * 70)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)}`;
const firstName = (n: string) => (n.startsWith("Dr.") ? n.split(" ").slice(0, 3).join(" ") : n.split(" ")[0]);
type Scenario = "booking" | "rebooking" | "cancellation";

export default function CallsPage() {
  const { clinic, catalog } = useAdmin();
  const { data, setData } = usePoll<Call[]>(clinic ? `/api/calls?clinicId=${clinic.id}` : null, 6000);
  const [open, setOpen] = useState<string | null>(null);
  const [live, setLive] = useState<{ lines: Call["transcript"]; from: string; title: string } | null>(null);
  const [note, setNote] = useState("");
  const running = useRef(false);
  const calls = data ?? [];

  const usedMin = Math.round(calls.reduce((s, c) => s + c.durationSec, 0) / 60);
  const count = (o: Call["outcome"]) => calls.filter((c) => c.outcome === o).length;
  const answered = calls.filter((c) => c.outcome !== "missed").length;

  /** Plays a realistic call and performs the real booking/rebooking/cancellation via the API. */
  const simulate = async (scenario: Scenario) => {
    if (!clinic || !catalog || running.current) return;
    running.current = true;
    setNote("");
    const from = rndPhone();
    const greet = `${clinic.name}, you're speaking with the AI receptionist. How can I help?`;
    const play = async (lines: Call["transcript"]) => {
      for (const line of lines) {
        await new Promise((r) => setTimeout(r, 1000));
        setLive((l) => (l ? { ...l, lines: [...l.lines, line] } : l));
      }
    };
    try {
      const today = clinicNow().date;
      let outcome: Call["outcome"] = "booking";
      let summary = "";
      let script: Call["transcript"] = [];
      let appointmentId: string | undefined;

      if (scenario === "booking") {
        const svc = catalog.services.find((s) => s.popular && s.available && !s.newClientsOnly) ?? catalog.services[0];
        let date = addDays(today, 1);
        let slots: { time: string; practitionerIds: string[] }[] = [];
        for (let i = 0; i < 10 && !slots.length; i++, date = addDays(date, 1)) {
          if (!hoursForDate(clinic, date)) continue;
          slots = (await assistantApi.availability({ clinicId: clinic.id, serviceId: svc.id, date })).slots;
          if (slots.length) break;
        }
        if (!slots.length) throw new Error("No free times in the next days");
        const slot = slots[Math.min(2, slots.length - 1)];
        const who = catalog.practitioners.find((p) => p.id === slot.practitionerIds[0])!;
        script = [
          { who: "ai", text: greet },
          { who: "caller", text: `Hi, do you have time for ${svc.name.toLowerCase()} ${date === addDays(today, 1) ? "tomorrow" : "this week"}?` },
          { who: "ai", text: `Yes – ${firstName(who.name)} is free on ${formatDate(date)} at ${slot.time}. It's ${dkk(svc.price)} for ${svc.durationMinutes} minutes. Shall I book it?` },
          { who: "caller", text: "Yes please. It's Mads Holm." },
          { who: "ai", text: `Thanks, Mads. You're booked ✓ You'll get a text confirmation.` },
        ];
        setLive({ lines: [], from, title: "Booking" });
        await play(script);
        const a = await api<Appointment>("/api/appointments", {
          method: "POST",
          body: JSON.stringify({ clinicId: clinic.id, source: "phone", serviceId: svc.id, practitionerId: who.id, date, time: slot.time, customer: { name: "Mads Holm", phone: from } }),
        });
        appointmentId = a.id;
        summary = `Booked ${a.serviceName} with ${a.practitionerName} – ${a.date} at ${a.time} (${a.reference}).`;
      } else {
        const upcoming = (await api<Appointment[]>(`/api/appointments?clinicId=${clinic.id}&from=${addDays(today, 1)}`)).filter((a) => a.status === "confirmed");
        const target = upcoming[Math.floor(Math.random() * upcoming.length)];
        if (!target) throw new Error("No upcoming appointments to change – book one first");
        if (scenario === "rebooking") {
          let date = addDays(target.date, 1);
          let slots: { time: string; practitionerIds: string[] }[] = [];
          for (let i = 0; i < 10; i++, date = addDays(date, 1)) {
            if (!hoursForDate(clinic, date)) continue;
            slots = (await assistantApi.availability({ clinicId: clinic.id, serviceId: target.serviceId, date, practitionerId: target.practitionerId, excludeAppointmentId: target.id })).slots;
            if (slots.length) break;
          }
          if (!slots.length) throw new Error("No free times to move to");
          const slot = slots[Math.floor(slots.length / 2)];
          outcome = "rebooking";
          script = [
            { who: "ai", text: greet },
            { who: "caller", text: `Hi, this is ${target.customer.name.split(" ")[0]}. I need to move my appointment – reference ${target.reference}.` },
            { who: "ai", text: `Found it – ${target.serviceName} on ${formatDate(target.date)} at ${target.time}. Which day suits you better?` },
            { who: "caller", text: "The day after, if possible." },
            { who: "ai", text: `${firstName(target.practitionerName)} is free on ${formatDate(date)} at ${slot.time}. Shall I move it?` },
            { who: "caller", text: "Perfect." },
            { who: "ai", text: "Done ✓ I've moved it and sent you a new confirmation." },
          ];
          setLive({ lines: [], from: target.customer.phone, title: "Rebooking" });
          await play(script);
          const a = await assistantApi.updateAppointment(target.id, { date, time: slot.time, phone: target.customer.phone, source: "phone" });
          appointmentId = a.id;
          summary = `Moved ${a.serviceName} (${a.reference}) from ${target.date} ${target.time} to ${a.date} ${a.time}.`;
        } else {
          outcome = "cancellation";
          script = [
            { who: "ai", text: greet },
            { who: "caller", text: `Hi, I have to cancel my appointment, ${target.reference}. I've come down with the flu.` },
            { who: "ai", text: `Sorry to hear that – get well soon. I've found ${target.serviceName} on ${formatDate(target.date)} at ${target.time}. Would you like to move it instead of cancelling?` },
            { who: "caller", text: "No, just cancel it please. I'll call when I'm better." },
            { who: "ai", text: "It's cancelled ✓ The time is now free for other clients." },
          ];
          setLive({ lines: [], from: target.customer.phone, title: "Cancellation" });
          await play(script);
          const a = await assistantApi.updateAppointment(target.id, { status: "cancelled", phone: target.customer.phone, source: "phone" });
          appointmentId = a.id;
          summary = `Cancelled ${a.serviceName} (${a.reference}) on ${a.date} ${a.time}${a.lateCancellation ? " – late cancellation" : ""}.`;
        }
      }
      const call = await api<Call>("/api/calls", {
        method: "POST",
        body: JSON.stringify({ clinicId: clinic.id, from, channel: "phone", durationSec: 35 + script.length * 9 + Math.floor(Math.random() * 20), outcome, summary, transcript: script, appointmentId }),
      });
      setData((prev) => [call, ...(prev ?? [])]);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setTimeout(() => setLive(null), 1500);
      running.current = false;
    }
  };

  return (
    <>
      <PageTitle
        title="Calls & voice"
        text="Every inbound call and voice-widget conversation handled by the AI receptionist – with outcome and transcript. Simulate a call to see a real booking, rebooking or cancellation happen."
        actions={
          <>
            <button onClick={() => simulate("booking")} disabled={!!live} className="btn-primary">
              📞 Simulate booking call
            </button>
            <button onClick={() => simulate("rebooking")} disabled={!!live} className="btn-secondary">
              🔄 Rebooking call
            </button>
            <button onClick={() => simulate("cancellation")} disabled={!!live} className="btn-secondary">
              ✕ Cancellation call
            </button>
          </>
        }
      />
      {note && <p className="mb-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{note}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Calls" value={String(calls.length)} hint={`${calls.length ? Math.round((answered / calls.length) * 100) : 100}% answered`} />
        <Kpi label="Booked" value={String(count("booking"))} />
        <Kpi label="Moved" value={String(count("rebooking"))} />
        <Kpi label="Cancelled" value={String(count("cancellation"))} hint="slots freed for others" />
        <div className="card p-5">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Minute package</p>
          <p className="h-display mt-2 text-3xl">
            {usedMin} <span className="text-base text-ink-400">/ {PACKAGE_MIN} min</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-sage-400" style={{ width: `${Math.min(100, (usedMin / PACKAGE_MIN) * 100)}%` }} />
          </div>
        </div>
      </div>

      {live && (
        <section className="mt-6 animate-pop overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 to-ink-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /> Live call from {live.from} · {live.title}
            </p>
            <span className="text-xs text-ink-400">The AI receptionist is speaking</span>
          </div>
          <Waveform bars={60} className="my-4" />
          <div className="space-y-2">
            {live.lines.map((l, i) => (
              <p key={i} className={`w-fit max-w-[85%] animate-pop rounded-2xl px-3.5 py-2 text-sm ${l.who === "ai" ? "ml-auto bg-sage-400 text-ink-950" : "bg-ink-800"}`}>
                {l.text}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-6 divide-y divide-white/5">
        {calls.map((c) => (
          <div key={c.id}>
            <button onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-white/[0.02]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-lg">{c.channel === "phone" ? "📞" : "🎙️"}</span>
              <div className="min-w-48 flex-1">
                <p className="font-semibold">
                  {c.from || "Unknown number"} <span className="text-xs font-normal text-ink-400">· {c.channel === "phone" ? "Phone" : "Voice widget"}</span>
                </p>
                <p className="text-sm text-ink-300">{c.summary}</p>
              </div>
              <span className="text-xs text-ink-400 tabular-nums">
                {formatDateTime(c.startedAt)} · {dur(c.durationSec)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${OUTCOME[c.outcome].cls}`}>
                {OUTCOME[c.outcome].icon} {OUTCOME[c.outcome].label}
              </span>
            </button>
            {open === c.id && (
              <div className="space-y-2 bg-ink-850 px-4 py-4 sm:px-16">
                {c.transcript.map((l, i) => (
                  <p key={i} className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${l.who === "ai" ? "ml-auto bg-sage-400/90 text-ink-950" : "bg-ink-800"}`}>
                    <span className="mb-0.5 block text-[10px] font-bold tracking-wider uppercase opacity-70">{l.who === "ai" ? "AI" : "Caller"}</span>
                    {l.text}
                  </p>
                ))}
                {c.transcript.length === 0 && <p className="text-sm text-ink-400">No transcript saved.</p>}
              </div>
            )}
          </div>
        ))}
        {calls.length === 0 && <p className="p-10 text-center text-ink-400">No calls yet. Simulate a call – or connect AIbooking Voice (webhook: call.completed).</p>}
      </section>
    </>
  );
}
