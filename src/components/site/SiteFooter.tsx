"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "./Logo";
import { CLINIC_TYPES } from "@/lib/demo/catalog";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-white/8 bg-ink-950">
      <div className="container-x grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-400">
            {t("AIbooking is the technology in the background – your clinic stays in the centre. Your website, your brand, your treatments, your phone number and your calendar.")}
          </p>
          <LanguageSwitcher className="mt-5 w-fit" />
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Product")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            <li><Link href="/#phone" className="hover:text-white">{t("AI phone receptionist")}</Link></li>
            <li><Link href="/#voice-widget" className="hover:text-white">{t("Voice widget")}</Link></li>
            <li><Link href="/#rebooking" className="hover:text-white">{t("Rebookings")}</Link></li>
            <li><Link href="/#pricing" className="hover:text-white">{t("Pricing")}</Link></li>
            <li><Link href="/#api" className="hover:text-white">{t("API & integrations")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Clinic types")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            {CLINIC_TYPES.map((c) => (
              <li key={c.slug}><Link href={`/clinics/${c.slug}`} className="hover:text-white">{t(c.name)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Demo")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            <li><Link href="/demo/calm-hands" className="hover:text-white">Calm Hands Massage</Link></li>
            <li><Link href="/demo" className="hover:text-white">{t("All demo clinics")}</Link></li>
            <li><Link href="/admin" className="hover:text-white">{t("Admin & calendar")}</Link></li>
            <li><Link href="/partner" className="hover:text-white">{t("Partner programme")}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{t("Book a demo")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} AIbooking.dk · {t("Demo clinics, clients and appointments on this site are fictional.")}
      </div>
    </footer>
  );
}
