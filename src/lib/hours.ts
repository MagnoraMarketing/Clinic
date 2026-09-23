import type { Appointment, Catalog, Clinic, OpeningHours, Practitioner, Service, Slot } from "@/lib/types";
import { dayShort } from "@/lib/format";
import { translate, type Locale } from "@/lib/i18n";

// Opening hours + the scheduling engine. Shared by the server (validation) and the
// browser (booking page), so the AI, the website and the admin always agree on
// which times are free.

export const TIME_ZONE = "Europe/Copenhagen";

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T12:00:00`).getTime());

/** Current date + minutes-since-midnight in the clinic's time zone (servers run in UTC). */
export function clinicNow(now = new Date()): { date: string; minutes: number; day: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), day: new Date(`${date}T12:00:00`).getDay() };
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function hoursForDate(c: Clinic, date: string): OpeningHours | undefined {
  const day = new Date(`${date}T12:00:00`).getDay();
  const h = c.openingHours.find((o) => o.day === day);
  return h && !h.closed ? h : undefined;
}

export function isOpenNow(c: Clinic, now = new Date()): boolean {
  const { day, minutes } = clinicNow(now);
  const h = c.openingHours.find((o) => o.day === day);
  if (!h || h.closed) return false;
  return minutes >= toMin(h.open) && minutes < toMin(h.close);
}

/** Grouped opening hours: "Mon–Thu 09:00–18:00". Order Monday → Sunday. */
export function groupedHours(c: Clinic, l: Locale = "en"): { label: string; value: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: number[]; value: string }[] = [];
  for (const d of order) {
    const h = c.openingHours.find((o) => o.day === d);
    const value = !h || h.closed ? translate(l, "Closed") : `${h.open}–${h.close}`;
    const prev = rows[rows.length - 1];
    if (prev && prev.value === value) prev.days.push(d);
    else rows.push({ days: [d], value });
  }
  return rows.map(({ days, value }) => ({
    label: days.length > 1 ? `${dayShort(days[0], l)}–${dayShort(days[days.length - 1], l)}` : dayShort(days[0], l),
    value,
  }));
}

/** Practitioners who can perform a service (active + listed on the service, or all when none listed). */
export function practitionersFor(catalog: Catalog, service: Service): Practitioner[] {
  return catalog.practitioners.filter((p) => p.active && (service.practitionerIds.length === 0 || service.practitionerIds.includes(p.id)));
}

const BLOCKING: Appointment["status"][] = ["pending", "confirmed", "checked_in", "completed"];

export interface SlotQuery {
  clinic: Clinic;
  catalog: Catalog;
  service: Service;
  date: string;
  appointments: Appointment[];
  /** Specific practitioner, or undefined for "anyone available". */
  practitionerId?: string;
  /** Ignore this appointment when checking conflicts (used when rebooking). */
  excludeAppointmentId?: string;
  now?: Date;
  /** Skip the min-notice / max-days-ahead window (admin overrides, demo seed). */
  ignoreWindow?: boolean;
}

/** Is the date inside the bookable window (min notice → max days ahead) and open? */
export function isBookableDate(clinic: Clinic, date: string, now = new Date()): boolean {
  if (!isValidDate(date) || !hoursForDate(clinic, date)) return false;
  const today = clinicNow(now).date;
  return date >= today && date <= addDays(today, clinic.booking.maxDaysAhead);
}

/**
 * Free start times for a service on a date. A time is free when at least one
 * qualified practitioner works that day and has no overlapping appointment
 * (incl. the clinic's buffer between appointments).
 */
export function availableSlots(q: SlotQuery): Slot[] {
  const { clinic, catalog, service, date } = q;
  const h = hoursForDate(clinic, date);
  if (!h || (!q.ignoreWindow && !isBookableDate(clinic, date, q.now))) return [];
  const day = new Date(`${date}T12:00:00`).getDay() as Practitioner["workDays"][number];
  const staff = practitionersFor(catalog, service).filter(
    (p) => p.workDays.includes(day) && (!q.practitionerId || p.id === q.practitionerId),
  );
  if (!staff.length) return [];

  const now = clinicNow(q.now);
  const earliest = !q.ignoreWindow && date === now.date ? now.minutes + clinic.booking.minNoticeHours * 60 : -1;
  const buffer = clinic.booking.bufferMinutes;
  const busy = q.appointments.filter((a) => a.date === date && a.id !== q.excludeAppointmentId && BLOCKING.includes(a.status));
  const slots: Slot[] = [];
  const open = toMin(h.open);
  const close = toMin(h.close);
  const step = Math.max(5, clinic.booking.slotMinutes);

  for (let m = open; m + service.durationMinutes <= close; m += step) {
    if (m < earliest) continue;
    const end = m + service.durationMinutes;
    const free = staff.filter((p) =>
      busy.every((a) => {
        if (a.practitionerId !== p.id) return true;
        const s = toMin(a.time);
        const e = s + a.durationMinutes;
        return end + buffer <= s || m >= e + buffer;
      }),
    );
    if (free.length) slots.push({ time: toTime(m), practitionerIds: free.map((p) => p.id) });
  }
  return slots;
}

/** Next dates with at least one free slot – used by the AI to suggest alternatives. */
export function nextAvailable(q: Omit<SlotQuery, "date"> & { from: string; days?: number; limit?: number }): { date: string; slots: Slot[] }[] {
  const out: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i < (q.days ?? 14) && out.length < (q.limit ?? 3); i++) {
    const date = addDays(q.from, i);
    const slots = availableSlots({ ...q, date });
    if (slots.length) out.push({ date, slots });
  }
  return out;
}

/** Hours until an appointment starts (clinic time). Negative = in the past. */
export function hoursUntil(date: string, time: string, now = new Date()): number {
  const n = clinicNow(now);
  const days = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${n.date}T12:00:00`).getTime()) / 864e5);
  return (days * 24 * 60 + toMin(time) - n.minutes) / 60;
}

export { addDays };
