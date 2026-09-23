"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import type { Appointment, Call } from "@/lib/types";
import { dkk, timeAgo } from "@/lib/format";
import { clinicNow } from "@/lib/hours";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { Kpi, PageTitle } from "@/components/admin/AdminShell";
import { OUTCOME, SOURCE, STATUS } from "@/components/admin/labels";

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const { clinic, catalog } = useAdmin();
  const cid = clinic?.id;
  const today = clinicNow().date;
  const appts = usePoll<Appointment[]>(cid ? `/api/appointments?clinicId=${cid}&from=${today}` : null, 6000).data ?? [];
  const calls = usePoll<Call[]>(cid ? `/api/calls?clinicId=${cid}` : null, 6000).data ?? [];
  if (!clinic) return null;

  const active = appts.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
  const todays = active.filter((a) => a.date === today);
  const revenue = todays.reduce((s, a) => s + a.price, 0);
  const ai = appts.filter((a) => a.source === "voice" || a.source === "phone" || a.source === "chat");
  const moved = appts.filter((a) => a.changes.length > 0);
  const pending = appts.filter((a) => a.status === "pending");
  const bySource = Object.entries(appts.reduce<Record<string, number>>((acc, a) => ((acc[a.source] = (acc[a.source] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]);
  const staff = catalog?.practitioners ?? [];

  return (
    <>
      <PageTitle
        title={`${t("Good day, {name}", { name: clinic.name })} 👋`}
        text="Today's appointments, the AI receptionist's calls, and everything it booked, moved or cancelled."
        actions={
          <>
            <Link href="/admin/calls" className="btn-secondary">
              📞 {t("Calls")}
            </Link>
            <Link href="/admin/appointments" className="btn-primary">
              {t("Open today's calendar")}
            </Link>
          </>
        }
      />
      {pending.length > 0 && (
        <Link href="/admin/appointments" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <span>🆕 {t(pending.length > 1 ? "{n} new-patient requests waiting for your approval" : "{n} new-patient request waiting for your approval", { n: pending.length })}</span>
          <span className="font-semibold">{t("Review →")}</span>
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Appointments today" value={String(todays.length)} hint={t("{value} booked value", { value: dkk(revenue, locale) })} />
        <Kpi label="Upcoming" value={String(active.length)} hint="today and later" />
        <Kpi label="Booked by AI" value={`${appts.length ? Math.round((ai.length / appts.length) * 100) : 0}%`} hint="phone, voice widget and chat" accent />
        <Kpi label="Moved / cancelled by AI" value={`${moved.length} / ${appts.filter((a) => a.status === "cancelled").length}`} hint="without staff on the phone" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t("Today")}</h2>
            <Link href="/admin/appointments" className="text-xs font-semibold text-sage-300">
              {t("Calendar →")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-start text-xs text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">{t("Time")}</th>
                  <th className="pb-2 font-medium">{t("Client")}</th>
                  <th className="pb-2 font-medium">{t("Treatment")}</th>
                  <th className="pb-2 font-medium">{t("With")}</th>
                  <th className="pb-2 font-medium">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appts
                  .filter((a) => a.date === today)
                  .map((a) => {
                    const p = staff.find((x) => x.id === a.practitionerId);
                    return (
                      <tr key={a.id} className={a.status === "cancelled" ? "opacity-50" : ""}>
                        <td className="py-2.5 font-semibold tabular-nums">{a.time}</td>
                        <td>
                          {a.customer.name}
                          <span className="block text-xs text-ink-400">
                            {SOURCE[a.source].icon} {t(SOURCE[a.source].label)}
                            {a.changes.length ? ` · 🔄 ${t("moved")}` : ""}
                          </span>
                        </td>
                        <td>{t(a.serviceName)}</td>
                        <td>
                          <span className="me-1.5 inline-block h-2 w-2 rounded-full" style={{ background: p?.color ?? "#888" }} />
                          {a.practitionerName.replace(/^Dr\.\s+/, "Dr. ").split(" ").slice(0, a.practitionerName.startsWith("Dr.") ? 3 : 1).join(" ")}
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[a.status].cls}`}>{t(STATUS[a.status].label)}</span>
                        </td>
                      </tr>
                    );
                  })}
                {!appts.some((a) => a.date === today) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-400">
                      {t("No appointments today")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{t("Latest calls")}</h2>
              <Link href="/admin/calls" className="text-xs font-semibold text-sage-300">
                {t("All calls →")}
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {calls.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-ink-850 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate">{c.summary}</span>
                    <span className="text-xs text-ink-400">
                      {c.channel === "phone" ? "📞" : "🎙️"} {timeAgo(c.startedAt, locale)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${OUTCOME[c.outcome].cls}`}>{t(OUTCOME[c.outcome].label)}</span>
                </li>
              ))}
              {calls.length === 0 && <li className="text-ink-400">{t("No calls yet")}</li>}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">{t("Bookings per channel")}</h2>
            <div className="space-y-3">
              {bySource.map(([src, n]) => (
                <div key={src}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {SOURCE[src as keyof typeof SOURCE].icon} {t(SOURCE[src as keyof typeof SOURCE].label)}
                    </span>
                    <span className="text-ink-400">{n}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sage-400" style={{ width: `${(n / appts.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
