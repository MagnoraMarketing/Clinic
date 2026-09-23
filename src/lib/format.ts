import { LOCALE_LABEL, translate, type Locale } from "@/lib/i18n";

// Formatting helpers. Everything is language-aware (English is the default);
// prices are in DKK (Danish clinics) and times use the 24h clock.
const tag = (l: Locale) => LOCALE_LABEL[l].bcp47;

export const dkk = (n: number, l: Locale = "en") =>
  new Intl.NumberFormat(tag(l), { style: "currency", currency: "DKK", currencyDisplay: "code", maximumFractionDigits: 0 }).format(n).replace(/ /g, " ");
export const priceLabel = (s: { price: number; priceFrom?: boolean }, l: Locale = "en") =>
  s.price === 0 ? translate(l, "Free") : s.priceFrom ? translate(l, "from {price}", { price: dkk(s.price, l) }) : dkk(s.price, l);
export const duration = (min: number, l: Locale = "en") =>
  min < 60
    ? translate(l, "{n} min", { n: min })
    : min % 60 === 0
      ? translate(l, "{n} h", { n: min / 60 })
      : translate(l, "{h} h {m} min", { h: Math.floor(min / 60), m: min % 60 });

// 2023-01-01 is a Sunday → index 0 = Sunday, like Date.getDay()
const dayDate = (d: number) => new Date(Date.UTC(2023, 0, 1 + d, 12));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayName = (d: number, l: Locale = "en") => cap(new Intl.DateTimeFormat(tag(l), { weekday: "long", timeZone: "UTC" }).format(dayDate(d)));
export const dayShort = (d: number, l: Locale = "en") => cap(new Intl.DateTimeFormat(tag(l), { weekday: "short", timeZone: "UTC" }).format(dayDate(d)).replace(/\.$/, ""));

export const formatDate = (iso: string, l: Locale = "en") =>
  cap(new Intl.DateTimeFormat(tag(l), { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`)));
export const formatDateShort = (iso: string, l: Locale = "en") =>
  cap(new Intl.DateTimeFormat(tag(l), { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`)));
export const formatDateTime = (iso: string, l: Locale = "en") =>
  new Intl.DateTimeFormat(tag(l), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const monthShort = (d: Date, l: Locale = "en") => d.toLocaleDateString(tag(l), { month: "short" });

export const timeAgo = (iso: string, l: Locale = "en") => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return translate(l, "just now");
  const m = Math.round(s / 60);
  if (m < 60) return translate(l, "{n} min ago", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return translate(l, "{n} h ago", { n: h });
  return translate(l, "{n} d ago", { n: Math.round(h / 24) });
};

/** Local calendar date as YYYY-MM-DD (not UTC). */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => isoDate(new Date());

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
export const isPlaceholderPhone = (phone: string) => /x/i.test(phone) || phone.replace(/\D/g, "").length < 8;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
