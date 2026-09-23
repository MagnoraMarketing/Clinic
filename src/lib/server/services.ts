import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  Call,
  CallOutcome,
  Catalog,
  Clinic,
  CreateAppointmentInput,
  CustomerInfo,
  Practitioner,
  Service,
  Slot,
} from "@/lib/types";
import { availableSlots, clinicNow, hoursUntil, isBookableDate, isValidDate, isValidTime, nextAvailable } from "@/lib/hours";
import { findPractitioner, findService, wantsAnyone } from "@/lib/match";
import { getClinic, repo } from "@/lib/server/repository";
import { ApiError } from "@/lib/server/http";
import { dispatchAppointmentEvent } from "@/lib/server/integrations";

// Business logic – shared by the website, chat widget, AI Voice, phone and
// external practice systems. Every channel ends up here, so the rules (availability,
// buffers, cancellation policy) are enforced in exactly one place.

const SOURCES: AppointmentSource[] = ["website", "chat", "voice", "phone", "api"];
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const digits = (s: string) => s.replace(/\D/g, "").slice(-8);
export const samePhone = (a: string, b: string) => digits(a).length >= 8 && digits(a) === digits(b);

export async function resolveClinic(idOrSlug: unknown): Promise<Clinic> {
  const key = str(idOrSlug, 100);
  if (!key) throw new ApiError(400, "clinicId is missing");
  const c = await getClinic(key);
  if (!c) throw new ApiError(404, `Clinic '${key}' does not exist`);
  return c;
}

function parseCustomer(raw: unknown): CustomerInfo {
  const c = (raw ?? {}) as Record<string, unknown>;
  const customer: CustomerInfo = { name: str(c.name, 120), phone: str(c.phone, 40), email: str(c.email, 160) || undefined };
  const errors: string[] = [];
  if (customer.name.length < 2) errors.push("customer.name is required");
  if (customer.phone.replace(/\D/g, "").length < 8) errors.push("customer.phone must be a valid phone number");
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push("customer.email is invalid");
  if (errors.length) throw new ApiError(422, "Invalid client details", errors);
  return customer;
}

function resolveService(catalog: Catalog, ref: { serviceId?: unknown; service?: unknown }): Service {
  const service = findService(catalog.services, { serviceId: str(ref.serviceId, 80), name: str(ref.service, 120) });
  if (!service) throw new ApiError(422, `Treatment '${str(ref.serviceId, 80) || str(ref.service, 120)}' was not found in the price list`);
  if (!service.available) throw new ApiError(422, `${service.name} can't be booked online right now`);
  return service;
}

/** Practitioner by id or name. "any"/empty → undefined (= first available). */
function resolvePractitioner(catalog: Catalog, ref: { practitionerId?: unknown; practitioner?: unknown }): Practitioner | undefined {
  const id = str(ref.practitionerId, 80);
  const name = str(ref.practitioner, 80);
  if ((!id || id === "any") && (!name || wantsAnyone(name))) return undefined;
  const p = catalog.practitioners.find((x) => x.id === id) ?? (name ? findPractitioner(catalog.practitioners, name) : undefined);
  if (!p || !p.active) throw new ApiError(422, `Practitioner '${id || name}' was not found`);
  return p;
}

export interface AvailabilityResult {
  date: string;
  service: Pick<Service, "id" | "name" | "durationMinutes" | "price" | "priceFrom">;
  slots: (Slot & { practitioners: { id: string; name: string }[] })[];
  /** When the date is full or closed: the next dates with free times. */
  alternatives: { date: string; times: string[] }[];
  rules: string;
}

export async function getAvailability(params: { clinicId: unknown; serviceId?: unknown; service?: unknown; date: unknown; practitionerId?: unknown; practitioner?: unknown; excludeAppointmentId?: string }): Promise<AvailabilityResult> {
  const clinic = await resolveClinic(params.clinicId);
  const date = str(params.date, 10);
  if (!isValidDate(date)) throw new ApiError(400, "date must have the format YYYY-MM-DD");
  const catalog = await repo().getCatalog(clinic.id);
  const service = resolveService(catalog, params);
  const practitioner = resolvePractitioner(catalog, params);
  const appointments = await repo().listAppointments(clinic.id, { from: date, to: date });
  const q = { clinic, catalog, service, appointments, practitionerId: practitioner?.id, excludeAppointmentId: params.excludeAppointmentId };
  const slots = availableSlots({ ...q, date });
  let alternatives: AvailabilityResult["alternatives"] = [];
  if (!slots.length) {
    const upcoming = await repo().listAppointments(clinic.id, { from: date });
    alternatives = nextAvailable({ ...q, appointments: upcoming, from: date, limit: 3 }).map((d) => ({ date: d.date, times: d.slots.slice(0, 6).map((s) => s.time) }));
  }
  const names = new Map(catalog.practitioners.map((p) => [p.id, p.name]));
  return {
    date,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes, price: service.price, priceFrom: service.priceFrom },
    slots: slots.map((s) => ({ ...s, practitioners: s.practitionerIds.map((id) => ({ id, name: names.get(id) ?? id })) })),
    alternatives,
    rules: clinic.booking.rules,
  };
}

