import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClinic, repo } from "@/lib/server/repository";
import { ClinicShell } from "@/components/clinic/ClinicShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/demo/[slug]">): Promise<Metadata> {
  const c = await getClinic((await params).slug);
  return c ? { title: { default: `${c.name} – ${c.tagline}`, template: `%s · ${c.name}` }, description: c.description } : {};
}

export default async function ClinicLayout({ children, params }: LayoutProps<"/demo/[slug]">) {
  const clinic = await getClinic((await params).slug);
  if (!clinic) notFound();
  const catalog = await repo().getCatalog(clinic.id);
  return (
    <ClinicShell clinic={clinic} catalog={catalog}>
      {children}
    </ClinicShell>
  );
}
