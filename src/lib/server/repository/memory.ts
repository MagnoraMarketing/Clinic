import type { Appointment, AppointmentSource, AppointmentStatus, Call, Catalog, Clinic, Customer } from "@/lib/types";
import { DEMO_CATALOGS, DEMO_CLINICS } from "@/lib/demo/clinics";
import { addDays, availableSlots, clinicNow, hoursForDate, toMin } from "@/lib/hours";
import type { Repository, WebhookLogEntry } from "./types";

// In-memory demo store. Used automatically when Supabase isn't configured.
// Data lives in the process memory (per serverless instance on Vercel) and is
// reset on restart – perfect for a public demo without login.

interface Store {
  clinics: Clinic[];
  catalogs: Record<string, Catalog>;
  appointments: Appointment[];
  calls: Call[];
  webhooks: WebhookLogEntry[];
}

const clone = <T,>(v: T): T => structuredClone(v);
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const NAMES = [
  "Maria Jensen", "Peter Hansen", "Sara Nielsen", "Ahmad Rahimi", "Louise Kristensen", "Mikkel Larsen",
  "Emily Clarke", "Nanna Friis", "Oliver Pedersen", "Fatima Ali", "Jens Madsen", "Clara Schmidt",
];
const phoneFor = (i: number) => `+45 ${20 + (i % 70)} ${10 + ((i * 7) % 89)} ${10 + ((i * 13) % 89)} ${10 + ((i * 29) % 89)}`;

interface SeedSpec {
  day: number; // offset from today (skips to next open day)
  service: number; // index into services
  at: string; // preferred time
  status?: AppointmentStatus;
  source: AppointmentSource;
  comment?: string;
  newClient?: boolean;
  rebooked?: boolean;
  lateCancel?: boolean;
}

const SPECS: SeedSpec[] = [
  { day: 0, service: 1, at: "09:00", status: "completed", source: "phone" },
  { day: 0, service: 2, at: "10:00", status: "completed", source: "voice" },
  { day: 0, service: 0, at: "11:30", status: "checked_in", source: "website" },
  { day: 0, service: 1, at: "13:00", source: "phone", rebooked: true },
  { day: 0, service: 2, at: "15:00", source: "chat", comment: "Tension in left shoulder" },
  { day: 0, service: 3, at: "16:30", source: "voice" },
  { day: 1, service: 1, at: "09:30", source: "phone", newClient: true },
  { day: 1, service: 4, at: "11:00", source: "website" },
  { day: 1, service: 2, at: "14:00", source: "phone", rebooked: true },
  { day: 1, service: 0, at: "15:30", status: "cancelled", source: "voice", lateCancel: true },
  { day: 2, service: 1, at: "10:00", source: "chat" },
  { day: 2, service: 5, at: "13:00", source: "phone", comment: "First time – a bit nervous" },
  { day: 3, service: 2, at: "12:00", source: "voice", newClient: true },
  { day: 4, service: 1, at: "10:30", source: "website" },
];

function seedAppointments(clinic: Clinic, catalog: Catalog, specs: SeedSpec[], nameOffset: number): Appointment[] {
  const today = clinicNow().date;
  const out: Appointment[] = [];
  const prefix = clinic.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  specs.forEach((spec, i) => {
    let date = addDays(today, spec.day);
    for (let n = 0; n < 7 && !hoursForDate(clinic, date); n++) date = addDays(date, 1);
    const service = catalog.services[spec.service % catalog.services.length];
    const slots = availableSlots({ clinic, catalog, service, date, appointments: out, ignoreWindow: true });
    if (!slots.length) return;
    const slot = slots.reduce((best, s) => (Math.abs(toMin(s.time) - toMin(spec.at)) < Math.abs(toMin(best.time) - toMin(spec.at)) ? s : best));
    const practitioner = catalog.practitioners.find((p) => p.id === slot.practitionerIds[0])!;
    const name = NAMES[(i + nameOffset) % NAMES.length];
    const createdAt = minutesAgo(60 * 24 * (spec.day + 2) - i * 37);
    const status: AppointmentStatus = spec.status ?? (spec.newClient && clinic.booking.confirmNewClients ? "pending" : "confirmed");
    out.push({
      id: `apt_${clinic.id}_${i}`,
      clinicId: clinic.id,
      reference: `${prefix}-${4200 + i + nameOffset * 3}`,
      source: spec.source,
      status,
      date,
      time: slot.time,
      durationMinutes: service.durationMinutes,
      serviceId: service.id,
      serviceName: service.name,
      practitionerId: practitioner.id,
      practitionerName: practitioner.name,
      price: service.price,
      customer: { name, phone: phoneFor(i + nameOffset), email: `${name.split(" ")[0].toLowerCase()}@example.com` },
      newClient: Boolean(spec.newClient),
      comment: spec.comment,
      changes: spec.rebooked ? [{ at: minutesAgo(90 + i * 11), by: spec.source, from: `${addDays(date, 2)} 10:00`, to: `${date} ${slot.time}` }] : [],
      cancelledAt: status === "cancelled" ? minutesAgo(45) : undefined,
      lateCancellation: spec.lateCancel || undefined,
      externalRefs: {},
      createdAt,
      updatedAt: createdAt,
    });
  });
  return out;
}

