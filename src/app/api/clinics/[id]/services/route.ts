import type { NextRequest } from "next/server";
import type { Service } from "@/lib/types";
import { ApiError, handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/** GET /api/clinics/:id/services – price list, categories and practitioners (public; used by the AI). */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/clinics/[id]/services">) => {
  const clinic = await resolveClinic((await ctx.params).id);
  return json({ data: await repo().getCatalog(clinic.id) });
});

/** PATCH /api/clinics/:id/services { serviceId, price?, durationMinutes?, available?, … } (admin) */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/clinics/[id]/services">) => {
  await requireAdmin(req);
  const clinic = await resolveClinic((await ctx.params).id);
  const body = await readJson<Partial<Service> & { serviceId?: string }>(req);
  const patch: Partial<Service> = {};
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0 || p > 100000) throw new ApiError(422, "Invalid price");
    patch.price = Math.round(p);
  }
  if (body.durationMinutes !== undefined) {
    const d = Number(body.durationMinutes);
    if (!Number.isInteger(d) || d < 5 || d > 480) throw new ApiError(422, "Duration must be 5–480 minutes");
    patch.durationMinutes = d;
  }
  if (body.available !== undefined) patch.available = Boolean(body.available);
  if (body.popular !== undefined) patch.popular = Boolean(body.popular);
  if (body.priceFrom !== undefined) patch.priceFrom = Boolean(body.priceFrom);
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
  if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 300);
  if (Array.isArray(body.practitionerIds)) patch.practitionerIds = body.practitionerIds.map(String);
  const updated = await repo().updateService(clinic.id, String(body.serviceId ?? ""), patch);
  if (!updated) throw new ApiError(404, "Service not found");
  return json({ data: updated });
});
