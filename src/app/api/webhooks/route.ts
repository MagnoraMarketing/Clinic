import type { NextRequest } from "next/server";
import type { CreateAppointmentInput } from "@/lib/types";
import { ApiError, handler, json, requireAdmin } from "@/lib/server/http";
import { serverEnv } from "@/lib/server/env";
import { verifyApiKey } from "@/lib/server/admin-auth";
import { verifySignature } from "@/lib/server/integrations/signing";
import { createAppointment, recordCall, resolveClinic, updateAppointment } from "@/lib/server/services";
import { repo } from "@/lib/server/repository";

/**
 * POST /api/webhooks – inbound events from AIbooking Voice, the chat widget and practice systems.
 *
 * Body: { "event": "appointment.created", "clinicId": "calm-hands", "data": { … } }
 * Events: appointment.created · appointment.rescheduled · appointment.cancelled · call.completed
 * Security: X-AIbooking-Signature (HMAC, "t=<unix>,v1=<hex>") or Authorization: Bearer <AIBOOKING_API_KEY>.
 */
export const POST = handler(async (req: NextRequest) => {
  const raw = await req.text();
  const signed = serverEnv.webhookSigningSecret ? verifySignature(raw, req.headers.get("x-aibooking-signature"), serverEnv.webhookSigningSecret) : false;
  const keyed = verifyApiKey(req.headers.get("authorization"), serverEnv.aibookingApiKey);
  if (!signed && !keyed && !serverEnv.demoMode) throw new ApiError(401, "Invalid or missing webhook signature");

  let payload: { event?: string; clinicId?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
  const event = String(payload.event ?? "");
  const clinic = await resolveClinic(payload.clinicId ?? payload.data?.clinicId);
  const data: Record<string, unknown> = { ...(payload.data ?? {}), clinicId: clinic.id };
  const log = (status: "processed" | "received" | "failed", detail?: string) =>
    repo().logWebhook({ clinicId: clinic.id, direction: "inbound", event, target: "/api/webhooks", status, detail });

  const owned = async () => {
    const a = await repo().getAppointment(String(data.appointmentId));
    if (!a || a.clinicId !== clinic.id) throw new ApiError(404, "The appointment does not exist");
    return a;
  };

  try {
    let result: unknown;
    switch (event) {
      case "appointment.created":
        result = await createAppointment({ source: "voice", ...(data as unknown as CreateAppointmentInput) });
        break;
      case "appointment.rescheduled": {
        const a = await owned();
        const { appointmentId: _id, clinicId: _c, ...patch } = data;
        result = await updateAppointment(a.id, patch, { by: "voice" });
        break;
      }
      case "appointment.cancelled":
        result = await updateAppointment((await owned()).id, { status: "cancelled" }, { by: "voice" });
        break;
      case "call.completed":
        result = await recordCall(data);
        break;
      default:
        // e.g. call.started, conversation.summary – logged to history
        await log("received");
        return json({ received: true, event });
    }
    await log("processed");
    return json({ received: true, event, data: result });
  } catch (e) {
    await log("failed", e instanceof Error ? e.message : String(e));
    throw e;
  }
});

/** GET /api/webhooks (admin) – log of inbound and outbound webhooks. */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const cid = req.nextUrl.searchParams.get("clinicId");
  const clinic = cid ? await resolveClinic(cid) : null;
  return json({ data: await repo().listWebhookLog(clinic?.id) });
});