function reference(clinic: Clinic) {
  const prefix = clinic.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "AB";
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

/** Checks the requested time and returns the practitioner who gets the appointment. */
async function claimSlot(clinic: Clinic, catalog: Catalog, service: Service, date: string, time: string, practitioner: Practitioner | undefined, excludeAppointmentId?: string): Promise<Practitioner> {
  const errors: string[] = [];
  if (!isValidDate(date)) errors.push("date must have the format YYYY-MM-DD");
  if (!isValidTime(time)) errors.push("time must have the format HH:mm");
  if (errors.length) throw new ApiError(422, "The appointment could not be validated", errors);
  if (date < clinicNow().date) throw new ApiError(422, "That date has passed");
  if (!isBookableDate(clinic, date)) throw new ApiError(422, `${clinic.name} is closed or not taking bookings on that date`);
  const appointments = await repo().listAppointments(clinic.id, { date });
  const slot = availableSlots({ clinic, catalog, service, date, appointments, practitionerId: practitioner?.id, excludeAppointmentId }).find((s) => s.time === time);
  if (!slot) throw new ApiError(409, practitioner ? `${practitioner.name} isn't available at ${time}` : `${time} is no longer available`);
  return catalog.practitioners.find((p) => p.id === slot.practitionerIds[0])!;
}

export async function createAppointment(raw: CreateAppointmentInput): Promise<Appointment> {
  const clinic = await resolveClinic(raw.clinicId);
  if (!clinic.booking.enabled) throw new ApiError(422, `${clinic.name} doesn't take online bookings – please call`);
  const catalog = await repo().getCatalog(clinic.id);
  const service = resolveService(catalog, raw);
  const customer = parseCustomer(raw.customer);
  const newClient = Boolean(raw.newClient) || Boolean(service.newClientsOnly);
  const date = str(raw.date, 10);
  const time = str(raw.time, 5);
  const practitioner = await claimSlot(clinic, catalog, service, date, time, resolvePractitioner(catalog, raw));
  const now = new Date().toISOString();

  const appointment = await repo().insertAppointment({
    id: crypto.randomUUID(),
    clinicId: clinic.id,
    reference: reference(clinic),
    source: SOURCES.includes(raw.source as AppointmentSource) ? (raw.source as AppointmentSource) : "website",
    status: newClient && clinic.booking.confirmNewClients ? "pending" : "confirmed",
    date,
    time,
    durationMinutes: service.durationMinutes,
    serviceId: service.id,
    serviceName: service.name,
    practitionerId: practitioner.id,
    practitionerName: practitioner.name,
    price: service.price,
    customer,
    newClient,
    comment: str(raw.comment, 500) || undefined,
    changes: [],
    externalRefs: {},
    createdAt: now,
    updatedAt: now,
  });

  const refs = await dispatchAppointmentEvent("appointment.created", appointment, clinic);
  if (Object.keys(refs).length) return (await repo().updateAppointment(appointment.id, { externalRefs: refs })) ?? appointment;
  return appointment;
}

const STATUSES: AppointmentStatus[] = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"];

export interface UpdateOptions {
  /** Who made the change – clients (incl. the AI on their behalf) may only rebook or cancel. */
  by: AppointmentSource | "admin";
}

/**
 * Rebook (date/time/practitioner/service), cancel or change status. Rebookings are
 * checked against the calendar exactly like new bookings, and every move is logged.
 */
export async function updateAppointment(id: string, patch: Record<string, unknown>, opts: UpdateOptions): Promise<Appointment> {
  const current = await repo().getAppointment(id);
  if (!current) throw new ApiError(404, "The appointment does not exist");
  const clinic = await resolveClinic(current.clinicId);
  const admin = opts.by === "admin";
  const next: Partial<Appointment> = {};

  if (patch.status !== undefined) {
    const status = patch.status as AppointmentStatus;
    if (!STATUSES.includes(status)) throw new ApiError(422, "Invalid status");
    if (!admin && status !== "cancelled") throw new ApiError(403, "Clients can only rebook or cancel");
    if (status === "cancelled" && current.status !== "cancelled") {
      if (current.status === "completed") throw new ApiError(409, "A completed appointment can't be cancelled");
      next.cancelledAt = new Date().toISOString();
      next.lateCancellation = hoursUntil(current.date, current.time) < clinic.booking.cancellationHours || undefined;
    }
    next.status = status;
  }

  const moving = patch.date !== undefined || patch.time !== undefined || patch.practitionerId !== undefined || patch.practitioner !== undefined || patch.serviceId !== undefined || patch.service !== undefined;
  if (moving) {
    if (current.status === "cancelled" || current.status === "completed" || current.status === "no_show") throw new ApiError(409, `A ${current.status.replace("_", "-")} appointment can't be moved`);
    if (!admin && hoursUntil(current.date, current.time) < 0) throw new ApiError(409, "That appointment has already started");
    const catalog = await repo().getCatalog(clinic.id);
    const service = patch.serviceId !== undefined || patch.service !== undefined ? resolveService(catalog, patch) : catalog.services.find((s) => s.id === current.serviceId) ?? resolveService(catalog, { service: current.serviceName });
    const keepSame = patch.practitionerId === undefined && patch.practitioner === undefined;
    const wanted = keepSame ? catalog.practitioners.find((p) => p.id === current.practitionerId) : resolvePractitioner(catalog, patch);
    const date = str(patch.date ?? current.date, 10);
    const time = str(patch.time ?? current.time, 5);
    let practitioner: Practitioner;
    try {
      practitioner = await claimSlot(clinic, catalog, service, date, time, wanted, current.id);
    } catch (e) {
      // Same practitioner is busy but the client didn't ask for them specifically → try anyone
      if (!keepSame || !(e instanceof ApiError) || e.status !== 409) throw e;
      practitioner = await claimSlot(clinic, catalog, service, date, time, undefined, current.id);
    }
    Object.assign(next, {
      date,
      time,
      practitionerId: practitioner.id,
      practitionerName: practitioner.name,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      changes: [...current.changes, { at: new Date().toISOString(), by: opts.by, from: `${current.date} ${current.time}`, to: `${date} ${time}` }],
    });
  }

  if (patch.comment !== undefined) next.comment = str(patch.comment, 500);
  const updated = (await repo().updateAppointment(id, next))!;

  const event = next.status === "cancelled" ? "appointment.cancelled" : moving ? "appointment.rescheduled" : next.status ? "appointment.status" : null;
  if (event) await dispatchAppointmentEvent(event, updated, clinic);
  return updated;
}

/** A client (or the AI on their behalf) finds bookings by reference + phone. Trusted integrations may use caller ID alone. */
export async function lookupAppointments(params: { clinicId: unknown; reference?: unknown; phone?: unknown; trusted?: boolean }): Promise<Appointment[]> {
  const clinic = await resolveClinic(params.clinicId);
  const ref = str(params.reference, 20).toUpperCase();
  const phone = str(params.phone, 40);
  if (digits(phone).length < 8) throw new ApiError(400, "phone is required");
  if (!ref && !params.trusted) throw new ApiError(400, "reference and phone are required");
  const all = await repo().listAppointments(clinic.id, { from: clinicNow().date });
  const found = all.filter((a) => samePhone(a.customer.phone, phone) && (!ref || a.reference.toUpperCase() === ref) && a.status !== "cancelled" && a.status !== "completed");
  if (!found.length) throw new ApiError(404, "No upcoming appointment found");
  return found;
}

const OUTCOMES: CallOutcome[] = ["booking", "rebooking", "cancellation", "question", "transfer", "missed"];

/** Stores a finished call/voice conversation from AIbooking Voice (webhook: call.completed). */
export async function recordCall(raw: Record<string, unknown>): Promise<Call> {
  const clinic = await resolveClinic(raw.clinicId);
  const transcript = Array.isArray(raw.transcript)
    ? (raw.transcript as { who?: string; text?: string }[]).slice(0, 200).map((t) => ({
        who: t.who === "caller" || t.who === "customer" ? ("caller" as const) : ("ai" as const),
        text: str(t.text, 1000),
      }))
    : [];
  return repo().insertCall({
    id: crypto.randomUUID(),
    clinicId: clinic.id,
    from: str(raw.from, 40),
    channel: raw.channel === "voice_widget" ? "voice_widget" : "phone",
    startedAt: typeof raw.startedAt === "string" && !Number.isNaN(Date.parse(raw.startedAt)) ? raw.startedAt : new Date().toISOString(),
    durationSec: Math.max(0, Math.round(Number(raw.durationSec) || 0)),
    outcome: OUTCOMES.includes(raw.outcome as CallOutcome) ? (raw.outcome as CallOutcome) : "question",
    summary: str(raw.summary, 500),
    transcript,
    appointmentId: str(raw.appointmentId, 80) || undefined,
  });
}
