import Link from "next/link";
import { getDemoPhone, getDefaultClinic, listClinics, repo } from "@/lib/server/repository";
import { IMAGES } from "@/lib/demo/images";
import { CLINIC_TYPES, OFFERINGS, type Offering, type OfferingKey } from "@/lib/demo/catalog";
import { Pricing } from "@/components/landing/Pricing";
import { telHref, isPlaceholderPhone } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HeroWidget } from "@/components/landing/HeroWidget";
import { ConversationDemo } from "@/components/landing/ConversationDemo";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import {
  BackendPreview,
  BookingVisual,
  BrowserFrame,
  ChannelFlow,
  ClinicSitePreview,
  LiveNotifications,
  PricesVisual,
  RebookingVisual,
  ReviewsVisual,
  VoiceWidgetVisual,
  WebsitesVisual,
} from "@/components/landing/Visuals";
import { AIbookingWidget } from "@/components/widget/AIbookingWidget";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const CALL_TYPES: { emoji: string; title: string; text: string; example: string }[] = [
  { emoji: "📅", title: "New bookings", text: "Finds a free time with the right practitioner and books it.", example: "“Do you have time for a massage tomorrow?”" },
  { emoji: "🔄", title: "Rebookings", text: "Finds the booking, offers new times and moves it.", example: "“Can I move my Thursday appointment?”" },
  { emoji: "✕", title: "Cancellations", text: "Cancels, explains your policy – and offers to move instead.", example: "“I'm ill and can't come tomorrow.”" },
  { emoji: "🏷️", title: "Prices & insurance", text: "Answers from your own price list, FAQ and insurance info.", example: "“How much is it – and is it covered?”" },
];

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "phone", title: "No more missed calls", text: "Every call is answered – also mid-treatment, at lunch and after closing." },
  { icon: "calendar", title: "Fuller calendar", text: "Cancelled slots are rebooked instead of left empty." },
  { icon: "heart", title: "Focus on the client", text: "No phone ringing while you're with someone on the table or in the chair." },
  { icon: "clock", title: "24/7 booking", text: "Clients book, move and cancel when it suits them – even at 22:00." },
  { icon: "shield", title: "Your rules", text: "Durations, buffers, new-client approval and cancellation fees are always respected." },
];

const INTEGRATIONS: { emoji: string; title: string; text: string; tag?: string }[] = [
  { emoji: "🗓️", title: "AIbooking Calendar", text: "Our built-in calendar with practitioners and change log.", tag: "Built in" },
  { emoji: "📆", title: "Cal.com / Google / Outlook", text: "Mirror bookings to the calendars you already use." },
  { emoji: "🏥", title: "Practice & journal systems", text: "Send appointments to your practice system via signed webhooks." },
  { emoji: "💬", title: "SMS confirmations", text: "Text confirmations when booked, moved or cancelled." },
  { emoji: "🧩", title: "Custom API", text: "Your own system? Connect via our REST API." },
];

