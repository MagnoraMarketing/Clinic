"use client";

import { useState } from "react";
import { PARTNER_SHARE, PLATFORM_MONTHLY, PRICES, eur } from "@/lib/demo/catalog";

/** Simple earnings calculator for partners. */
export function PartnerCalculator() {
  const [perMonth, setPerMonth] = useState(4);
  const [months, setMonths] = useState(12);
  const [pkg, setPkg] = useState(PRICES.ai[1].key);
  const ai = PRICES.ai.find((p) => p.key === pkg)!;
  const setup = PRICES.base[0].price + PRICES.addons[0].price; // website + import
  const clinics = perMonth * months;
  // Clinics signed evenly over the period → average active months per clinic
  const activeMonths = perMonth * ((months * (months + 1)) / 2);
  const oneOff = clinics * setup * PARTNER_SHARE;
  const recurring = activeMonths * (PLATFORM_MONTHLY + ai.price) * PARTNER_SHARE;
  const monthlyAtEnd = clinics * (PLATFORM_MONTHLY + ai.price) * PARTNER_SHARE;
  return (
    <div className="grid gap-6 rounded-[32px] border border-white/8 bg-ink-900/80 p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <h2 className="h-display text-3xl">Earnings calculator</h2>
        <label className="block">
          <span className="label">New clinics per month · {perMonth}</span>
          <input type="range" min={1} max={20} value={perMonth} onChange={(e) => setPerMonth(Number(e.target.value))} className="w-full accent-[#3fcfab]" />
        </label>
        <label className="block">
          <span className="label">Period · {months} months</span>
          <input type="range" min={3} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-[#3fcfab]" />
        </label>
        <div>
          <span className="label">Typical AI package</span>
          <div className="grid grid-cols-3 gap-2">
            {PRICES.ai.map((p) => (
              <button key={p.key} type="button" onClick={() => setPkg(p.key)} className={`rounded-2xl border px-3 py-2.5 text-left text-xs transition ${pkg === p.key ? "border-sage-400 bg-sage-400/10" : "border-white/10 hover:border-white/25"}`}>
                <span className="block font-semibold">{p.name.replace("AI minutes · ", "")}</span>
                {eur(p.price)} / {p.unit}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 rounded-3xl bg-gradient-to-br from-sage-400/15 to-ink-950 p-6">
        <Row label={`${clinics} clinics signed`} value="" />
        <Row label="One-off (50 % of website + import)" value={eur(Math.round(oneOff))} />
        <Row label="Recurring over the period" value={eur(Math.round(recurring))} />
        <div className="mt-2 border-t border-white/10 pt-4">
          <p className="text-xs text-ink-400">Total over {months} months</p>
          <p className="h-display text-5xl text-sage-300">{eur(Math.round(oneOff + recurring))}</p>
          <p className="mt-2 text-sm text-ink-300">…and {eur(Math.round(monthlyAtEnd))} per month in recurring income after month {months}.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-300">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
