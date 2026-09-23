import type { Metadata } from "next";
import Link from "next/link";
import { PartnerCalculator } from "@/components/forms/PartnerCalculator";
import { getT } from "@/lib/i18n/server";
import { PARTNER_SHARE, PLATFORM_MONTHLY, eur } from "@/lib/demo/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Partner programme") };
}

const STEPS = [
  ["🤝", "Sign the clinic", "Show the demo on your phone – let the owner call the AI and move a test booking."],
  ["📥", "We import", "Send us the price list, team and opening hours. We build the AI agent and the calendar."],
  ["📞", "Forward the phone", "The clinic forwards busy / no-answer calls to its AI number – 2 minutes with a code."],
  ["💸", "Get paid monthly", "You get {pct} % of the sale and {pct} % of the subscription – every month the clinic stays."],
];

export default async function PartnerPage() {
  const { t } = await getT();
  return (
    <section className="container-x pt-32 pb-24">
      <span className="eyebrow">{t("Partner programme")}</span>
      <h1 className="h-display mt-5 max-w-3xl text-4xl sm:text-6xl">{t("Sell the AI receptionist every clinic needs")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-300">
        {t("Massage therapists, hairdressers, chiropractors, physios, dentists, skin and foot clinics all have the same problem: they can't answer the phone while they work. You bring the solution – we deliver it.")}
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([e, title, text], i) => (
          <div key={title} className="card p-6">
            <p className="flex items-center justify-between">
              <span className="text-3xl">{e}</span>
              <span className="text-xs font-bold text-ink-400">0{i + 1}</span>
            </p>
            <h2 className="mt-4 font-semibold">{t(title)}</h2>
            <p className="mt-1 text-sm text-ink-400">{t(text, { pct: PARTNER_SHARE * 100 })}</p>
          </div>
        ))}
      </div>
      <div className="mt-12">
        <PartnerCalculator />
      </div>
      <p className="mt-8 text-sm text-ink-400">
        {t("Recurring: {amount} per clinic per month from the platform subscription, plus {pct} % of every AI minute package the clinic buys.", { amount: eur(PLATFORM_MONTHLY * PARTNER_SHARE), pct: PARTNER_SHARE * 100 })}{" "}
        <Link href="/contact" className="font-semibold text-sage-300">
          {t("Become a partner →")}
        </Link>
      </p>
    </section>
  );
}
