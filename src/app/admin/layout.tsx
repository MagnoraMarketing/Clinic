import type { Metadata } from "next";
import { listClinics, repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";
import { AdminProvider } from "@/components/admin/AdminContext";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · AIbooking Clinic" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const clinics = await listClinics();
  return (
    <AdminProvider initial={clinics}>
      <AdminShell demoMode={serverEnv.demoMode} storage={repo().kind === "supabase" ? "Supabase" : "demo (in-memory)"}>
        {children}
      </AdminShell>
    </AdminProvider>
  );
}
