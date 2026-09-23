"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_LABEL, LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

/** EN · ES · DE · AR – stores the choice in a cookie and re-renders the page in that language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    document.documentElement.dir = LOCALE_LABEL[l].dir;
    start(() => router.refresh());
  };
  return (
    <div className={`flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs font-semibold ${pending ? "opacity-60" : ""} ${className}`} role="group" aria-label={t("Language")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          title={LOCALE_LABEL[l].name}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 transition ${locale === l ? "bg-sage-400 text-ink-950" : "text-ink-300 hover:text-white"}`}
        >
          {LOCALE_LABEL[l].short}
        </button>
      ))}
    </div>
  );
}
