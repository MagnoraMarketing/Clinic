import type { NextRequest } from "next/server";
import { handler, json, requireAdmin } from "@/lib/server/http";
import { resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/customers?clinicId=… (admin) */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const clinic = await resolveClinic(req.nextUrl.searchParams.get("clinicId") || serverEnv.defaultClinicSlug);
  return json({ data: await repo().listCustomers(clinic.id) });
});
