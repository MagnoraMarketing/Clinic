"use client";

import type { IntegrationStatus } from "@/lib/types";
import type { WebhookLogEntry } from "@/lib/server/repository";
import { formatDateTime } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

const ICON: Record<IntegrationStatus["kind"], string> = { aibooking_calendar: "🗓️", calendar_sync: "📆", practice_system: "🏥", sms: "💬", custom_api: "🧩" };

export default function IntegrationsPage() {
  const { clinic } = useAdmin();
  const statuses = usePoll<IntegrationStatus[]>("/api/integrations", 0).data ?? [];
  const log = usePoll<WebhookLogEntry[]>(clinic ? `/api/webhooks?clinicId=${clinic.id}` : null, 8000).data ?? [];
  return (
    <>
      <PageTitle title="Integrations" text="Every booking, rebooking and cancellation – from phone, widget or website – is forwarded to the systems you already use. A failing integration never blocks a booking." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statuses.map((s) => (
          <div key={s.kind} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-3xl">{ICON[s.kind]}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${s.enabled ? "bg-emerald-400/15 text-emerald-300" : "bg-white/8 text-ink-400"}`}>{s.enabled ? "Active" : "Not connected"}</span>
            </div>
            <p className="mt-4 font-semibold">{s.name}</p>
            <p className="mt-1 text-sm text-ink-400">{s.description}</p>
            <p className="mt-3 rounded-xl bg-ink-850 px-3 py-2 font-mono text-[11px] text-ink-300">{s.details}</p>
          </div>
        ))}
      </div>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Webhook log</h2>
        <p className="mt-1 text-sm text-ink-400">Outbound: appointment.created · appointment.rescheduled · appointment.cancelled. Inbound: events from AIbooking Voice (POST /api/webhooks).</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-400">
              <tr>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Direction</th>
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 text-ink-400">{formatDateTime(l.createdAt)}</td>
                  <td>{l.direction === "inbound" ? "⬇️ In" : "⬆️ Out"}</td>
                  <td className="font-mono text-xs">{l.event}</td>
                  <td>{l.target}</td>
                  <td>
                    <span className={l.status === "failed" ? "text-red-300" : "text-emerald-300"}>{l.status}</span>
                    {l.detail && <span className="block text-xs text-ink-400">{l.detail}</span>}
                  </td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-400">
                    No webhooks yet – connect an integration via environment variables (see README).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
