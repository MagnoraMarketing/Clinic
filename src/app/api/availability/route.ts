import type { NextRequest } from "next/server";
import { handler, json } from "@/lib/server/http";
import { getAvailability } from "@/lib/server/services";

/**
 * GET /api/availability?clinicId=…&serviceId=…|service=deep+tissue&date=YYYY-MM-DD[&practitionerId=…|practitioner=Sofie][&excludeAppointmentId=…]
 * Free start times per practitioner. When the day is full: the next dates with free times.
 */
export const GET = handler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const data = await getAvailability({
    clinicId: sp.get("clinicId"),
    serviceId: sp.get("serviceId") ?? undefined,
    service: sp.get("service") ?? undefined,
    date: sp.get("date"),
    practitionerId: sp.get("practitionerId") ?? undefined,
    practitioner: sp.get("practitioner") ?? undefined,
    excludeAppointmentId: sp.get("excludeAppointmentId") ?? undefined,
  });
  return json({ data });
});
