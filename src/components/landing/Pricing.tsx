"use client";

import { useT } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { PARTNER_SHARE, PLATFORM_MONTHLY, PRICES, eur, type PriceItem } from "@/lib/demo/catalog";
import { Icon } from "@/components/ui/Icon";

/** Pricing overview: website + platform + add-ons + AI minute packages. */
export function Pricing() {
  const t = useT();
  const base = PRICES.base[0];
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Base package */}
        <div className="relative flex flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-sage-300 via-sage-500 to-sage-700 p-8 text-ink-950 shadow-2xl shadow-sage-600/25">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/20 blur-2xl" />
          <span className="w-fit rounded-full bg-ink-950 px-3 py-1 text-[11px] font-bold text-white">{t("Start here")}</span>
          <p className="mt-5 text-4xl">{base.emoji}</p>
          <h3 className="h-display mt-3 text-3xl">{t(base.name)}</h3>
          <p className="mt-2 max-w-md text-ink-950/80">{t(base.text)}</p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-ink-950/70">{t("from")}</span>
            <span className="h-display text-6xl">{eur(base.price)}</span>
          </p>
          <p className="mt-1 text-sm text-ink-950/75">{t("+ add-ons as needed · platform {price} / month", { price: eur(PLATFORM_MONTHLY) })}</p>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            {["Calm, mobile-friendly design", "Treatments & price list", "Team & opening hours", "Your own domain", "Online booking built in", "Ready for the AI receptionist"].map((x) => (
              <li key={x} className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" /> {t(x)}
              </li>
            ))}
          </ul>
          <Link href={`/contact?package=${encodeURIComponent(base.key)}`} className="btn mt-8 w-fit bg-ink-950 !px-7 text-white hover:bg-ink-800">
            {t("Order a website")}
          </Link>
        </div>

        <div className="grid gap-5">
          <PriceGroup title="Platform · monthly" items={PRICES.platform} highlight />
          <PriceGroup title="Add-ons" items={PRICES.addons} />
        </div>
      </div>

      {/* AI minute packages */}
      <div className="mt-5 rounded-[28px] border border-white/8 bg-ink-900/80 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{t("AI receptionist · minute packages")}</p>
            <p className="mt-1 text-sm text-ink-300">{t("Minutes are shared between inbound calls and the voice widget. Chat is included.")}</p>
          </div>
          <span className="chip">{t("📞 Phone + 🎙️ Voice widget")}</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PRICES.ai.map((p) => (
            <div key={p.key} className={`relative rounded-3xl border p-5 ${p.highlight ? "border-sage-400/50 bg-sage-400/[0.07]" : "border-white/8 bg-ink-950/50"}`}>
              {p.highlight && <span className="absolute -top-2.5 end-5 rounded-full bg-sage-400 px-2.5 py-0.5 text-[10px] font-bold text-ink-950 uppercase">{t("Most popular")}</span>}
              <p className="text-2xl">{p.emoji}</p>
              <p className="mt-2 font-semibold">{t(p.name.replace("AI minutes · ", ""))}</p>
              <p className="mt-1 text-sm text-ink-400">{t(p.text)}</p>
              <p className="mt-4">
                <span className="font-display text-4xl font-semibold">{eur(p.price)}</span>
                <span className="text-sm text-ink-400"> / {t(p.unit ?? "")}</span>
              </p>
              <Link href={`/contact?package=${p.key}`} className={`${p.highlight ? "btn-primary" : "btn-secondary"} mt-4 w-full !py-2.5`}>
                {t("Choose {plan}", { plan: t(p.name.replace("AI minutes · ", "")) })}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Partners: 50 % of sales and subscription */}
      <div className="mt-5 flex flex-col items-start gap-4 rounded-[28px] border border-white/8 bg-gradient-to-r from-ink-900 to-sage-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sage-500/15 text-2xl">🤝</span>
          <div>
            <p className="font-semibold">{t("Sell AIbooking Clinic as a partner")}</p>
            <p className="mt-0.5 text-sm text-ink-400">
              {t("You get {pct} % of the sale – and {pct} % of the subscription every month ({amount} per clinic / month).", { pct: PARTNER_SHARE * 100, amount: eur(PLATFORM_MONTHLY * PARTNER_SHARE) })}
            </p>
          </div>
        </div>
        <Link href="/partner" className="btn-secondary shrink-0 !py-2.5">
          {t("See the partner programme →")}
        </Link>
      </div>
    </>
  );
}

function PriceGroup({ title, items, highlight }: { title: string; items: PriceItem[]; highlight?: boolean }) {
  const t = useT();
  return (
    <div className={`rounded-[28px] border p-6 ${highlight ? "border-sage-500/30 bg-sage-500/[0.06]" : "border-white/8 bg-ink-900/80"}`}>
      <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{t(title)}</p>
      <ul className="mt-4 divide-y divide-white/8">
        {items.map((i) => (
          <li key={i.key} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-xl">{i.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(i.name)}</p>
              <p className="mt-0.5 text-sm text-ink-400">{t(i.text)}</p>
            </div>
            <p className="shrink-0 text-end">
              {i.from && <span className="block text-xs text-ink-400">{t("from")}</span>}
              <span className="font-display text-2xl font-semibold">{eur(i.price)}</span>
              {i.unit && <span className="block text-xs text-ink-400">{t("per {unit}", { unit: t(i.unit) })}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
