"use client";

import { useEffect, useState } from "react";
import type { BookingRules, Clinic, FaqEntry, OpeningHours } from "@/lib/types";
import { api } from "@/lib/client/api";
import { publicConfig } from "@/lib/config";
import { dayName } from "@/lib/format";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { openReceptionist } from "@/components/widget/events";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";

const FORWARDING = [
  { code: "**61*{n}#", label: "No answer", text: "Calls you don't pick up within ~20 seconds go to the AI. Recommended." },
  { code: "**67*{n}#", label: "Busy", text: "When you're already on the phone, the next caller gets the AI." },
  { code: "**21*{n}#", label: "Always", text: "Every call goes straight to the AI (e.g. outside opening hours)." },
  { code: "##002#", label: "Turn off", text: "Removes all forwarding again." },
];

export default function AiReceptionistPage() {
  const { clinic, catalog, refreshClinic } = useAdmin();
  const [f, setF] = useState<Clinic | null>(null);
  const [saved, setSaved] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => setF(clinic ? structuredClone(clinic) : null), [clinic]);
  if (!f) return null;

  const up = <K extends keyof Clinic>(k: K, v: Clinic[K]) => setF({ ...f, [k]: v });
  const rule = <K extends keyof BookingRules>(k: K, v: BookingRules[K]) => up("booking", { ...f.booking, [k]: v });
  const setHours = (day: number, patch: Partial<OpeningHours>) => up("openingHours", f.openingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  const setFaq = (i: number, patch: Partial<FaqEntry>) => up("faq", f.faq.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const save = async () => {
    setErr("");
    try {
      await api(`/api/clinics/${f.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: f.name, description: f.description, address: f.address, city: f.city, phone: f.phone, parking: f.parking, insurance: f.insurance,
          openingHours: f.openingHours, faq: f.faq, booking: f.booking, widget: f.widget,
        }),
      });
      await refreshClinic();
      setSaved("Saved ✓ – the AI receptionist uses the new information on the next call and chat.");
      setTimeout(() => setSaved(""), 4000);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const aiNumber = f.phone.replace(/\s/g, "");
  const embed = `<script\n  src="${publicConfig.widgetUrl || "https://widget.aibooking.dk/v1/widget.js"}"\n  data-agent-id="${f.widget.chatAgentId || f.widget.agentId || publicConfig.agentId || "AGENT_ID"}"\n  data-clinic-id="${f.id}"\n  data-language="en"\n  async></script>`;
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <PageTitle
        title="AI receptionist"
        text="One AI agent per clinic. Everything here is used on the phone, in the voice widget and in the chat."
        actions={
          <>
            <button onClick={() => openReceptionist(undefined, { voice: true })} className="btn-secondary">
              🎙️ Test voice
            </button>
            <button onClick={save} className="btn-primary">
              Save changes
            </button>
          </>
        }
      />
      {saved && <p className="mb-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{saved}</p>}
      {err && <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Box title="📞 Phone line & call forwarding" wide>
          <p className="text-sm text-ink-300">
            Keep your existing clinic number. Forward calls to your AI number <strong className="text-white">{f.phone}</strong> with a code on your mobile or landline – the AI then answers, books and moves appointments, and transfers to staff when needed.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {FORWARDING.map((x) => (
              <div key={x.code} className="rounded-2xl bg-ink-850 p-4">
                <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{x.label}</p>
                <p className="mt-1 font-mono text-lg text-sage-300">{x.code.replace("{n}", aiNumber)}</p>
                <p className="mt-1 text-xs text-ink-400">{x.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400">GSM codes work on most Danish and European mobile networks. On a PBX/IP phone system, set the forwarding in your phone provider&apos;s portal.</p>
        </Box>

        <Box title="Clinic">
          <In label="Clinic name" value={f.name} onChange={(v) => up("name", v)} />
          <Area label="Description" value={f.description} onChange={(v) => up("description", v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Address" value={f.address} onChange={(v) => up("address", v)} />
            <In label="Postcode & city" value={f.city} onChange={(v) => up("city", v)} />
          </div>
          <In label="Phone number (AI phone line)" value={f.phone} onChange={(v) => up("phone", v)} />
          <In label="Parking & access" value={f.parking} onChange={(v) => up("parking", v)} />
        </Box>

        <Box title="Opening hours">
          {order.map((d) => {
            const h = f.openingHours.find((x) => x.day === d)!;
            return (
              <div key={d} className="grid grid-cols-[90px_1fr_1fr_auto] items-center gap-2 text-sm">
                <span>{dayName(d)}</span>
                <input type="time" className="input !py-2" value={h.open} disabled={h.closed} onChange={(e) => setHours(d, { open: e.target.value })} />
                <input type="time" className="input !py-2" value={h.close} disabled={h.closed} onChange={(e) => setHours(d, { close: e.target.value })} />
                <label className="flex items-center gap-1.5 text-xs text-ink-300">
                  <input type="checkbox" checked={!!h.closed} onChange={(e) => setHours(d, { closed: e.target.checked })} /> Closed
                </label>
              </div>
            );
          })}
        </Box>

        <Box title="Booking & cancellation rules">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.booking.enabled} onChange={(e) => rule("enabled", e.target.checked)} /> Accept bookings via AI & website
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Num label="Start times every (min)" value={f.booking.slotMinutes} onChange={(v) => rule("slotMinutes", v)} />
            <Num label="Buffer between clients" value={f.booking.bufferMinutes} onChange={(v) => rule("bufferMinutes", v)} />
            <Num label="Min. notice (hours)" value={f.booking.minNoticeHours} onChange={(v) => rule("minNoticeHours", v)} />
            <Num label="Book up to (days ahead)" value={f.booking.maxDaysAhead} onChange={(v) => rule("maxDaysAhead", v)} />
            <Num label="Free cancellation until (h)" value={f.booking.cancellationHours} onChange={(v) => rule("cancellationHours", v)} />
            <Num label="Late cancellation fee (DKK)" value={f.booking.lateCancellationFee} onChange={(v) => rule("lateCancellationFee", v)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.booking.confirmNewClients} onChange={(e) => rule("confirmNewClients", e.target.checked)} /> New patients must be approved by the clinic
          </label>
          <Area label="Rules (the AI reads them to the client)" value={f.booking.rules} onChange={(v) => rule("rules", v)} />
        </Box>

        <Box title="Insurance, subsidy & referral">
          <p className="text-sm text-ink-400">What the AI says when a client asks “Is it covered?” or “Do I need a referral?”.</p>
          <Area label="Insurance information" value={f.insurance ?? ""} onChange={(v) => up("insurance", v || undefined)} />
          <p className="text-sm text-ink-400">
            Prices and durations come from{" "}
            <a href="/admin/services" className="font-semibold text-sage-300">
              Services & prices →
            </a>
          </p>
        </Box>

        <Box title="FAQ" wide>
          {f.faq.map((q, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-ink-850 p-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <input className="input !py-2" value={q.question} onChange={(e) => setFaq(i, { question: e.target.value })} placeholder="Question" />
              <input className="input !py-2" value={q.answer} onChange={(e) => setFaq(i, { answer: e.target.value })} placeholder="Answer" />
              <button onClick={() => up("faq", f.faq.filter((_, idx) => idx !== i))} className="text-xs text-red-300">
                Remove
              </button>
              <input className="input !py-2 sm:col-span-3" value={q.keywords.join(", ")} onChange={(e) => setFaq(i, { keywords: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) })} placeholder="Keywords (comma separated)" />
            </div>
          ))}
          <button onClick={() => up("faq", [...f.faq, { question: "", answer: "", keywords: [] }])} className="btn-secondary w-fit">
            + Add question
          </button>
        </Box>

        <Box title="Agent & voice widget">
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Agent ID" value={f.widget.agentId ?? ""} onChange={(v) => up("widget", { ...f.widget, agentId: v || undefined })} />
            <In label="Voice agent ID" value={f.widget.voiceAgentId ?? ""} onChange={(v) => up("widget", { ...f.widget, voiceAgentId: v || undefined })} />
            <In label="Chat agent ID" value={f.widget.chatAgentId ?? ""} onChange={(v) => up("widget", { ...f.widget, chatAgentId: v || undefined })} />
            <label>
              <span className="label">Position</span>
              <select className="input" value={f.widget.position} onChange={(e) => up("widget", { ...f.widget, position: e.target.value as "bottom-right" })}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </label>
            <label>
              <span className="label">Theme</span>
              <select className="input" value={f.widget.theme} onChange={(e) => up("widget", { ...f.widget, theme: e.target.value as "dark" })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label>
              <span className="label">Colour</span>
              <input type="color" className="input !h-12 !p-1" value={f.widget.accentColor} onChange={(e) => up("widget", { ...f.widget, accentColor: e.target.value })} />
            </label>
          </div>
          <Area label="Welcome message" value={f.widget.welcomeMessage} onChange={(v) => up("widget", { ...f.widget, welcomeMessage: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.widget.enabled} onChange={(e) => up("widget", { ...f.widget, enabled: e.target.checked })} /> Widget active on the website
          </label>
        </Box>

        <Box title="Embed on your own website">
          <p className="text-sm text-ink-400">Paste into your existing website – WordPress, Wix, Squarespace, Shopify or your own design.</p>
          <pre className="overflow-x-auto rounded-2xl bg-ink-950 p-4 text-xs text-emerald-200 ring-1 ring-white/8">{embed}</pre>
        </Box>
      </div>
      {clinic && catalog && <AIbookingWidget clinic={clinic} catalog={catalog} />}
    </>
  );
}

function Box({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`card space-y-3 p-5 ${wide ? "xl:col-span-2" : ""}`}>
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
const In = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="label">{label}</span>
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);
const Area = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="label">{label}</span>
    <textarea rows={3} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);
const Num = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="block">
    <span className="label">{label}</span>
    <input type="number" min={0} className="input" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
  </label>
);
