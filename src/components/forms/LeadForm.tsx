"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { CLINIC_TYPES, PRICES, eur } from "@/lib/demo/catalog";

const ALL = [...PRICES.base, ...PRICES.platform, ...PRICES.addons, ...PRICES.ai];
const isAI = (key: string) => PRICES.ai.some((p) => p.key === key);
const isMonthly = (key: string) => PRICES.platform.some((p) => p.key === key);

export function LeadForm({ preselect = [], type }: { preselect?: string[]; type?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [picked, setPicked] = useState<string[]>(() => ALL.filter((p) => preselect.includes(p.key)).map((p) => p.key));
  const toggle = (k: string) => setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : isAI(k) ? [...prev.filter((x) => !isAI(x)), k] : [...prev, k]));
  const chosen = ALL.filter((p) => picked.includes(p.key));
  const [error, setError] = useState("");
  const oneOff = chosen.filter((c) => !isAI(c.key) && !isMonthly(c.key));
  return status === "done" ? (
    <div className="card grid place-items-center p-10 text-center">
      <p className="text-5xl">🌿</p>
      <p className="h-display mt-4 text-2xl">Thank you! We&apos;ll get back to you within 1 working day.</p>
    </div>
  ) : (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        const data = { ...Object.fromEntries(new FormData(e.currentTarget)), services: chosen.map((c) => `${c.name} (${c.from ? "from " : ""}${eur(c.price)}${c.unit ? ` / ${c.unit}` : ""})`).join(", ") };
        try {
          await api("/api/leads", { method: "POST", body: JSON.stringify(data) });
          setStatus("done");
        } catch (err) {
          setError((err as Error).message);
          setStatus("error");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Name</span>
          <input name="name" required minLength={2} className="input" autoComplete="name" />
        </label>
        <label>
          <span className="label">Clinic</span>
          <input name="clinic" required className="input" autoComplete="organization" />
        </label>
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label>
          <span className="label">Phone</span>
          <input name="phone" type="tel" className="input" autoComplete="tel" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Clinic type</span>
          <select name="type" className="input" defaultValue={CLINIC_TYPES.find((c) => c.slug === type)?.name}>
            {CLINIC_TYPES.map((c) => (
              <option key={c.slug}>{c.name}</option>
            ))}
            <option>Other</option>
          </select>
        </label>
        <label>
          <span className="label">Practitioners</span>
          <select name="practitioners" className="input" defaultValue="2–5">
            <option>Just me</option>
            <option>2–5</option>
            <option>6–15</option>
            <option>16+ / several locations</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="label">What are you interested in?</legend>
        <div className="grid gap-2">
          {ALL.map((p) => (
            <label key={p.key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${picked.includes(p.key) ? "border-sage-500/60 bg-sage-500/10" : "border-white/10 hover:border-white/20"}`}>
              <span className="flex items-center gap-3">
                <input type="checkbox" checked={picked.includes(p.key)} onChange={() => toggle(p.key)} className="accent-[#3fcfab]" />
                {p.emoji} {p.name}
              </span>
              <span className="shrink-0 font-semibold">
                {p.from && <span className="font-normal text-ink-400">from </span>}
                {eur(p.price)}
                {p.unit && <span className="font-normal text-ink-400"> / {p.unit}</span>}
              </span>
            </label>
          ))}
        </div>
        {chosen.length > 0 && (
          <p className="mt-3 text-sm text-ink-300">
            Selected: <strong className="text-white">{oneOff.some((c) => c.from) && "from "}{eur(oneOff.reduce((s, c) => s + c.price, 0))}</strong> one-off
            {chosen.some((c) => isMonthly(c.key)) && <> + {eur(PRICES.platform[0].price)} / month</>}
            {chosen.some((c) => isAI(c.key)) && <> + AI minutes {chosen.filter((c) => isAI(c.key)).map((c) => `${eur(c.price)} / ${c.unit}`).join(" + ")}</>}
          </p>
        )}
      </fieldset>
      <label>
        <span className="label">What would you like to see?</span>
        <textarea name="message" rows={3} className="input" placeholder="E.g. the AI on our phone line, rebookings, or integration with our booking system" />
      </label>
      {status === "error" && <p className="text-sm text-red-300">{error}</p>}
      <button className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Book a demo"}
      </button>
    </form>
  );
}
