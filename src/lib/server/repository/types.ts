import type { Appointment, Call, Catalog, Clinic, Customer, Practitioner, Service } from "@/lib/types";

export interface WebhookLogEntry {
  id: string;
  clinicId: string | null;
  direction: "inbound" | "outbound";
  event: string;
  target: string;
  status: "received" | "processed" | "delivered" | "failed" | "skipped";
  detail?: string;
  createdAt: string;
}

/**
 * Storage abstraction. Without Supabase keys the platform runs on an in-memory
 * demo store; with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY Supabase is used.
 * All tenant calls take a clinicId, so data is never mixed.
 */
export interface Repository {
  kind: "memory" | "supabase";

  listClinics(): Promise<Clinic[]>;
  getClinic(idOrSlug: string): Promise<Clinic | null>;
  updateClinic(id: string, patch: Partial<Clinic>): Promise<Clinic | null>;

  getCatalog(clinicId: string): Promise<Catalog>;
  updateService(clinicId: string, serviceId: string, patch: Partial<Service>): Promise<Service | null>;
  updatePractitioner(clinicId: string, practitionerId: string, patch: Partial<Practitioner>): Promise<Practitioner | null>;

  listAppointments(clinicId: string, opts?: { date?: string; from?: string; to?: string }): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | null>;
  insertAppointment(appointment: Appointment): Promise<Appointment>;
  updateAppointment(id: string, patch: Partial<Appointment>): Promise<Appointment | null>;

  listCustomers(clinicId: string): Promise<Customer[]>;

  listCalls(clinicId: string, limit?: number): Promise<Call[]>;
  insertCall(call: Call): Promise<Call>;

  logWebhook(entry: Omit<WebhookLogEntry, "id" | "createdAt">): Promise<void>;
  listWebhookLog(clinicId?: string, limit?: number): Promise<WebhookLogEntry[]>;
}
