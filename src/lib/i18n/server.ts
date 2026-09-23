import { cookies, headers } from "next/headers";
import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { makeT } from "./index";

/** Locale for this request: the visitor's choice (cookie) → browser language → English. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return detectLocale((await headers()).get("accept-language"));
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
