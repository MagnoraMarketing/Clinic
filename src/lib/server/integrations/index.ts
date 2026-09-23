import type { Appointment, Clinic, IntegrationStatus } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/server/env";
import { repo } from "@/lib/server/repository";
import { calcomAdapter } from "./calcom";
import { customApiAdapter, practiceSystemAdapter, smsAdapter } from "./webhooks";

// Integration architecture: AIbooking receives bookings, rebookings and
// cancellations from every channel (website, chat, voice, phone, API) and forwards
// them to the systems the clinic already uses. Each adapter is independent and is
// switched on via environment variables (or per clinic via the `integrations` table).

export type AppointmentEvent = "appointment.created" | "appointment.rescheduled" | "appointment.cancelled" | "appointment.status";

export interface AppointmentAdapter {
  key: string;
  name: string;
  isConfigured(): boolean;
  push(event: AppointmentEvent, appointment: Appointment, clinic: Clinic): Promise<{ externalId?: string; detail?: string } | void>;
}

const adapters: AppointmentAdapter[] = [calcomAdapter, practiceSystemAdapter, smsAdapter, customApiAdapter];

/** Sends an appointment event to every configured system. Failures never block the booking – they're logged. */
export async function dispatchAppointmentEvent(event: AppointmentEvent, appointment: Appointment, clinic: Clinic): Promise<Record<string, string>> {
  const refs: Record<string, string> = {};
  await Promise.all(
    adapters
      .filter((a) => a.isConfigured())
      .map(async (a) => {
        try {
          const res = (await a.push(event, appointment, clinic)) || {};
          if (res.externalId) refs[a.key] = res.externalId;
          await repo().logWebhook({ clinicId: clinic.id, direction: "outbound", event, target: a.name, status: "delivered", detail: res.detail });
        } catch (e) {
          await repo().logWebhook({ clinicId: clinic.id, direction: "outbound", event, target: a.name, status: "failed", detail: e instanceof Error ? e.message : String(e) });
        }
      }),
  );
  return { ...appointment.externalRefs, ...refs };
}

/** Status for admin → Integrations. Never shows the keys – only whether they are set. */
export function integrationStatuses(): IntegrationStatus[] {
  return [
    {
      kind: "aibooking_calendar",
      name: "AIbooking Calendar",
      description: "Built-in appointment calendar with practitioners, buffers and rebooking log.",
      configured: true,
      enabled: true,
      details: isSupabaseConfigured() ? "Stored in Supabase" : "Demo store (in-memory)",
    },
    {
      kind: "calendar_sync",
      name: "Cal.com / calendar sync",
      description: "Mirror bookings, rebookings and cancellations to Cal.com (and on to Google/Outlook calendars).",
      configured: calcomAdapter.isConfigured(),
      enabled: calcomAdapter.isConfigured(),
      details: calcomAdapter.isConfigured() ? "Cal.com connected" : "Set CALCOM_API_KEY + CALCOM_EVENT_TYPE_ID",
    },
    {
      kind: "practice_system",
      name: "Practice / journal system",
      description: "Send appointments to your existing practice management or journal system as signed webhooks.",
      configured: practiceSystemAdapter.isConfigured(),
      enabled: practiceSystemAdapter.isConfigured(),
      details: practiceSystemAdapter.isConfigured() ? "Webhook active (HMAC-signed)" : "Set PRACTICE_SYSTEM_WEBHOOK_URL",
    },
    {
      kind: "sms",
      name: "SMS confirmations & reminders",
      description: "Text the client a confirmation, and a new one when the appointment is moved or cancelled.",
      configured: smsAdapter.isConfigured(),
      enabled: smsAdapter.isConfigured(),
      details: smsAdapter.isConfigured() ? "SMS gateway connected" : "Set SMS_WEBHOOK_URL (e.g. your SMS provider)",
    },
    {
      kind: "custom_api",
      name: "Custom API",
      description: "Have your own system? Receive every appointment event as a signed webhook – or use our REST API.",
      configured: customApiAdapter.isConfigured(),
      enabled: customApiAdapter.isConfigured(),
      details: customApiAdapter.isConfigured() ? "Webhook active (HMAC-signed)" : "Set CUSTOM_WEBHOOK_URL",
    },
  ];
}
