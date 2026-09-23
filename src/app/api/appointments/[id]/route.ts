import type { NextRequest } from "next/server";
import type { AppointmentSource } from "@/lib/types";
import { ApiError, handler, isAdmin, isTrustedIntegration, json, readJson } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { samePhone, updateAppointment } from "@/lib/server/services";

const CLIENT_SOURCES: AppointmentSource[] = ["website", "chat", "voice", "phone", "api"];

/** GET /api/appointments/:id (admin or trusted integration) */
export const GET = handler(async (req: NextRequest, ctx: RouteContext<"/api/appointments/[id]">) => {
  if (!(await isAdmin(req)) && !isTrustedIntegration(req)) throw new ApiError(401, "Admin access required");
  const { id } = await ctx.params;
  const a = await repo().getAppointment(id);
  if (!a) throw new ApiError(404, "The appointment does not exist");
  return json({ data: a });
});

/**
 * PATCH /api/appointments/:id – rebook (date, time, practitioner, service) or cancel.
 * Admin may do everything. The client (or the AI on the client's behalf) must send the
 * phone number the appointment was booked with, and may only rebook or cancel.
 * Trusted integrations (AIbooking Voice with API key) act on the caller's behalf.
 */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/appointments/[id]">) => {
  const { id } = await ctx.params;
  const body = await readJson<Record<string, unknown>>(req);
  const { phone, source, ...patch } = body;
  const by = CLIENT_SOURCES.includes(source as AppointmentSource) ? (source as AppointmentSource) : "website";
  // In the public demo everyone is "admin" – but requests that identify as a client (phone + source) follow client rules
  const actsAsClient = typeof phone === "string" && typeof source === "string";
  if (!actsAsClient && (await isAdmin(req))) return json({ data: await updateAppointment(id, patch, { by: "admin" }) });
  if (!isTrustedIntegration(req)) {
    const a = await repo().getAppointment(id);
    if (!a) throw new ApiError(404, "The appointment does not exist");
    if (typeof phone !== "string" || !samePhone(phone, a.customer.phone)) throw new ApiError(403, "The phone number doesn't match the appointment");
  }
  return json({ data: await updateAppointment(id, patch, { by }) });
});
