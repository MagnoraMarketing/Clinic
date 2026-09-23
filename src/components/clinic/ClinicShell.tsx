"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Link from "next/link";
import { createContext, useContext } from "react";
import type { Catalog, Clinic } from "@/lib/types";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";
import { groupedHours } from "@/lib/hours";
import { telHref } from "@/lib/format";

const Ctx = createContext<{ clinic: Clinic; catalog: Catalog } | null>(null);

export function useClinic() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useClinic requires ClinicShell");
  return c;
}

/**
 * The clinic's own website (own brand, own colours). AIbooking only sits in the
 * background: the widget and a discreet "Powered by AIbooking".
 */
export function ClinicShell({ clinic, catalog, children }: { clinic: Clinic; catalog: Catalog; children: React.ReactNode }) {
  const { t, locale } = useI18n();
  const accent = clinic.accentColor;
  return (
    <Ctx.Provider value={{ clinic, catalog }}>
      <div style={{ ["--accent" as string]: accent }}>
        <div className="relative z-50 flex items-center justify-center gap-3 bg-gradient-to-r from-sage-600 to-sage-500 px-4 py-2 text-center text-xs font-medium text-ink-950">
          <span>{t("🧪 Demo clinic on AIbooking – no login, bookings land in the admin demo.")}</span>
          <Link href="/" className="shrink-0 font-bold underline underline-offset-2">
            ← {t("Back to AIbooking")}
          </Link>
        </div>
        <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
          <div className="container-x flex h-16 items-center justify-between gap-3">
            <Link href={`/demo/${clinic.slug}`} className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in oklab, ${accent} 25%, transparent)` }}>
                {clinic.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg leading-none font-semibold">{clinic.name}</span>
                <span className="block truncate text-[11px] text-ink-400">{t(clinic.tagline)}</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              <Link href={`/demo/${clinic.slug}#treatments`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Treatments & prices")}</Link>
              <Link href={`/demo/${clinic.slug}#team`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Team")}</Link>
              <Link href={`/demo/${clinic.slug}/manage`} className="rounded-full px-3 py-2 text-ink-300 hover:text-white">{t("Manage booking")}</Link>
            </nav>
            <Link href={`/demo/${clinic.slug}/book`} className="btn !py-2.5 text-ink-950" style={{ background: accent }}>
              {t("Book now")}
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <footer id="info" className="mt-20 border-t border-white/8 bg-ink-900/60">
          <div className="container-x grid gap-8 py-12 sm:grid-cols-3">
            <div>
              <p className="font-display text-xl font-semibold">{clinic.name}</p>
              <p className="mt-2 text-sm text-ink-400">{t(clinic.description)}</p>
              <LanguageSwitcher className="mt-4 w-fit" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">{t("Find us")}</p>
              <p className="mt-2 text-ink-300">
                {clinic.address}
                <br />
                {clinic.city}
              </p>
              <a href={telHref(clinic.phone)} className="mt-2 block text-ink-300 hover:text-white">
                📞 <span dir="ltr">{clinic.phone}</span>
              </a>
              <p className="mt-2 text-xs text-ink-400">🅿️ {t(clinic.parking)}</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold">{t("Opening hours")}</p>
              <dl className="mt-2 space-y-1 text-ink-300">
                {groupedHours(clinic, locale).map((h) => (
                  <div key={h.label} className="flex justify-between gap-6 sm:max-w-56">
                    <dt>{h.label}</dt>
                    <dd className="tabular-nums"><span dir="ltr">{h.value}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className="border-t border-white/5 py-4 text-center text-xs text-ink-400">
            {t("AI receptionist powered by")}{" "}
            <Link href="/" className="font-semibold text-white/70 hover:text-white">
              {t("AIbooking")}
            </Link>
          </p>
        </footer>
        <AIbookingWidget clinic={clinic} catalog={catalog} />
      </div>
    </Ctx.Provider>
  );
}
