import type { NextRequest } from "next/server";
import type { Clinic } from "@/lib/types";
import { ApiError, handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { toPublicClinic } from "@/lib/server/public";

/**
 * GET /api/clinics/:id – the clinic's public configuration.
 * Used by the AI agent/widget to know opening hours, address, FAQ, insurance and booking rules.
 */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext<"/api/clinics/[id]">) => {
  const { id } = await ctx.params;
  return json({ data: toPublicClinic(await resolveClinic(id)) });
});

const EDITABLE: (keyof Clinic)[] = [
  "name", "tagline", "description", "address", "city", "phone", "email", "parking", "insurance",
  "openingHours", "booking", "paymentMethods", "faq", "widget", "accentColor", "reviewUrl",
];

/** PATCH /api/clinics/:id (admin) – the AI receptionist's configuration per clinic. */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/clinics/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const clinic = await resolveClinic(id);
  const body = await readJson<Partial<Clinic>>(req);
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => EDITABLE.includes(k as keyof Clinic))) as Partial<Clinic>;
  if (patch.reviewUrl !== undefined && patch.reviewUrl !== "" && !/^https:\/\//.test(String(patch.reviewUrl))) throw new ApiError(422, "reviewUrl must be an https:// address");
  if (patch.widget) patch.widget = { ...clinic.widget, ...patch.widget, clinicId: clinic.id };
  if (patch.booking) patch.booking = { ...clinic.booking, ...patch.booking };
  return json({ data: await repo().updateClinic(clinic.id, patch) });
});