function seedCalls(clinic: Clinic, catalog: Catalog, appointments: Appointment[]): Call[] {
  const s = catalog.services;
  const svc = (i: number) => s[i % s.length];
  const booked = appointments.find((a) => a.source === "phone" && a.status === "confirmed" && !a.changes.length);
  const moved = appointments.find((a) => a.changes.length > 0);
  const cancelled = appointments.find((a) => a.status === "cancelled");
  const mk = (i: number, ago: number, durationSec: number, outcome: Call["outcome"], summary: string, lines: [("caller" | "ai"), string][], appointmentId?: string): Call => ({
    id: `call_${clinic.id}_${i}`,
    clinicId: clinic.id,
    from: phoneFor(i + 3),
    channel: i % 3 === 2 ? "voice_widget" : "phone",
    startedAt: minutesAgo(ago),
    durationSec,
    outcome,
    summary,
    transcript: lines.map(([who, text]) => ({ who, text })),
    appointmentId,
  });
  const greet = `${clinic.name}, you're speaking with the AI receptionist. How can I help?`;
  return [
    booked &&
      mk(1, 6, 88, "booking", `Booked ${booked.serviceName} with ${booked.practitionerName} – ${booked.date} at ${booked.time} (${booked.reference}).`, [
        ["ai", greet],
        ["caller", `Hi, I'd like to book a ${booked.serviceName.toLowerCase()}.`],
        ["ai", `Of course. ${booked.practitionerName.split(" ")[0]} is free at ${booked.time}. Does that work?`],
        ["caller", "Perfect, yes."],
        ["ai", `You're booked ✓ Your reference is ${booked.reference} – you'll get a text confirmation.`],
      ], booked.id),
    moved &&
      mk(2, 24, 64, "rebooking", `Moved ${moved.serviceName} from ${moved.changes[0].from} to ${moved.date} ${moved.time}.`, [
        ["ai", greet],
        ["caller", "Hi, I need to move my appointment – something came up at work."],
        ["ai", "No problem. Can I have your booking reference or the phone number you booked with?"],
        ["caller", `It's ${moved.reference}.`],
        ["ai", `Found it. I can offer ${moved.time} on ${moved.date} with ${moved.practitionerName.split(" ")[0]}. Shall I move it?`],
        ["caller", "Yes please."],
        ["ai", "Done ✓ Your appointment has been moved."],
      ], moved.id),
    mk(3, 41, 31, "question", `Asked about the price of ${svc(1).name} – answered DKK ${svc(1).price}.`, [
      ["caller", `How much is ${svc(1).name.toLowerCase()}?`],
      ["ai", `${svc(1).name} is DKK ${svc(1).price} for ${svc(1).durationMinutes} minutes. Would you like me to find a time?`],
      ["caller", "Not right now, thanks."],
    ]),
    cancelled &&
      mk(4, 58, 42, "cancellation", `Cancelled ${cancelled.serviceName} (${cancelled.reference}). Late cancellation – fee per policy.`, [
        ["caller", "I'm sick and have to cancel tomorrow's appointment."],
        ["ai", "Sorry to hear that – get well soon. What's your reference or phone number?"],
        ["caller", cancelled.customer.phone],
        ["ai", `I've cancelled it. As it's less than ${clinic.booking.cancellationHours} hours before, the cancellation fee in our policy may apply.`],
      ], cancelled.id),
    mk(5, 83, 49, "transfer", "Supplier wanted to speak to the clinic manager – transferred.", [
      ["caller", "Hi, it's about your product order – can I speak to the manager?"],
      ["ai", "Of course, I'll transfer you right away."],
    ]),
    mk(6, 130, 27, "question", "Asked about opening hours on Saturday and parking.", [
      ["caller", "Are you open on Saturday, and where can I park?"],
      ["ai", `${clinic.openingHours.find((h) => h.day === 6 && !h.closed) ? "Yes, we're open on Saturday." : "We're closed on Saturdays."} ${clinic.parking}`],
    ]),
  ].filter(Boolean) as Call[];
}

