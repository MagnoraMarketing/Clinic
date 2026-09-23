import { serverEnv } from "@/lib/server/env";
import { formatDate } from "@/lib/format";
import type { AppointmentAdapter } from "./index";
import { signPayload } from "./signing";

// Webhook adapters: send appointment events as JSON to the clinic's own systems
// (practice/journal system, SMS gateway, anything with an API). Signed with HMAC so
// the receiver can verify the data comes from AIbooking (header: X-AIbooking-Signature).

async function post(url: string, event: string, data: unknown) {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "AIbooking-Webhooks/1.0" };
  if (serverEnv.customWebhookSecret) headers["X-AIbooking-Signature"] = signPayload(body, serverEnv.customWebhookSecret);
  const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { externalId: json.id ? String(json.id) : undefined, detail: `HTTP ${res.status}` };
}

export const practiceSystemAdapter: AppointmentAdapter = {
  key: "practice_system",
  name: "Practice system",
  isConfigured: () => Boolean(serverEnv.practiceWebhookUrl),
  push: (event, appointment) => post(serverEnv.practiceWebhookUrl, event, appointment),
};

export const customApiAdapter: AppointmentAdapter = {
  key: "custom_api",
  name: "Custom API",
  isConfigured: () => Boolean(serverEnv.customWebhookUrl),
  push: (event, appointment) => post(serverEnv.customWebhookUrl, event, appointment),
};

/** Sends a ready-to-send text message to an SMS gateway webhook. */
export const smsAdapter: AppointmentAdapter = {
  key: "sms",
  name: "SMS",
  isConfigured: () => Boolean(serverEnv.smsWebhookUrl),
  async push(event, a, clinic) {
    if (event === "appointment.status") return { detail: "No SMS for status changes" };
    const when = `${formatDate(a.date)} at ${a.time}`;
    const text =
      event === "appointment.cancelled"
        ? `Your ${a.serviceName} at ${clinic.name} on ${when} has been cancelled. Ref. ${a.reference}.`
        : event === "appointment.rescheduled"
          ? `Your appointment at ${clinic.name} has been moved to ${when} with ${a.practitionerName}. Ref. ${a.reference}.`
          : a.status === "pending"
            ? `Thanks! We've received your request for ${a.serviceName} on ${when}. ${clinic.name} will confirm shortly. Ref. ${a.reference}.`
            : `You're booked at ${clinic.name}: ${a.serviceName} with ${a.practitionerName}, ${when}. Ref. ${a.reference}. Reply or call ${clinic.phone} to change.`;
    await post(serverEnv.smsWebhookUrl, "sms.send", { to: a.customer.phone, from: clinic.name.slice(0, 11), text, appointmentId: a.id });
    return { detail: `SMS to ${a.customer.phone}` };
  },
};
