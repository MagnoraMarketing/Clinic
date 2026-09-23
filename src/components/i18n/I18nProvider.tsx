"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type TFunction } from "@/lib/i18n";

const Ctx = createContext<{ locale: Locale; t: TFunction }>({ locale: DEFAULT_LOCALE, t: makeT(DEFAULT_LOCALE) });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;

/** Translates a string prop inside a component that doesn't hold its own `t`. */
export function T({ s, vars }: { s: string; vars?: Record<string, string | number> }) {
  return <>{useT()(s, vars)}</>;
}
