"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import type { Customer } from "@/lib/types";
import { dkk, timeAgo } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

export default function ClientsPage() {
  const { t, locale } = useI18n();
  const { clinic } = useAdmin();
  const { data } = usePoll<Customer[]>(clinic ? `/api/customers?clinicId=${clinic.id}` : null, 15000);
  const list = data ?? [];
  return (
    <>
      <PageTitle title="Clients" text="Built automatically from bookings across every channel – phone AI, voice widget, chat and website." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-start text-xs text-ink-400">
            <tr className="border-b border-white/5">
              <th className="p-4 font-medium">{t("Client")}</th>
              <th className="p-4 font-medium">{t("Phone")}</th>
              <th className="p-4 font-medium">{t("Visits")}</th>
              <th className="p-4 font-medium">{t("Upcoming")}</th>
              <th className="p-4 font-medium">{t("Cancelled")}</th>
              <th className="p-4 font-medium">{t("Spent")}</th>
              <th className="p-4 font-medium">{t("Last activity")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((c) => (
              <tr key={c.id}>
                <td className="p-4">
                  <span className="font-semibold">{c.name}</span>
                  {c.email && <span className="block text-xs text-ink-400">{c.email}</span>}
                </td>
                <td className="p-4 tabular-nums"><span dir="ltr">{c.phone}</span></td>
                <td className="p-4">{c.visitCount}</td>
                <td className="p-4">{c.upcomingCount}</td>
                <td className="p-4">{c.cancellationCount}</td>
                <td className="p-4 tabular-nums">{dkk(c.totalSpent, locale)}</td>
                <td className="p-4 text-ink-400">{timeAgo(c.lastSeenAt, locale)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-ink-400">
                  {t("No clients yet")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
