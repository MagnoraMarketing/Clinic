// Formatting helpers (English, Danish clinics → DKK prices, 24h clock).
const LOCALE = "en-GB";

export const dkk = (n: number) => `DKK ${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(n)}`;
export const priceLabel = (s: { price: number; priceFrom?: boolean }) => (s.price === 0 ? "Free" : `${s.priceFrom ? "from " : ""}${dkk(s.price)}`);
export const duration = (min: number) => (min < 60 ? `${min} min` : min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`);

// 2023-01-01 is a Sunday → index 0 = Sunday, like Date.getDay()
const dayDate = (d: number) => new Date(Date.UTC(2023, 0, 1 + d, 12));
export const dayName = (d: number) => new Intl.DateTimeFormat(LOCALE, { weekday: "long", timeZone: "UTC" }).format(dayDate(d));
export const dayShort = (d: number) => new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" }).format(dayDate(d));

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));
export const formatDateShort = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const monthShort = (d: Date) => d.toLocaleDateString(LOCALE, { month: "short" });

export const timeAgo = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
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
