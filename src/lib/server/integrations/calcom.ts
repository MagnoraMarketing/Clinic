import { serverEnv } from "@/lib/server/env";
import { TIME_ZONE } from "@/lib/hours";
import type { AppointmentAdapter } from "./index";

// Cal.com adapter: mirrors appointments to Cal.com (v2 API), so clinics that already
// use Cal.com (or sync it with Google/Outlook) get AI bookings straight into their calendar.
// Rebookings and cancellations are mirrored too, using the Cal.com booking uid.

const API = "https://api.cal.com/v2/bookings";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.calcomApiKey}`, "cal-api-version": "2024-08-13" });

/** Local clinic time → ISO string in UTC (handles summer/winter time). */
function toUtcIso(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = new Date(guess.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  return new Date(guess.getTime() - (local.getTime() - guess.getTime())).toISOString();
}

async function call(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const json = (await res.json().catch(() => ({}))) as { data?: { uid?: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(`Cal.com: ${json.error?.message ?? res.status}`);
  return json;
}

export const calcomAdapter: AppointmentAdapter = {
  key: "calcom",
  name: "Cal.com",
  isConfigured: () => Boolean(serverEnv.calcomApiKey && serverEnv.calcomEventTypeId),
  async push(event, a, clinic) {
    const uid = a.externalRefs.calcom;
    if (event === "appointment.cancelled") {
      if (!uid) return { detail: "Not in Cal.com" };
      await call(`${API}/${uid}/cancel`, { cancellationReason: "Cancelled via AIbooking" });
      return { detail: "Cancelled in Cal.com" };
    }
    if (event === "appointment.rescheduled" && uid) {
      const json = await call(`${API}/${uid}/reschedule`, { start: toUtcIso(a.date, a.time), reschedulingReason: "Moved via AIbooking" });
      return { externalId: json.data?.uid ?? uid, detail: "Rescheduled in Cal.com" };
    }
    if (event === "appointment.status") return { detail: "Status not mirrored" };
    const json = await call(API, {
      eventTypeId: Number(serverEnv.calcomEventTypeId),
      start: toUtcIso(a.date, a.time),
      lengthInMinutes: a.durationMinutes,
      attendee: {
        name: a.customer.name,
        email: a.customer.email || `no-reply+${a.reference}@aibooking.dk`,
        phoneNumber: a.customer.phone,
        timeZone: TIME_ZONE,
        language: "en",
      },
      metadata: { clinic: clinic.slug, reference: a.reference, service: a.serviceName, practitioner: a.practitionerName },
      bookingFieldsResponses: { notes: `${a.serviceName} with ${a.practitionerName}. ${a.comment ?? ""}`.trim() },
    });
    return { externalId: json.data?.uid, detail: "Created in Cal.com" };
  },
};
