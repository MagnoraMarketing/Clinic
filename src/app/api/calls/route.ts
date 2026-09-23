import type { NextRequest } from "next/server";
import { handler, isTrustedIntegration, json, readJson, requireAdmin } from "@/lib/server/http";
import { recordCall, resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/calls?clinicId=… (admin) – calls and voice conversations handled by the AI receptionist. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const clinic = await resolveClinic(req.nextUrl.searchParams.get("clinicId") || serverEnv.defaultClinicSlug);
  return json({ data: await repo().listCalls(clinic.id) });
});

/** POST /api/calls (admin or AIbooking Voice with API key) – record a finished call. */
export const POST = handler(async (req: NextRequest) => {
  if (!isTrustedIntegration(req)) await requireAdmin(req);
  return json({ data: await recordCall(await readJson(req)) }, 201);
});