function seed(): Store {
  const clinics = clone(DEMO_CLINICS);
  const catalogs = clone(DEMO_CATALOGS);
  const appointments: Appointment[] = [];
  const calls: Call[] = [];
  clinics.forEach((c, ci) => {
    const specs = ci === 0 ? SPECS : SPECS.filter((_, i) => i % 2 === ci % 2 || i < 3);
    const list = seedAppointments(c, catalogs[c.id], specs, ci * 2);
    appointments.push(...list);
    calls.push(...seedCalls(c, catalogs[c.id], list));
  });
  return { clinics, catalogs, appointments, calls, webhooks: [] };
}

const g = globalThis as unknown as { __aibookingClinicStore?: Store };
const store = () => (g.__aibookingClinicStore ??= seed());

const byTime = (a: Appointment, b: Appointment) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
const cap = <T,>(list: T[], max = 3000) => {
  if (list.length > max) list.splice(0, list.length - max);
};

export const memoryRepository: Repository = {
  kind: "memory",

  async listClinics() {
    return clone(store().clinics);
  },
  async getClinic(idOrSlug) {
    const c = store().clinics.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    return c ? clone(c) : null;
  },
  async updateClinic(id, patch) {
    const s = store();
    const i = s.clinics.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const { id: _id, slug: _slug, ...rest } = patch;
    s.clinics[i] = { ...s.clinics[i], ...rest };
    return clone(s.clinics[i]);
  },

  async getCatalog(clinicId) {
    return clone(store().catalogs[clinicId] ?? { categories: [], services: [], practitioners: [] });
  },
  async updateService(clinicId, serviceId, patch) {
    const svc = store().catalogs[clinicId]?.services.find((x) => x.id === serviceId);
    if (!svc) return null;
    const { id: _id, clinicId: _c, ...rest } = patch;
    Object.assign(svc, rest);
    return clone(svc);
  },
  async updatePractitioner(clinicId, practitionerId, patch) {
    const p = store().catalogs[clinicId]?.practitioners.find((x) => x.id === practitionerId);
    if (!p) return null;
    const { id: _id, clinicId: _c, ...rest } = patch;
    Object.assign(p, rest);
    return clone(p);
  },

  async listAppointments(clinicId, opts = {}) {
    return clone(
      store()
        .appointments.filter(
          (a) =>
            a.clinicId === clinicId &&
            (!opts.date || a.date === opts.date) &&
            (!opts.from || a.date >= opts.from) &&
            (!opts.to || a.date <= opts.to),
        )
        .sort(byTime),
    );
  },
  async getAppointment(id) {
    const a = store().appointments.find((x) => x.id === id);
    return a ? clone(a) : null;
  },
  async insertAppointment(appointment) {
    const s = store();
    s.appointments.push(clone(appointment));
    cap(s.appointments);
    return clone(appointment);
  },
  async updateAppointment(id, patch) {
    const a = store().appointments.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, patch, { updatedAt: new Date().toISOString() });
    return clone(a);
  },

  async listCustomers(clinicId) {
    const today = clinicNow().date;
    const map = new Map<string, Customer>();
    for (const a of store().appointments.filter((x) => x.clinicId === clinicId)) {
      const key = a.customer.phone.replace(/\D/g, "").slice(-8) || a.customer.name;
      const c =
        map.get(key) ??
        ({ id: `cus_${map.size + 1}`, clinicId, name: a.customer.name, phone: a.customer.phone, email: a.customer.email, visitCount: 0, upcomingCount: 0, cancellationCount: 0, totalSpent: 0, lastSeenAt: a.createdAt } as Customer);
      if (a.updatedAt > c.lastSeenAt) c.lastSeenAt = a.updatedAt;
      c.email ??= a.customer.email;
      if (a.status === "cancelled" || a.status === "no_show") c.cancellationCount++;
      else if (a.status === "completed" || a.date < today) {
        c.visitCount++;
        c.totalSpent += a.price;
      } else c.upcomingCount++;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  },

  async listCalls(clinicId, limit = 100) {
    return clone(store().calls.filter((c) => c.clinicId === clinicId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit));
  },
  async insertCall(call) {
    const s = store();
    s.calls.push(clone(call));
    cap(s.calls);
    return clone(call);
  },

  async logWebhook(entry) {
    const s = store();
    s.webhooks.unshift({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    s.webhooks.length = Math.min(s.webhooks.length, 200);
  },
  async listWebhookLog(clinicId, limit = 50) {
    return clone(store().webhooks.filter((w) => !clinicId || w.clinicId === clinicId).slice(0, limit));
  },
};
