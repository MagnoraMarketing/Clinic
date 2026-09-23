import Link from "next/link";
import type { Metadata } from "next";
import { listClinics, repo } from "@/lib/server/repository";
import { TYPE_LABEL } from "@/lib/demo/clinics";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Photo } from "@/components/ui/Photo";
import { priceLabel } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Demo clinics") };
}

export default async function DemoHub() {
  const { t, locale } = await getT();
  const clinics = await listClinics();
  const catalogs = await Promise.all(clinics.map((c) => repo().getCatalog(c.id)));
  return (
    <>
      <SiteHeader />
      <main className="container-x pt-32 pb-24">
        <span className="eyebrow">{t("Multi-tenant demo")}</span>
        <h1 className="h-display mt-5 text-4xl sm:text-6xl">{t("Demo clinics")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-300">
          {t("Every clinic is a separate tenant with its own website, design, treatments, prices, team, phone number and AI agent – on the same platform, without data being mixed.")}
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clinics.map((c, i) => {
            const cheapest = [...catalogs[i].services].filter((s) => s.price > 0).sort((a, b) => a.price - b.price)[0];
            return (
              <Link key={c.id} href={`/demo/${c.slug}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:border-white/20">
                <Photo src={c.heroImage} alt={t(c.name)} emoji={c.emoji} className="h-48" />
                <div className="p-6">
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-ink-950" style={{ background: c.accentColor }}>
                    {t(TYPE_LABEL[c.type])}
                  </span>
                  <h2 className="mt-3 font-display text-2xl font-semibold">
                    {c.emoji} {c.name}
                  </h2>
                  <p className="text-sm text-ink-400">{t(c.tagline)}</p>
                  <p className="mt-3 text-xs text-ink-400">
                    {t("{n} treatments · {p} practitioners", { n: catalogs[i].services.length, p: catalogs[i].practitioners.length })}{cheapest ? ` · ${t("from {price}", { price: priceLabel({ price: cheapest.price }, locale) })}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
