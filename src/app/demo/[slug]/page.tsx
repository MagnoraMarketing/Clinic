import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinic, repo } from "@/lib/server/repository";
import { groupedHours } from "@/lib/hours";
import { duration, initials, priceLabel, telHref } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Icon } from "@/components/ui/Icon";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import { OpenNowBadge } from "@/components/clinic/OpenNowBadge";
import { getT } from "@/lib/i18n/server";

export default async function ClinicHome({ params }: PageProps<"/demo/[slug]">) {
  const { t, locale } = await getT();
  const c = await getClinic((await params).slug);
  if (!c) notFound();
  const catalog = await repo().getCatalog(c.id);
  const accent = c.accentColor;
  const book = (serviceId?: string) => `/demo/${c.slug}/book${serviceId ? `?service=${encodeURIComponent(serviceId)}` : ""}`;

  return (
    <>
      <section className="relative overflow-hidden">
        <Photo src={c.heroImage} alt={t(c.name)} emoji={c.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="container-x relative flex min-h-[520px] flex-col justify-end pt-24 pb-12 sm:min-h-[600px]">
          <OpenNowBadge clinic={c} />
          <h1 className="h-display mt-4 text-5xl sm:text-7xl">{c.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/80">{t(c.description)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={book()} className="btn !px-6 !py-3.5 text-base text-ink-950" style={{ background: accent }}>
              <Icon name="calendar" className="h-5 w-5" /> {t("Book an appointment")}
            </Link>
            <Link href={`/demo/${c.slug}/manage`} className="btn-secondary !px-6 !py-3.5 text-base">
              <Icon name="refresh" className="h-5 w-5" /> {t("Move or cancel")}
            </Link>
            <a href={telHref(c.phone)} className="btn-secondary !px-6 !py-3.5 text-base">
              <Icon name="phone" className="h-5 w-5" /> <span dir="ltr">{c.phone}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="container-x -mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon="pin" title={t("Address")}>
          {c.address}, {c.city}
        </InfoCard>
        <InfoCard icon="clock" title={t("Opening hours")}>
          {groupedHours(c, locale).map((h) => (
            <span key={h.label} className="block">
              {h.label}: <span dir="ltr">{h.value}</span>
            </span>
          ))}
        </InfoCard>
        <InfoCard icon="shield" title={c.insurance ? t("Insurance & subsidy") : t("Cancellation")}>
          {c.insurance ? t(c.insurance).split(/(?<=[.؟!])\s/)[0] : t("Free up to {h} h before.", { h: c.booking.cancellationHours })}
        </InfoCard>
        <div className="card flex flex-col justify-between gap-3 p-5" style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${accent} 28%, #0c1816), #0c1816)` }}>
          <p className="text-sm">
            <span className="font-semibold">{t("Ask our AI receptionist")}</span>
            <span className="block text-white/70">{t("Book, move, cancel or ask about prices – 24/7.")}</span>
          </p>
          <div className="flex gap-2">
            <OpenReceptionistButton className="btn flex-1 !py-2 text-xs text-ink-950" style={{ background: accent }}>
              <Icon name="chat" className="h-4 w-4" /> {t("Chat")}
            </OpenReceptionistButton>
            <OpenReceptionistButton voice className="btn-secondary flex-1 !py-2 text-xs">
              <Icon name="mic" className="h-4 w-4" /> {t("Talk")}
            </OpenReceptionistButton>
          </div>
        </div>
      </section>

      <section id="treatments" className="container-x scroll-mt-20 pt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
              {t("Treatments & prices")}
            </p>
            <h2 className="h-display mt-1 text-4xl">{t("Book your treatment")}</h2>
          </div>
          <p className="max-w-sm text-sm text-ink-400">{t("Choose a treatment and a time – or just tell the AI receptionist what you need.")}</p>
        </div>
        <div className="space-y-10">
          {catalog.categories.map((cat) => {
            const list = catalog.services.filter((s) => s.categoryId === cat.id && s.available);
            if (!list.length) return null;
            return (
              <div key={cat.id}>
                <h3 className="mb-3 text-sm font-semibold text-ink-300">
                  {cat.emoji} {t(cat.name)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((s) => (
                    <Link key={s.id} href={book(s.id)} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/20">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-2xl">{s.emoji}</span>
                        {s.popular && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-ink-950 uppercase" style={{ background: accent }}>
                            {t("Popular")}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-semibold">{t(s.name)}</p>
                      <p className="mt-1 flex-1 text-sm text-ink-400">{t(s.description)}</p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-ink-400">
                          <Icon name="clock" className="me-1 inline h-4 w-4" />
                          {duration(s.durationMinutes, locale)}
                        </span>
                        <span className="font-semibold">{priceLabel(s, locale)}</span>
                      </div>
                      <span className="mt-3 text-xs font-semibold opacity-0 transition group-hover:opacity-100" style={{ color: accent }}>
                        {t("Book now")} →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="team" className="container-x scroll-mt-20 pt-16">
        <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: accent }}>
          {t("Team")}
        </p>
        <h2 className="h-display mt-1 text-4xl">{t("Meet the team")}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.practitioners.map((p) => (
            <div key={p.id} className="card flex items-start gap-4 p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-ink-950" style={{ background: p.color }}>
                {initials(p.name.replace(/^Dr\.\s+/, ""))}
              </span>
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-ink-400">{t(p.title)}</p>
                <p className="mt-2 text-sm text-ink-300">{t(p.bio)}</p>
                <Link href={`/demo/${c.slug}/book?practitioner=${p.id}`} className="mt-2 inline-block text-xs font-semibold" style={{ color: accent }}>
                  {t("Book with {name}", { name: p.name.startsWith("Dr.") ? p.name : p.name.split(" ")[0] })} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {c.faq.length > 0 && (
        <section className="container-x pt-16">
          <h2 className="h-display text-3xl">{t("Good to know")}</h2>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {c.faq.map((f) => (
              <details key={f.question} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold">
                  {t(f.question)} <span className="float-end text-ink-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-ink-300">{t(f.answer)}</p>
              </details>
            ))}
            <div className="card p-5">
              <p className="font-semibold">{t("Cancellation policy")}</p>
              <p className="mt-3 text-sm text-ink-300">{t(c.booking.rules)}</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function InfoCard({ icon, title, children }: { icon: "pin" | "clock" | "shield"; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name={icon} className="h-4 w-4 text-ink-400" /> {title}
      </p>
      <p className="mt-2 text-sm text-ink-300">{children}</p>
    </div>
  );
}