export default async function HomePage() {
  const { t } = await getT();
  const clinic = await getDefaultClinic();
  const [catalog, demoPhone, clinics] = await Promise.all([repo().getCatalog(clinic.id), getDemoPhone(), listClinics()]);
  const phoneIsReal = !isPlaceholderPhone(demoPhone);
  const offering = (k: OfferingKey) => OFFERINGS.find((o) => o.key === k)!;
  const slug = clinic.slug;

  return (
    <>
      {/* ============================================ HERO: example clinic website */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32">
        <div className="absolute inset-0 -z-10">
          <Photo src={IMAGES.spaCalm} alt="" emoji="" className="h-full w-full opacity-20" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/90 to-ink-950" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="container-x">
          <div className="mx-auto max-w-4xl animate-fade-up text-center">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-400" /> {t("For massage, hair, chiro, physio, dental, skin & foot clinics")}
            </span>
            <h1 className="h-display mt-6 text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-7xl">
              {t("Your clinic answers")} <span className="bg-gradient-to-r from-sage-200 via-sage-400 to-sand-400 bg-clip-text text-transparent italic">{t("every call")}</span> {t("– even when you're with a client")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
              {t("AIbooking is the AI receptionist on your phone line and your website. It books, rebooks and cancels appointments, explains prices and insurance – straight into your calendar.")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#demo" className="btn-primary !px-6 !py-3.5 text-base">
                {t("Try the AI receptionist")} <Icon name="arrow" className="h-4 w-4" />
              </a>
              <a href="#phone" className="btn-secondary !px-6 !py-3.5 text-base">
                <Icon name="phone" className="h-4 w-4" /> {t("Hear a phone call")}
              </a>
            </div>
          </div>

          {/* Example clinic with live AI receptionist */}
          <div id="demo" className="relative mt-14 scroll-mt-24 animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-8 -z-10 animate-breathe rounded-[48px] bg-sage-500/10 blur-3xl" />
            <p className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ink-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {t("Example: {name}'s website with AIbooking – try the receptionist on the right", { name: clinic.name })}
            </p>
            <BrowserFrame url="calmhands.dk">
              <div className="grid lg:grid-cols-[1.25fr_1fr]">
                <div className="relative border-b border-white/8 lg:border-r lg:border-b-0">
                  <ClinicSitePreview clinic={clinic} catalog={catalog} />
                  <div className="absolute bottom-4 left-4 hidden xl:block">
                    <LiveNotifications />
                  </div>
                </div>
                <div className="bg-ink-950 p-3 sm:p-4">
                  <HeroWidget clinic={clinic} catalog={catalog} />
                </div>
              </div>
            </BrowserFrame>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link href={`/demo/${slug}`} className="btn-secondary !py-2.5">
                {t("Open the full clinic website")}
              </Link>
              <Link href="/admin/appointments" className="btn-ghost !py-2.5">
                {t("See bookings land in the calendar →")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ Solutions strip */}
      <section className="border-y border-white/8 bg-ink-900/50">
        <div className="container-x scrollbar-none flex gap-3 overflow-x-auto py-5">
          {OFFERINGS.map((o) => (
            <a key={o.key} href={`#${o.key}`} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-ink-950 px-4 py-2 text-sm text-ink-300 transition hover:border-sage-500/50 hover:text-white">
              <span>{o.emoji}</span> {t(o.title)}
            </a>
          ))}
        </div>
      </section>

      {/* ============================================ The calls clinics get */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead
            t={t}
          eyebrow="Inbound calls & voice"
          title="The four calls every clinic gets – handled by AI"
          text="Most clinic calls are about the same four things. The AI receptionist handles all of them on the phone and in the voice widget – with your calendar, your prices and your rules."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CALL_TYPES.map((c) => (
            <div key={c.title} className="card p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-500/15 text-2xl">{c.emoji}</span>
              <h3 className="mt-5 text-lg font-semibold">{t(c.title)}</h3>
              <p className="mt-1.5 text-sm text-ink-400">{t(c.text)}</p>
              <OpenReceptionistButton message={t(c.example).replace(/[“”«»„]/g, "")} className="mt-4 w-full rounded-2xl bg-ink-850 px-3 py-2.5 text-start text-sm text-white/85 transition hover:bg-ink-800">
                {t(c.example)} <span className="text-sage-400">→</span>
              </OpenReceptionistButton>
            </div>
          ))}
        </div>
        <div className="mt-20">
          <ChannelFlow />
        </div>
      </section>

      {/* ============================================ SOLUTIONS */}
      <section id="solutions" className="border-t border-white/8 bg-gradient-to-b from-ink-900/60 to-ink-950 pt-20 sm:pt-28">
        <SectionHead t={t} eyebrow="Solutions" title="What we offer your clinic" text="Start with the AI on your phone, add the voice widget to your website – or get a complete clinic website with booking. Everything works together." />
      </section>

      <Feature t={t} o={offering("phone")} index={1} visual={<ConversationDemo />}>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-ink-900 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-sage-500/15 text-sage-300">
            <Icon name="phone" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-ink-400">{t("Call the demo line")}</p>
            <p className="font-display text-xl font-semibold tracking-wide">{demoPhone}</p>
          </div>
          {phoneIsReal ? (
            <a href={telHref(demoPhone)} className="btn-primary !py-2.5">
              {t("Call now")}
            </a>
          ) : (
            <OpenReceptionistButton voice className="btn-primary !py-2.5">
              {t("Try it in the browser")}
            </OpenReceptionistButton>
          )}
        </div>
      </Feature>

      <Feature t={t} o={offering("voice-widget")} index={2} flip visual={<VoiceWidgetVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <OpenReceptionistButton voice className="btn-primary">
            <Icon name="mic" className="h-4 w-4" /> {t("Try the voice widget")}
          </OpenReceptionistButton>
          <Link href="/admin/ai-receptionist" className="btn-secondary">
            {t("See the setup")}
          </Link>
        </div>
      </Feature>

      <Feature t={t} o={offering("booking")} index={3} visual={<BookingVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/demo/${slug}/book`} className="btn-primary">
            {t("Book a test appointment")}
          </Link>
          <Link href="/admin/appointments" className="btn-secondary">
            {t("Open the calendar")}
          </Link>
        </div>
      </Feature>

      <Feature t={t} o={offering("rebooking")} index={4} flip visual={<RebookingVisual />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <OpenReceptionistButton message={t("I need to move my appointment")} className="btn-primary">
            <Icon name="refresh" className="h-4 w-4" /> {t("Move a booking with AI")}
          </OpenReceptionistButton>
          <Link href={`/demo/${slug}/manage`} className="btn-secondary">
            {t("Self-service page")}
          </Link>
        </div>
      </Feature>

      <Feature t={t} o={offering("prices")} index={5} visual={<PricesVisual catalog={catalog} />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <OpenReceptionistButton message={t("How much is a deep tissue massage?")} className="btn-primary">
            {t("Ask about a price")}
          </OpenReceptionistButton>
          <OpenReceptionistButton message={t("Does my insurance cover massage?")} className="btn-secondary">
            {t("Ask about insurance")}
          </OpenReceptionistButton>
        </div>
      </Feature>

      <Feature t={t} o={offering("reviews")} index={6} flip visual={<ReviewsVisual slug={slug} name={clinic.name} />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/qr-nfc" className="btn-primary">
            {t("QR & NFC in the backend")}
          </Link>
          <Link href={`/r/${slug}`} className="btn-secondary">
            {t("Test the review link")}
          </Link>
        </div>
      </Feature>

      <Feature t={t} o={offering("website")} index={7} visual={<WebsitesVisual clinics={clinics} />}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary">
            {t("See examples")}
          </Link>
          <Link href="/contact" className="btn-secondary">
            {t("Get a website")}
          </Link>
        </div>
      </Feature>

      {/* ============================================ BACKEND */}
      <section className="container-x py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow">{t("Backend")}</span>
            <h2 className="h-display mt-5 text-4xl sm:text-5xl">{t("Every call and every booking in one calm overview")}</h2>
            <p className="mt-4 text-lg text-ink-300">{t("See calls live, read what the AI agreed with the client, and manage appointments, practitioners, prices and integrations – per clinic.")}</p>
            <ul className="mt-6 grid gap-2 text-sm text-ink-300">
              {["📞 Call log with transcript and outcome", "📅 Day calendar per practitioner", "🔄 Change log for every rebooking", "🏷️ Services, durations & prices", "✨ The AI receptionist's knowledge and rules"].map((x) => (
                <li key={x} className="rounded-2xl border border-white/8 bg-ink-900 px-4 py-3">
                  {t(x)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin" className="btn-primary">
                {t("Open the backend demo")}
              </Link>
              <Link href="/admin/calls" className="btn-secondary">
                {t("See calls")}
              </Link>
            </div>
          </div>
          <BackendPreview />
        </div>
      </section>

      {/* ============================================ PRICING */}
      <section id="pricing" className="scroll-mt-20 border-y border-white/8 bg-ink-900/40 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead t={t} eyebrow="Pricing" title="Simple pricing for clinics of every size" text="A clinic website and the platform – then add AI minutes for the phone and voice widget when you're ready." />
          <div className="mt-12">
            <Pricing />
          </div>
          <p className="mt-8 text-center text-sm text-ink-400">
            {t("Questions about pricing or a package for several locations?")}{" "}
            <Link href="/contact" className="font-semibold text-sage-300 hover:text-sage-400">
              {t("Book a free demo →")}
            </Link>
          </p>
        </div>
      </section>

      {/* ============================================ CLINIC TYPES */}
      <section id="clinics" className="container-x scroll-mt-20 py-20 sm:py-28">
        <SectionHead t={t} eyebrow="Clinic types" title="One receptionist – seven kinds of clinics" text="See how the AI receptionist handles the calls that are typical for your kind of clinic." />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {CLINIC_TYPES.map((v) => (
            <Link key={v.slug} href={`/clinics/${v.slug}`} className="group relative overflow-hidden rounded-3xl border border-white/8">
              <Photo src={v.image} alt={t(v.name)} emoji={v.emoji} className="h-48 transition duration-500 group-hover:scale-105 sm:h-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-semibold">
                  {v.emoji} {t(v.name)}
                </p>
                <p className="mt-1 text-[11px] text-white/70">{t(v.pain)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================ BRAND */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <SectionHead
            t={t}
            align="left"
            eyebrow="Your clinic in the centre"
            title="Your clinic. Your brand. Your calendar."
            text="AIbooking doesn't force your clients into a marketplace or someone else's app. It sits quietly in the background as the receptionist – with your name, your voice and your rules."
          />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["Your own website", "Your own design", "Your treatments & prices", "Your own team", "Your own calendar", "Your cancellation policy", "Your own phone number", "Your own integrations"].map((x) => (
              <li key={x} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
                <Icon name="check" className="h-4 w-4 text-sage-400" /> {t(x)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================ INTEGRATIONS + API */}
      <section id="integrations" className="container-x scroll-mt-20 py-20 sm:py-28">
        <SectionHead t={t} eyebrow="Integrations" title="Works with the system you already have" text="You don't have to switch booking or journal system to use AIbooking." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {INTEGRATIONS.map((i) => (
            <div key={i.title} className="card relative p-6">
              {i.tag && <span className="absolute top-4 end-4 rounded-full bg-sage-500/15 px-2 py-0.5 text-[10px] font-bold text-sage-300 uppercase">{t(i.tag)}</span>}
              <span className="text-3xl">{i.emoji}</span>
              <h3 className="mt-4 font-semibold">{t(i.title)}</h3>
              <p className="mt-1 text-sm text-ink-400">{t(i.text)}</p>
            </div>
          ))}
        </div>
        <div id="api" className="mt-10 grid scroll-mt-24 gap-6 rounded-[28px] border border-white/8 bg-ink-900/60 p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-sage-300">{t("API-first")}</p>
            <p className="h-display mt-2 text-2xl">{t("Availability, bookings and rebookings via one REST API")}</p>
            <p className="mt-2 text-sm text-ink-400">{t("Phone AI, voice widget, chat, website and your practice system all use the same endpoints – with signed webhooks for every event.")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
            {[
              ["GET", "/api/availability"],
              ["POST", "/api/appointments"],
              ["GET", "/api/appointments/lookup"],
              ["PATCH", "/api/appointments/:id"],
              ["GET", "/api/clinics/:id/services"],
              ["POST", "/api/calls"],
              ["POST", "/api/webhooks"],
              ["GET", "/api/appointments"],
            ].map(([m, p]) => (
              <li key={m + p} className="flex items-center gap-3 rounded-xl bg-ink-950 px-3 py-2 ring-1 ring-white/8">
                <span className={`w-12 font-bold ${m === "GET" ? "text-sky-300" : m === "POST" ? "text-emerald-300" : "text-amber-300"}`}>{m}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================ BENEFITS */}
      <section className="bg-gradient-to-b from-ink-950 via-ink-900/60 to-ink-950 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead t={t} eyebrow="Benefits" title="Less time on the phone. More time with clients." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage-500/15 text-sage-300">
                  <Icon name={b.icon} />
                </span>
                <h3 className="mt-5 font-semibold">{t(b.title)}</h3>
                <p className="mt-1.5 text-sm text-ink-400">{t(b.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ CTA */}
      <section className="container-x pb-24">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-sage-300 via-sage-500 to-sage-700 p-10 text-center text-ink-950 sm:p-16">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/10 blur-2xl" />
          <h2 className="h-display relative mx-auto max-w-3xl text-4xl sm:text-5xl">{t("See what AIbooking can do for your clinic")}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-ink-950/80">{t("Try the AI receptionist right here – or book a demo and we'll set it up with your treatments, prices and team.")}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#demo" className="btn bg-ink-950 !px-7 !py-3.5 text-base text-white hover:bg-ink-800">
              {t("Try it free")}
            </a>
            <Link href="/contact" className="btn border border-ink-950/30 !px-7 !py-3.5 text-base text-ink-950 hover:bg-white/20">
              {t("Book a demo")}
            </Link>
          </div>
        </div>
      </section>

      <AIbookingWidget clinic={clinic} catalog={catalog} />
    </>
  );
}

function SectionHead({ t, eyebrow, title, text, align = "center" }: { t: TFunction; eyebrow: string; title: string; text?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "container-x mx-auto max-w-3xl text-center" : "max-w-xl"}>
      <span className="eyebrow">{t(eyebrow)}</span>
      <h2 className="h-display mt-5 text-4xl sm:text-5xl">{t(title)}</h2>
      {text && <p className="mt-4 text-lg text-ink-300">{t(text)}</p>}
    </div>
  );
}

/** One solution: text + visual illustration, alternating left/right. */
function Feature({ t, o, index, flip, visual, children }: { t: TFunction; o: Offering; index: number; flip?: boolean; visual: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section id={o.key} className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div className={flip ? "lg:order-2" : ""}>
          <p className="flex items-center gap-3 text-sm font-semibold text-sage-300">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-500/15 text-xs">{String(index).padStart(2, "0")}</span>
            {t(o.short)}
          </p>
          <h2 className="h-display mt-4 text-4xl sm:text-5xl">
            {o.emoji} {t(o.title)}
          </h2>
          {o.price && (
            <a href="#pricing" className="mt-4 inline-flex items-center gap-2 rounded-full border border-sage-500/30 bg-sage-500/10 px-3.5 py-1.5 text-sm font-semibold text-sage-300">
              {t(o.price)}
            </a>
          )}
          <p className="mt-4 text-lg text-ink-300">{t(o.text)}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {o.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-ink-300">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage-400" /> {t(b)}
              </li>
            ))}
          </ul>
          {children}
        </div>
        <div className={flip ? "lg:order-1" : ""}>{visual}</div>
      </div>
    </section>
  );
}
