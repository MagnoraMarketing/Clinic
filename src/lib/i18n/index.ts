import { DEFAULT_LOCALE, type Locale } from "./config";
import es from "./dict/es";
import de from "./dict/de";
import ar from "./dict/ar";

export * from "./config";

export type Vars = Record<string, string | number>;
export type TFunction = (s: string, vars?: Vars) => string;

const DICTS: Record<Locale, Record<string, string>> = { en: {}, es, de, ar };

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** Looks up the English source text in the locale's dictionary (falls back to English) and fills {vars}. */
export function translate(locale: Locale, s: string, vars?: Vars): string {
  if (!s) return s;
  const hit = locale === DEFAULT_LOCALE ? undefined : DICTS[locale]?.[s];
  return fill(hit ?? s, vars);
}

export const makeT = (locale: Locale): TFunction => (s, vars) => translate(locale, s, vars);

/** For tooling: all dictionary keys per locale. */
export const dictionaries = DICTS;
