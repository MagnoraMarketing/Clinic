// Supported languages. English is the source language: every UI string is written
// in English and looked up in the dictionaries under ./dict (keyed on the English text).
export const LOCALES = ["en", "es", "de", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export const LOCALE_LABEL: Record<Locale, { name: string; short: string; bcp47: string; dir: "ltr" | "rtl" }> = {
  en: { name: "English", short: "EN", bcp47: "en-GB", dir: "ltr" },
  es: { name: "Español", short: "ES", bcp47: "es-ES", dir: "ltr" },
  de: { name: "Deutsch", short: "DE", bcp47: "de-DE", dir: "ltr" },
  // Latin digits keep prices, times and phone numbers easy to read
  ar: { name: "العربية", short: "AR", bcp47: "ar-u-nu-latn", dir: "rtl" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Browser language (Accept-Language, by preference) → first supported locale, else English. */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  const prefs = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { lang: tag.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((p) => p.lang)
    .sort((a, b) => b.q - a.q);
  return prefs.map((p) => p.lang).find(isLocale) ?? DEFAULT_LOCALE;
}
