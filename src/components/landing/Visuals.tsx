"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Catalog, Clinic } from "@/lib/types";
import { duration, initials, priceLabel } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Icon } from "@/components/ui/Icon";
import { openReceptionist } from "@/components/widget/events";
import { QrCode } from "./QrCode";

// Visual illustrations for the home page sections. Everything is HTML/CSS (no
// screenshots), so it's crisp on every screen and follows each clinic's colours.

export function BrowserFrame({ url, children, className = "" }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[22px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/8 bg-ink-850 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 flex-1 truncate rounded-full bg-ink-950 px-3 py-1 text-center text-[11px] text-ink-400">🔒 {url}</span>
      </div>
      {children}
    </div>
  );
}

/** Example clinic website (Calm Hands) – used at the top of the home page. */
export function ClinicSitePreview({ clinic, catalog }: { clinic: Clinic; catalog: Catalog }) {
  const accent = clinic.accentColor;
  const featured = [...catalog.services.filter((s) => s.popular), ...catalog.services.filter((s) => !s.popular)].slice(0, 3);
  return (
    <div className="bg-ink-950">
      <div className="flex items-center justify-between px-5 py-3 text-xs">
        <span className="font-display text-base font-semibold">
          {clinic.emoji} {clinic.name}
        </span>
        <span className="hidden gap-4 text-ink-300 sm:flex">
          <span>Treatments</span>
          <span>Prices</span>
          <span>Team</span>
        </span>
        <span className="rounded-full px-3 py-1 font-semibold text-ink-950" style={{ background: accent }}>
          Book
        </span>
      </div>
      <div className="relative h-52 sm:h-64">
        <Photo src={clinic.heroImage} alt={clinic.name} emoji={clinic.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <p className="font-display text-3xl font-semibold sm:text-4xl">{clinic.name}</p>
          <p className="text-sm text-white/75">{clinic.tagline}</p>
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <span className="rounded-full px-3 py-1.5 text-ink-950" style={{ background: accent }}>
              📅 Book online
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">🔄 Move booking</span>
            <span className="hidden rounded-full bg-white/10 px-3 py-1.5 sm:inline">📞 Call</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {featured.map((s) => (
          <div key={s.id} className="rounded-xl bg-ink-900 p-3 ring-1 ring-white/8">
            <p className="text-lg">{s.emoji}</p>
            <p className="mt-1 truncate text-[11px] font-semibold">{s.name}</p>
            <p className="text-[10px] text-ink-400">
              {duration(s.durationMinutes)} · {priceLabel(s)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small notifications that "pop" in over the hero mock-up. */
export function LiveNotifications() {
  const items = [
    { icon: "📞", title: "Incoming call", text: "AI receptionist answering…", cls: "border-sky-400/30" },
    { icon: "✓", title: "New booking · CA-4218", text: "Deep tissue 60 min · Thu 16:30", cls: "border-emerald-400/30" },
    { icon: "🔄", title: "Moved by AI", text: "Mon 10:00 → Wed 14:15", cls: "border-sand-400/40" },
    { icon: "✕", title: "Cancelled in time", text: "Slot freed for new bookings", cls: "border-red-300/30" },
  ];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setShown((n) => (n >= items.length ? 1 : n + 1)), 2200);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="pointer-events-none space-y-2">
      {items.slice(0, shown).map((n) => (
        <div key={n.title} className={`flex w-60 animate-slide-in items-center gap-3 rounded-2xl border bg-ink-900/95 p-3 shadow-xl backdrop-blur ${n.cls}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-base">{n.icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{n.title}</span>
            <span className="block truncate text-[11px] text-ink-400">{n.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Waveform({ bars = 28, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex h-12 items-center justify-center gap-1 ${className}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="w-1 animate-wave rounded-full bg-gradient-to-t from-sage-600 to-sage-300" style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
      ))}
    </div>
  );
}

export function VoiceWidgetVisual() {
  return (
    <BrowserFrame url="your-clinic.com" className="relative">
      <div className="relative h-[380px] bg-gradient-to-br from-ink-900 to-ink-950 p-6">
        <div className="space-y-3 opacity-40">
          <div className="h-5 w-40 rounded-full bg-white/10" />
          <div className="h-3 w-64 rounded-full bg-white/10" />
          <div className="h-3 w-52 rounded-full bg-white/10" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
        <div className="absolute right-5 bottom-5 w-72 rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
          <p className="text-sm font-semibold">🎙️ Talk to us</p>
          <p className="text-xs text-ink-400">The AI receptionist is listening…</p>
          <Waveform className="mt-4" />
          <p className="mt-3 rounded-2xl bg-ink-800 px-3 py-2 text-xs text-white/85">“Can I move my haircut to Saturday morning?”</p>
          <p className="mt-2 rounded-2xl bg-sage-400 px-3 py-2 text-xs text-ink-950">“Done! You're now booked Saturday at 10:00 with Ida ✓”</p>
          <button onClick={() => openReceptionist(undefined, { voice: true })} className="pointer-events-auto mt-4 w-full rounded-full bg-white py-2 text-xs font-bold text-ink-950">
            Try voice now
          </button>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Day calendar with practitioner columns – shows durations, buffers and a fresh AI booking. */
export function BookingVisual() {
  const staff = [
    { name: "Sofie", color: "#3fcfab" },
    { name: "Jonas", color: "#7aa7ff" },
    { name: "Amira", color: "#f2b880" },
  ];
  const hours = ["09", "10", "11", "12", "13", "14", "15"];
  const blocks: { col: number; start: number; len: number; label: string; ai?: boolean; moved?: boolean }[] = [
    { col: 0, start: 0, len: 1, label: "Classic 60" },
    { col: 0, start: 1.25, len: 1, label: "Deep tissue", ai: true },
    { col: 0, start: 3.5, len: 1.5, label: "Massage 90" },
    { col: 1, start: 0.5, len: 0.75, label: "Sports 45" },
    { col: 1, start: 2, len: 1, label: "Deep tissue", moved: true },
    { col: 1, start: 4.25, len: 0.5, label: "30 min" },
    { col: 2, start: 1, len: 1.25, label: "Hot stone 75" },
    { col: 2, start: 3, len: 1, label: "Pregnancy", ai: true },
  ];
  const H = 44;
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Thursday · Calm Hands</p>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs">3 therapists · 15 min buffer</span>
      </div>
      <div className="mt-4 grid grid-cols-[34px_repeat(3,1fr)] gap-2 text-[11px]">
        <span />
        {staff.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded-full text-[9px] text-ink-950" style={{ background: s.color }}>
              {s.name[0]}
            </span>
            {s.name}
          </span>
        ))}
        <div className="relative" style={{ height: hours.length * H }}>
          {hours.map((h, i) => (
            <span key={h} className="absolute text-ink-400 tabular-nums" style={{ top: i * H - 6 }}>
              {h}:00
            </span>
          ))}
        </div>
        {staff.map((s, col) => (
          <div key={s.name} className="relative rounded-xl bg-white/[0.03]" style={{ height: hours.length * H }}>
            {hours.map((_, i) => (
              <span key={i} className="absolute inset-x-0 border-t border-white/5" style={{ top: i * H }} />
            ))}
            {blocks
              .filter((b) => b.col === col)
              .map((b) => (
                <div
                  key={b.label + b.start}
                  className={`absolute inset-x-1 overflow-hidden rounded-lg px-1.5 py-1 leading-tight ${b.ai ? "ring-2 ring-white/70" : ""}`}
                  style={{ top: b.start * H + 2, height: b.len * H - 4, background: `color-mix(in oklab, ${s.color} ${b.ai ? 55 : 28}%, #0c1816)` }}
                >
                  <span className="block truncate font-semibold">{b.label}</span>
                  {b.ai && <span className="block truncate text-[9.5px] opacity-80">🎙️ booked by AI</span>}
                  {b.moved && <span className="block truncate text-[9.5px] opacity-80">🔄 moved by AI</span>}
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm">
        <Icon name="check" className="h-5 w-5 shrink-0 text-emerald-300" />
        <span>
          <strong>Booked by phone</strong> – deep tissue with Sofie 10:15–11:15 · ref. CA-4218
        </span>
      </div>
    </div>
  );
}

/** Phone mock-up: an appointment moved from one time to another, plus a late cancellation note. */
export function RebookingVisual() {
  return (
    <div className="relative grid items-center gap-6 sm:grid-cols-2">
      <div className="mx-auto w-[270px] rounded-[40px] border-[9px] border-ink-800 bg-ink-950 p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-ink-800" />
        <p className="text-center text-[11px] text-ink-400">SMS · Studio Nord Hair</p>
        <div className="mt-3 space-y-2 text-[12px]">
          <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2">You&apos;re booked: Women&apos;s cut with Ida, Thu 11:00. Ref. ST-4211.</p>
          <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-sage-400 px-3 py-2 text-ink-950">Can I move it to Saturday morning?</p>
          <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2">Ida is free Sat 10:00 or 11:15. Which one?</p>
          <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-sage-400 px-3 py-2 text-ink-950">10:00 👍</p>
          <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2">Moved ✓ Sat 10:00 with Ida.</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Change log · ST-4211</p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="rounded-xl bg-white/5 px-3 py-2 text-ink-400 line-through">Thu 11:00</span>
            <Icon name="arrow" className="h-4 w-4 text-sage-400" />
            <span className="rounded-xl bg-sage-400/15 px-3 py-2 font-semibold text-sage-200">Sat 10:00</span>
          </div>
          <p className="mt-2 text-xs text-ink-400">🎙️ by AI voice · 2 min ago · Thu 11:00 is free again</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Cancellation · CA-4209</p>
          <p className="mt-2 text-sm">“I&apos;m ill and can&apos;t come tomorrow.”</p>
          <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">Less than 24 h before → AI explains the DKK 300 fee and offers to move it instead.</p>
        </div>
      </div>
    </div>
  );
}

/** Price list + AI answer bubble. */
export function PricesVisual({ catalog }: { catalog: Catalog }) {
  const list = catalog.services.slice(0, 6);
  return (
    <div className="relative">
      <div className="card p-5 sm:p-6">
        <p className="font-semibold">Price list · synced to the AI</p>
        <ul className="mt-4 divide-y divide-white/5 text-sm">
          {list.map((s, i) => (
            <li key={s.id} className={`flex items-center justify-between gap-3 py-2.5 ${i === 2 ? "rounded-xl bg-sage-400/10 px-2 ring-1 ring-sage-400/30" : ""}`}>
              <span className="min-w-0 truncate">
                {s.emoji} {s.name}
              </span>
              <span className="shrink-0 text-ink-400">{duration(s.durationMinutes)}</span>
              <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{priceLabel(s)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -right-2 -bottom-8 w-72 rounded-3xl border border-white/10 bg-ink-900 p-4 shadow-2xl sm:-right-6">
        <p className="rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2 text-xs">“How much is a deep tissue massage – and does my insurance cover it?”</p>
        <p className="mt-2 rounded-2xl rounded-br-md bg-sage-400 px-3 py-2 text-xs text-ink-950">
          “60 minutes is DKK 695. It&apos;s covered by Sygeforsikringen danmark groups 1, 2 and 5 – shall I find you a time?”
        </p>
      </div>
    </div>
  );
}

export function ReviewsVisual({ slug, name }: { slug: string; name: string }) {
  const href = `/demo/${slug}/book`;
  return (
    <div className="relative grid items-end gap-6 sm:grid-cols-2">
      <div className="relative mx-auto w-60">
        <div className="rounded-t-3xl rounded-b-lg bg-cream p-5 text-ink-950 shadow-2xl">
          <p className="text-center font-display text-lg font-semibold">{name}</p>
          <p className="text-center text-[11px] text-ink-600">Scan to book your next visit</p>
          <div className="mx-auto mt-3 h-36 w-36 rounded-xl bg-white p-1.5">
            <QrCode value={href} className="h-full w-full" />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-ink-950 py-1.5 text-[11px] font-semibold text-white">
            <span className="relative grid h-5 w-5 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-sage-500/40" />
              📶
            </span>
            NFC · Tap & leave us ⭐⭐⭐⭐⭐
          </div>
        </div>
        <div className="mx-auto h-3 w-52 rounded-b-xl bg-black/40" />
      </div>
      <div className="mx-auto w-56 rounded-[36px] border-[8px] border-ink-800 bg-ink-950 p-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-ink-800" />
        <p className="text-xs font-semibold">Google reviews</p>
        <p className="mt-1 font-display text-3xl font-semibold">4.9 ★</p>
        <p className="text-[10px] text-ink-400">312 reviews · +46 this month via NFC</p>
        {["Best massage in Østerbro!", "Booked by phone at 22:00 – the AI sorted it.", "Lovely, calm clinic."].map((r) => (
          <p key={r} className="mt-2 rounded-xl bg-ink-900 px-2 py-2 text-[11px]">
            ⭐⭐⭐⭐⭐ <span className="block text-ink-300">{r}</span>
          </p>
        ))}
      </div>
      <Link href={href} className="absolute -top-3 right-0 hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-950 shadow-xl sm:block">
        Open as client →
      </Link>
    </div>
  );
}

export function WebsitesVisual({ clinics }: { clinics: Clinic[] }) {
  return (
    <div className="relative h-[380px]">
      {clinics.slice(1, 4).map((c, i) => (
        <Link key={c.id} href={`/demo/${c.slug}`} className="absolute w-[78%] transition hover:z-10 hover:-translate-y-2" style={{ left: `${i * 11}%`, top: `${i * 70}px`, zIndex: 3 - i }}>
          <BrowserFrame url={`${c.slug.replace(/-/g, "")}.dk`}>
            <div className="relative h-40">
              <Photo src={c.heroImage} alt={c.name} emoji={c.emoji} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="font-display text-xl font-semibold">{c.name}</p>
                <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold text-ink-950" style={{ background: c.accentColor }}>
                  Book · Prices · Team
                </span>
              </div>
            </div>
          </BrowserFrame>
        </Link>
      ))}
    </div>
  );
}

/** Visual preview of the backend: calls, bookings, KPIs. */
export function BackendPreview() {
  const calls = [
    { t: "09:42", who: "+45 22 •• •• 18", o: "Booked", c: "bg-emerald-400/15 text-emerald-300", d: "1:28" },
    { t: "09:38", who: "Voice widget", o: "Moved", c: "bg-sand-400/15 text-sand-300", d: "0:58" },
    { t: "09:31", who: "+45 31 •• •• 04", o: "Price question", c: "bg-sky-400/15 text-sky-300", d: "0:27" },
    { t: "09:25", who: "+45 40 •• •• 77", o: "Cancelled", c: "bg-red-400/15 text-red-300", d: "0:41" },
  ];
  return (
    <BrowserFrame url="app.aibooking.dk/admin">
      <div className="grid grid-cols-[120px_1fr] text-[11px] sm:grid-cols-[150px_1fr]">
        <aside className="space-y-1 border-r border-white/8 bg-ink-900/60 p-3">
          {["📊 Dashboard", "📞 Calls", "📅 Appointments", "🏷️ Services", "👩‍⚕️ Team", "👥 Clients", "⭐ QR & NFC", "✨ AI receptionist"].map((n, i) => (
            <p key={n} className={`rounded-lg px-2 py-1.5 ${i === 1 ? "bg-white/8 font-semibold text-white" : "text-ink-400"}`}>
              {n}
            </p>
          ))}
        </aside>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Calls today", "38"],
              ["Answered", "100%"],
              ["Booked by AI", "21"],
              ["Rebookings", "9"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-ink-850 p-2.5">
                <p className="text-[10px] text-ink-400">{l}</p>
                <p className="font-display text-base font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-ink-850 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Live call</p>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />1 in progress
              </span>
            </div>
            <Waveform bars={40} className="!h-8" />
            <p className="mt-2 text-ink-300">“…could I move my Thursday appointment to Friday morning?”</p>
          </div>
          <div className="divide-y divide-white/5 rounded-xl bg-ink-850">
            {calls.map((c) => (
              <div key={c.t} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-ink-400 tabular-nums">{c.t}</span>
                <span className="flex-1 truncate">{c.who}</span>
                <span className="text-ink-400 tabular-nums">{c.d}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${c.c}`}>{c.o}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Flow: channels → AI receptionist → outcome → calendar. */
export function ChannelFlow() {
  const channels = [
    ["📞", "Phone calls"],
    ["🎙️", "Voice widget"],
    ["💬", "Chat"],
    ["🔳", "QR at reception"],
    ["🌐", "Website"],
  ];
  const outcomes = [
    ["📅", "New booking"],
    ["🔄", "Rebooking"],
    ["✕", "Cancellation"],
    ["🏷️", "Price & insurance answer"],
  ];
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <div className="grid gap-2">
        {channels.map(([e, label]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
            <span className="text-lg">{e}</span>
            {label}
          </div>
        ))}
      </div>
      <Arrow />
      <div className="relative mx-auto grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br from-sage-300 to-sage-700 text-center text-ink-950 shadow-2xl shadow-sage-600/30">
        <span className="absolute inset-0 animate-pulse-ring rounded-full" />
        <div>
          <p className="text-4xl">✨</p>
          <p className="mt-2 font-display text-xl font-semibold">AI receptionist</p>
          <p className="text-xs text-ink-950/70">understands · checks · books</p>
        </div>
      </div>
      <Arrow />
      <div className="grid gap-2">
        {outcomes.map(([e, label]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
            <span className="text-lg">{e}</span>
            {label}
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">🗓️ Straight into your calendar / system</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-sage-400" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-8 w-8 rotate-90 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </svg>
    </div>
  );
}

/** Team strip for clinic pages. */
export function TeamAvatars({ catalog, size = "h-10 w-10" }: { catalog: Catalog; size?: string }) {
  return (
    <div className="flex -space-x-2">
      {catalog.practitioners.map((p) => (
        <span key={p.id} title={p.name} className={`grid ${size} place-items-center rounded-full border-2 border-ink-950 text-xs font-bold text-ink-950`} style={{ background: p.color }}>
          {initials(p.name.replace(/^Dr\.\s+/, ""))}
        </span>
      ))}
    </div>
  );
}
