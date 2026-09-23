import type { NextRequest } from "next/server";
import { handler, isTrustedIntegration, json } from "@/lib/server/http";
import { lookupAppointments } from "@/lib/server/services";

/**
 * GET /api/appointments/lookup?clinicId=…&reference=CA-4201&phone=12345678
 * The client (or the AI) finds upcoming appointments with reference + phone, so they
 * can be moved or cancelled. AIbooking Voice (API key) may look up by caller ID alone.
 */
export const GET = handler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const data = await lookupAppointments({ clinicId: sp.get("clinicId"), reference: sp.get("reference") ?? "", phone: sp.get("phone") ?? "", trusted: isTrustedIntegration(req) });
  return json({ data });
});
