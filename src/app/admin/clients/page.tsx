"use client";

import type { Customer } from "@/lib/types";
import { dkk, timeAgo } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";

export default function ClientsPage() {
  const { clinic } = useAdmin();
  const { data } = usePoll<Customer[]>(clinic ? `/api/customers?clinicId=${clinic.id}` : null, 15000);
  const list = data ?? [];
  return (
    <>
      <PageTitle title="Clients" text="Built automatically from bookings across every channel – phone AI, voice widget, chat and website." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-ink-400">
            <tr className="border-b border-white/5">
              <th className="p-4 font-medium">Client</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Visits</th>
              <th className="p-4 font-medium">Upcoming</th>
              <th className="p-4 font-medium">Cancelled</th>
              <th className="p-4 font-medium">Spent</th>
              <th className="p-4 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((c) => (
              <tr key={c.id}>
                <td className="p-4">
                  <span className="font-semibold">{c.name}</span>
                  {c.email && <span className="block text-xs text-ink-400">{c.email}</span>}
                </td>
                <td className="p-4 tabular-nums">{c.phone}</td>
                <td className="p-4">{c.visitCount}</td>
                <td className="p-4">{c.upcomingCount}</td>
                <td className="p-4">{c.cancellationCount}</td>
                <td className="p-4 tabular-nums">{dkk(c.totalSpent)}</td>
                <td className="p-4 text-ink-400">{timeAgo(c.lastSeenAt)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-ink-400">
                  No clients yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
