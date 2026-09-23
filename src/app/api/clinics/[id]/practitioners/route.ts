import type { NextRequest } from "next/server";
import type { Practitioner, Weekday } from "@/lib/types";
import { ApiError, handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/** PATCH /api/clinics/:id/practitioners { practitionerId, workDays?, active?, title?, bio? } (admin) */
export const PATCH = handler(async (req: NextRequest, ctx: RouteContext<"/api/clinics/[id]/practitioners">) => {
  await requireAdmin(req);
  const clinic = await resolveClinic((await ctx.params).id);
  const body = await readJson<Partial<Practitioner> & { practitionerId?: string }>(req);
  const patch: Partial<Practitioner> = {};
  if (Array.isArray(body.workDays)) patch.workDays = [...new Set(body.workDays.map(Number).filter((d) => d >= 0 && d <= 6))] as Weekday[];
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (typeof body.title === "string") patch.title = body.title.slice(0, 120);
  if (typeof body.bio === "string") patch.bio = body.bio.slice(0, 300);
  const updated = await repo().updatePractitioner(clinic.id, String(body.practitionerId ?? ""), patch);
  if (!updated) throw new ApiError(404, "Practitioner not found");
  return json({ data: updated });
});
