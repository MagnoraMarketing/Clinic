import type { NextRequest } from "next/server";
import type { CreateAppointmentInput } from "@/lib/types";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";
import { createAppointment, resolveClinic } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

/** GET /api/appointments?clinicId=…&date=YYYY-MM-DD&from=…&to=… (admin) */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const clinic = await resolveClinic(sp.get("clinicId") || serverEnv.defaultClinicSlug);
  const data = await repo().listAppointments(clinic.id, { date: sp.get("date") || undefined, from: sp.get("from") || undefined, to: sp.get("to") || undefined });
  return json({ data, clinicId: clinic.id });
});

/** POST /api/appointments – booking from the website, chat, voice, phone or an integration. */
export const POST = handler(async (req: NextRequest) => {
  const body = await readJson<CreateAppointmentInput>(req);
  return json({ data: await createAppointment(body) }, 201);
});
