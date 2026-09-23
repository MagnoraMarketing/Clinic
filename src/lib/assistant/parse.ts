import { norm } from "@/lib/match";

// Small English parsers for the demo receptionist: dates, times, phone numbers,
// booking references. Deliberately forgiving – callers speak naturally.

export { norm };

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

export function parseNumberWord(w: string | undefined): number | undefined {
  if (!w) return undefined;
  if (/^\d+$/.test(w)) return Number(w);
  return NUM_WORDS[w];
}

const WEEKDAYS: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const WEEKDAY_SHORT: Record<string, number> = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseDate(text: string, today: string = iso(new Date())): string | undefined {
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  const t = norm(text);
  const base = new Date(`${today}T12:00:00`);
  const plus = (n: number) => iso(new Date(base.getTime() + n * 864e5));
  if (/\b(today|tonight|this (morning|afternoon|evening)|later today)\b/.test(t)) return plus(0);
  if (/\bday after tomorrow\b/.test(t)) return plus(2);
  if (/\b(tomorrow|tmrw|tmr)\b/.test(t)) return plus(1);
  const inDays = t.match(/\bin (\w+) days?\b/);
  if (inDays && parseNumberWord(inDays[1])) return plus(parseNumberWord(inDays[1])!);
  if (/\bnext week\b/.test(t) && !Object.keys(WEEKDAYS).some((d) => t.includes(d))) return plus(((1 - base.getDay() + 7) % 7) || 7);

  for (const [name, day] of [...Object.entries(WEEKDAYS), ...Object.entries(WEEKDAY_SHORT)]) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      let diff = (day - base.getDay() + 7) % 7;
      if (new RegExp(`\\bnext ${name}\\b`).test(t) && diff === 0) diff = 7;
      return plus(diff);
    }
  }

  const monthNames = Object.keys(MONTHS).join("|");
  const dm =
    t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})\\b`)) ??
    t.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  let d = 0;
  let m = 0;
  if (dm) {
    if (/^\d/.test(dm[1])) [d, m] = [Number(dm[1]), MONTHS[dm[2]]];
    else [d, m] = [Number(dm[2]), MONTHS[dm[1]]];
  } else {
    const num = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
    const ordinal = t.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
    if (num && !/[:]/.test(text.slice((num.index ?? 0) + num[0].length, (num.index ?? 0) + num[0].length + 1))) [d, m] = [Number(num[1]), Number(num[2])];
    else if (ordinal) {
      d = Number(ordinal[1]);
      m = base.getMonth() + 1 + (d < base.getDate() ? 1 : 0);
      if (m > 12) m = 1;
    }
  }
  if (d && m && m <= 12 && d <= 31) {
    let y = base.getFullYear();
    if (new Date(y, m - 1, d, 12) < new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12)) y++;
    return iso(new Date(y, m - 1, d, 12));
  }
  return undefined;
}

/** Clinics are open ~07–20, so "at 4" means 16:00 and "at 9" means 09:00. */
const clinicHour = (h: number) => (h >= 1 && h <= 6 ? h + 12 : h);

export function parseTime(text: string): string | undefined {
  const t = norm(text.replace(/(\d)\.(\d{2})/, "$1:$2"));
  const raw = text.toLowerCase().replace(/(\d)\.(\d{2})/, "$1:$2");
  if (/\bnoon|midday\b/.test(t)) return "12:00";
  const words = t.match(/\b(half past|quarter past|quarter to)\s+(\w+)\b/);
  if (words) {
    const h = parseNumberWord(words[2]);
    if (h) {
      const hour = clinicHour(h);
      if (words[1] === "half past") return `${String(hour).padStart(2, "0")}:30`;
      if (words[1] === "quarter past") return `${String(hour).padStart(2, "0")}:15`;
      return `${String(hour - 1).padStart(2, "0")}:45`;
    }
  }
  const m =
    raw.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/) ??
    raw.match(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/) ??
    t.match(/\b(?:at|around|about|by|from|after|before)\s+(\d{1,2})(?:\s*(o clock|oclock))?\b(?!\s*(?:min|minutes|people|days|weeks|th|st|nd|rd))/) ??
    t.match(/\b(\w+)\s+(?:o clock|oclock)\b/);
  if (!m) return undefined;
  let h = parseNumberWord(m[1]) ?? NaN;
  const min = m[2] && /^\d{2}$/.test(m[2]) ? Number(m[2]) : 0;
  const ampm = [m[2], m[3]].find((x) => x && /[ap]\.?m/.test(x));
  if (Number.isNaN(h)) return undefined;
  if (ampm?.startsWith("p") && h < 12) h += 12;
  else if (ampm?.startsWith("a") && h === 12) h = 0;
  else if (!ampm && !/:/.test(m[0])) h = clinicHour(h);
  else if (!ampm && h >= 1 && h <= 6) h += 12;
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "morning" / "afternoon" / "evening" → a window in minutes. */
export function parseDayPart(text: string): [number, number] | undefined {
  const t = norm(text);
  if (/\b(early morning|first thing)\b/.test(t)) return [0, 9 * 60];
  if (/\bmorning\b|\bbefore lunch\b/.test(t)) return [0, 12 * 60];
  if (/\blunch( ?time)?\b/.test(t)) return [11 * 60, 14 * 60];
  if (/\bafternoon\b|\bafter lunch\b/.test(t)) return [12 * 60, 17 * 60];
  if (/\bevening\b|\bafter work\b|\btonight\b|\blate\b/.test(t)) return [16 * 60, 24 * 60];
  return undefined;
}

/** Danish (8 digits) and international numbers. */
export function parsePhone(text: string): string | undefined {
  const raw = text.replace(/[^\d+]/g, "");
  const dk = raw.replace(/^(\+|00)?45(?=\d{8}$)/, "");
  if (/^\d{8}$/.test(dk)) return `+45 ${dk.slice(0, 2)} ${dk.slice(2, 4)} ${dk.slice(4, 6)} ${dk.slice(6)}`;
  if (/^\+\d{8,14}$/.test(raw)) return raw;
  if (/^0\d{9,10}$/.test(raw)) return raw; // e.g. UK 07700 900123
  return undefined;
}

export const parseEmail = (text: string) => text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];

/** Booking references look like "CA-4201" or "ST-1234AB". */
export const parseReference = (text: string) => text.toUpperCase().match(/\b[A-Z]{2}-?\d{3,5}[A-Z0-9]{0,3}\b/)?.[0]?.replace(/^([A-Z]{2})(\d)/, "$1-$2");
