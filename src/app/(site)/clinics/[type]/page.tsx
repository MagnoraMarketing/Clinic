import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLINIC_TYPES, OFFERINGS, getClinicType } from "@/lib/demo/catalog";
import { getClinic, repo } from "@/lib/server/repository";
import { dkk, duration, priceLabel } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Icon } from "@/components/ui/Icon";
import { ConversationDemo } from "@/components/landing/ConversationDemo";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import { TeamAvatars } from "@/components/landing/Visuals";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/clinics/[type]">): Promise<Metadata> {
  const v = getClinicType((await params).type);
  const { t } = await getT();
  return v ? { title: t("AI receptionist for {plural}", { plural: t(v.plural) }), description: t(v.intro) } : {};
}

export default async function ClinicTypePage({ params }: PageProps<"/clinics/[type]">) {
  const { t, locale } = await getT();
  const v = getClinicType((await params).type);
  if (!v) notFound();
  const clinic = await getClinic(v.demoSlug);
  if (!clinic) notFound();
  const catalog = await repo().getCatalog(clinic.id);
  const others = CLINIC_TYPES.filter((x) => x.slug !== v.slug);
  const lastAi = [...v.call].reverse().find((l) => l.who === "AI");
  const b = clinic.booking;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Photo src={v.image} alt={t(v.name)} emoji={v.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="container-x relative flex min-h-[640px] flex-col justify-center pt-28 pb-16">
          <Link href="/#clinics" className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-ink-300 hover:text-white">
            <Icon name="back" className="h-4 w-4" /> {t("All clinic types")}
          </Link>
          <span className="eyebrow w-fit">
            {v.emoji} {t("AI receptionist for {plural}", { plural: t(v.plural) })}
          </span>
          <h1 className="h-display mt-5 max-w-3xl text-4xl sm:text-6xl">{t(v.headline)}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">{t(v.intro)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <OpenReceptionistButton voice className="btn-primary !px-6 !py-3.5 text-base">
              <Icon name="mic" className="h-4 w-4" /> {t("Talk to {name}'s AI", { name: clinic.name })}
            </OpenReceptionistButton>
            <Link href={`/demo/${clinic.slug}`} className="btn-secondary !px-6 !py-3.5 text-base">
              See the demo clinic <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {["📞 Inbound calls", "🎙️ Voice widget", "📅 Booking", "🔄 Rebooking", "✕ Cancellation", "🏷️ Prices", ...(clinic.insurance ? ["🛡️ Insurance answers"] : [])].map((f) => (
              <span key={f} className="rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">
                {t(f)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CALL + WHAT THE AI CAN DO */}
      <section className="container-x py-20">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">{t("Inbound calls")}</span>
            <h2 className="h-display mt-5 text-4xl">{t("What a call sounds like")} – {t(v.name)}</h2>
            <p className="mt-4 text-ink-300">{t("The AI receptionist answers your phone and the voice widget with your own knowledge: treatments, durations, prices, team, opening hours, insurance and your booking rules.")}</p>
            <h3 className="mt-10 text-sm font-bold tracking-wider text-ink-400 uppercase">{t("The AI can")}</h3>
            <ul className="mt-3 grid gap-2">
              {v.aiCan.map((a) => (
                <li key={a} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
                  <Icon name="check" className="h-4 w-4 text-sage-400" /> {t(a)}
                </li>
              ))}
            </ul>
            <h3 className="mt-10 text-sm font-bold tracking-wider text-ink-400 uppercase">{t("Try a typical question")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {v.questions.map((q) => (
                <OpenReceptionistButton key={q} message={t(q)} className="chip hover:border-sage-500/50 hover:text-white">
                  “{t(q)}”
                </OpenReceptionistButton>
              ))}
            </div>
          </div>
          <ConversationDemo script={v.call} title={v.callTitle} doneTitle="Handled by AI ✓" doneText={lastAi?.text ?? ""} doneNote="Saved in the calendar and the call log – with the full transcript." />
        </div>
      </section>

      {/* DEMO CLINIC: price list, team, rules */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">{t("Demo clinic")}</span>
              <h2 className="h-display mt-4 text-4xl">
                {clinic.emoji} {clinic.name}
              </h2>
              <p className="mt-2 max-w-2xl text-ink-300">{t("This is the knowledge the AI works with. Change a price in the backend and the AI says the new price on the next call.")}</p>
            </div>
            <Link href="/admin/services" className="btn-secondary">
              {t("Edit in the backend →")}
            </Link>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="card p-6">
              <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{t("Treatments & prices")}</p>
              <ul className="mt-4 divide-y divide-white/5 text-sm">
                {catalog.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="font-medium">
                        {s.emoji} {t(s.name)}
                      </span>
                      <span className="block text-xs text-ink-400">{t(s.description)}</span>
                    </span>
                    <span className="shrink-0 text-ink-400">{duration(s.durationMinutes, locale)}</span>
                    <span className="w-24 shrink-0 text-end font-semibold tabular-nums">{priceLabel(s, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-5">
              <div className="card p-6">
                <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{t("Team")}</p>
                <div className="mt-4">
                  <TeamAvatars catalog={catalog} size="h-12 w-12" />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {catalog.practitioners.map((p) => (
                    <li key={p.id}>
                      <span className="font-semibold">{p.name}</span> <span className="text-ink-400">· {t(p.title)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <p className="text-xs font-bold tracking-wider text-ink-400 uppercase">{t("Booking rules the AI follows")}</p>
                <ul className="mt-4 space-y-2 text-sm text-ink-300">
                  <li>⏱️ {t("Start times every {slot} min · {buffer} min buffer between clients", { slot: b.slotMinutes, buffer: b.bufferMinutes })}</li>
                  <li>🔄 {t("Free rebooking/cancellation up to {h} h before", { h: b.cancellationHours })}{b.lateCancellationFee ? ` · ${t("later: {fee}", { fee: dkk(b.lateCancellationFee, locale) })}` : ""}</li>
                  <li>📆 {t("Bookable {min} h to {max} days ahead", { min: b.minNoticeHours, max: b.maxDaysAhead })}</li>
                  {b.confirmNewClients && <li>🆕 {t("New patients are confirmed by the clinic")}</li>}
                  {clinic.insurance && <li>🛡️ {t(clinic.insurance)}</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTIONS + CTA */}
      <section className="container-x py-20">
        <h2 className="h-display text-center text-4xl">{t("Everything you get")} – {t(v.name)}</h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERINGS.map((o) => (
            <Link key={o.key} href={`/#${o.key}`} className="card flex items-center gap-3 p-4 transition hover:border-sage-500/40">
              <span className="text-2xl">{o.emoji}</span>
              <span>
                <span className="block text-sm font-semibold">{t(o.title)}</span>
                <span className="text-xs text-ink-400">{t(o.short)}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-14 rounded-[36px] bg-gradient-to-br from-sage-300 to-sage-700 p-10 text-center text-ink-950 sm:p-14">
          <h2 className="h-display text-3xl sm:text-4xl">{t("Ready to give your clinic an AI receptionist?")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-950/80">{t("We set it up with your treatments, prices, team and phone number – and show it to you in a 20-minute demo.")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/contact?type=${v.slug}`} className="btn bg-ink-950 !px-7 !py-3.5 text-white hover:bg-ink-800">
              {t("Book a demo")}
            </Link>
            <Link href={`/demo/${clinic.slug}`} className="btn border border-ink-950/30 !px-7 !py-3.5 text-ink-950 hover:bg-white/20">
              {t("Try the demo clinic")}
            </Link>
          </div>
        </div>
        <div className="mt-14">
          <p className="text-center text-sm text-ink-400">{t("Other clinic types")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/clinics/${o.slug}`} className="chip hover:text-white">
                {o.emoji} {t(o.name)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AIbookingWidget clinic={clinic} catalog={catalog} />
    </>
  );
}
