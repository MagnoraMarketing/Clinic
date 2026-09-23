"use client";

import type { Appointment } from "@/lib/types";
import type { AvailabilityResult } from "@/lib/server/services";
import { publicConfig } from "@/lib/config";

// Browser client for the AIbooking REST API. NEXT_PUBLIC_AIBOOKING_API_URL can point
// to a central AIbooking API; otherwise this app's own /api routes are used.
const base = () => publicConfig.apiUrl.replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string; details?: string[] };
  if (!res.ok) {
    const details = Array.isArray(json.details) ? ` (${json.details.join("; ")})` : "";
    throw new Error(`${json.error ?? `Error ${res.status}`}${details}`);
  }
  return json.data as T;
}

export type { AvailabilityResult };

export const assistantApi = {
  availability: (q: { clinicId: string; serviceId: string; date: string; practitionerId?: string; excludeAppointmentId?: string }) =>
    api<AvailabilityResult>(`/api/availability?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`),
  createAppointment: (body: unknown) => api<Appointment>("/api/appointments", { method: "POST", body: JSON.stringify(body) }),
  lookup: (clinicId: string, reference: string, phone: string) =>
    api<Appointment[]>(`/api/appointments/lookup?${new URLSearchParams({ clinicId, reference, phone })}`),
  updateAppointment: (id: string, body: unknown) => api<Appointment>(`/api/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
