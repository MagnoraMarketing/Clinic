import { IMAGES } from "./images";

// Sales catalogue: what AIbooking offers clinics (solutions) and which kinds of
// clinics we typically help (clinic types). Used by the header menu, the home
// page, the clinic-type pages and the contact form.

export type OfferingKey = "phone" | "voice-widget" | "booking" | "rebooking" | "prices" | "reviews" | "website";

export interface Offering {
  key: OfferingKey;
  emoji: string;
  title: string;
  short: string;
  text: string;
  bullets: string[];
  price?: string;
}

export const OFFERINGS: Offering[] = [
  {
    key: "phone",
    emoji: "📞",
    title: "Inbound AI receptionist",
    short: "AI answers every call",
    text: "Your phone rings while you're with a client. The AI answers on your own number, books the appointment, moves or cancels existing ones, explains prices and insurance – and transfers to staff when needed.",
    bullets: ["Answers several calls at once", "Books straight into your calendar", "Rebookings & cancellations", "Transfers urgent calls to staff"],
    price: "from €134 / 150 min",
  },
  {
    key: "voice-widget",
    emoji: "🎙️",
    title: "AI voice widget",
    short: "Talk to the clinic on the website",
    text: "A small button on your website where clients can speak or type with the AI receptionist – book, rebook, cancel or ask about prices without calling.",
    bullets: ["Voice + chat in one widget", "Your colours and logo", "One line of code on any website", "Works on mobile, 24/7"],
    price: "from €134 / 150 min",
  },
  {
    key: "booking",
    emoji: "📅",
    title: "Online booking & calendar",
    short: "Real-time availability per practitioner",
    text: "Clients choose treatment, practitioner and time. The calendar respects durations, buffers between clients, working days and your own booking rules – whether the booking comes from the phone, the widget or the website.",
    bullets: ["Treatment durations & buffers", "Per-practitioner calendars", "New-client approval", "Sync to your existing system"],
  },
  {
    key: "rebooking",
    emoji: "🔄",
    title: "Rebookings & cancellations",
    short: "Moves and cancellations without the phone tag",
    text: "“Can I move my Thursday appointment?” is one of the most common calls a clinic gets. The AI finds the booking, offers new times and moves it – or cancels it and tells the client about your cancellation policy.",
    bullets: ["Finds the booking by reference + phone", "Offers the next free times", "Explains cancellation fees", "Full change log in the backend"],
  },
  {
    key: "prices",
    emoji: "🏷️",
    title: "Prices, insurance & questions",
    short: "Correct answers from your own price list",
    text: "“How much is a 60-minute massage?” “Do I need a referral?” “Does my insurance cover it?” The AI answers from your own price list, FAQ and insurance info – and offers to book straight away.",
    bullets: ["Prices and durations per treatment", "Insurance & referral answers", "Opening hours, address, parking", "Your own FAQ"],
  },
  {
    key: "reviews",
    emoji: "⭐",
    title: "QR codes & NFC review chips",
    short: "Booking QR at reception, reviews with a tap",
    text: "A QR code at reception, on your mirror or on flyers opens your booking page. The NFC chip on the counter sends happy clients to your Google reviews with one tap – and you manage the link yourself in your login.",
    bullets: ["QR code ready to print", "Opens booking with one scan", "NFC chip for Google reviews", "Change the link anytime"],
    price: "QR €30 · NFC €30 each",
  },
  {
    key: "website",
    emoji: "🌐",
    title: "Clinic websites",
    short: "Fast, calm, mobile-friendly",
    text: "No website – or an old one? We deliver a simple, mobile-friendly clinic website with treatments, prices, team, booking and the AI receptionist built in.",
    bullets: ["Your design and domain", "Treatments, prices & team", "Booking built in", "Ready in a few days"],
    price: "from €200 + add-ons",
  },
];

export type CallLine = { who: "Caller" | "AI"; text: string };

export interface ClinicTypeInfo {
  slug: string;
  emoji: string;
  name: string;
  plural: string;
  image: string;
  headline: string;
  intro: string;
  /** Pain point in one sentence – shown on the card. */
  pain: string;
  aiCan: string[];
  questions: string[];
  call: CallLine[];
  callTitle: string;
  demoSlug: string;
}

export const CLINIC_TYPES: ClinicTypeInfo[] = [
  {
    slug: "massage",
    emoji: "💆",
    name: "Massage clinic",
    plural: "massage clinics",
    image: IMAGES.massage,
    headline: "Your hands are busy – the AI takes the phone",
    intro: "You can't answer the phone mid-massage. The AI receptionist books, rebooks and answers price questions while you focus on the client on the table.",
    pain: "Missed calls during treatments",
    aiCan: ["Book the right massage and length", "Match clients with the right therapist", "Move and cancel appointments", "Explain prices and insurance cover", "Sell gift cards and answer FAQs"],
    questions: ["How much is a 60 minute deep tissue massage?", "Do you have time tomorrow afternoon?", "Can I get a pregnancy massage?", "Does my insurance cover massage?"],
    callTitle: "Inbound call · Calm Hands Massage",
    call: [
      { who: "Caller", text: "Hi, do you have time for a deep tissue massage tomorrow afternoon?" },
      { who: "AI", text: "Yes! Sofie is free at 14:00 or 16:30 for a 60-minute deep tissue massage – that's DKK 695. Which suits you?" },
      { who: "Caller", text: "Half past four, please." },
      { who: "AI", text: "Done – you're booked with Sofie tomorrow at 16:30. You'll get a text confirmation with your reference." },
    ],
    demoSlug: "calm-hands",
  },
  {
    slug: "hair-salon",
    emoji: "✂️",
    name: "Hair salon",
    plural: "hair salons",
    image: IMAGES.hairSalon,
    headline: "Scissors in one hand, phone in the other? Not anymore",
    intro: "Stylists shouldn't stop mid-cut to answer the phone. The AI books cuts and colour with the right stylist and the right amount of time – and handles all the “can I move my appointment?” calls.",
    pain: "Stylists interrupted mid-cut",
    aiCan: ["Book cut, colour & balayage with the right duration", "Pick the right stylist per service", "Rebook and cancel", "Give from-prices for colour", "Remind about patch tests"],
    questions: ["How much is a men's cut?", "Can I move my appointment to Saturday?", "How long does balayage take?", "Is Emma free on Friday?"],
    callTitle: "Inbound call · Studio Nord Hair",
    call: [
      { who: "Caller", text: "Hi, I'd like to move my haircut on Thursday to Saturday morning." },
      { who: "AI", text: "No problem. What's your booking reference or phone number?" },
      { who: "Caller", text: "It's 22 33 44 55." },
      { who: "AI", text: "Found it – women's cut with Ida on Thursday at 11:00. Ida is free Saturday at 10:00 or 11:15. Which one?" },
      { who: "Caller", text: "Ten is perfect." },
      { who: "AI", text: "Moved ✓ You're now booked Saturday at 10:00 with Ida." },
    ],
    demoSlug: "studio-nord",
  },
  {
    slug: "chiropractor",
    emoji: "🦴",
    name: "Chiropractor",
    plural: "chiropractors",
    image: IMAGES.chiro,
    headline: "Acute back pain doesn't wait – neither does the AI",
    intro: "Patients in pain call early in the morning and want an answer now. The AI finds today's acute slots, books first consultations and explains subsidies – before the clinic has even opened.",
    pain: "Acute patients calling before opening",
    aiCan: ["Find same-day acute appointments", "Book first consultations for new patients", "Explain public subsidy & insurance", "Rebook follow-up treatments", "Answer “do I need a referral?”"],
    questions: ["I've locked my back – can I come today?", "Do I need a referral?", "What does a first consultation cost?", "Can you treat babies?"],
    callTitle: "Inbound call · Align Chiropractic",
    call: [
      { who: "Caller", text: "Hi, I've locked my back this morning. Can I come in today?" },
      { who: "AI", text: "I'm sorry to hear that. Have you been to us before?" },
      { who: "Caller", text: "No, it's my first time." },
      { who: "AI", text: "Then I'll book a first consultation – Dr. Mikkelsen can see you today at 11:10. It's DKK 695 and the public subsidy is deducted. Shall I book it?" },
    ],
    demoSlug: "align-chiro",
  },
  {
    slug: "physiotherapy",
    emoji: "🏃",
    name: "Physiotherapy",
    plural: "physiotherapy clinics",
    image: IMAGES.physio,
    headline: "More time for rehab – less time on the phone",
    intro: "Referrals, insurance questions and weekly follow-ups create a constant stream of calls. The AI handles bookings and explains what the patient needs to bring.",
    pain: "Endless follow-up scheduling",
    aiCan: ["Book initial assessments & follow-ups", "Explain referrals & subsidies", "Handle insurance questions", "Match specialist to injury", "Rebook weekly sessions"],
    questions: ["Do I need a referral from my doctor?", "Does Tryg cover physio?", "Can I move my Thursday session?", "What should I wear?"],
    callTitle: "Inbound call · MoveWell Physio",
    call: [
      { who: "Caller", text: "Hi, my insurance is with Tryg. Can I book physio for my knee?" },
      { who: "AI", text: "Yes, we invoice Tryg directly. As a new patient you start with an initial assessment – Mads, our sports physio, is free Monday at 08:00. Shall I book it?" },
      { who: "Caller", text: "Yes please." },
      { who: "AI", text: "Booked ✓ Please bring your claim number from Tryg." },
    ],
    demoSlug: "movewell-physio",
  },
  {
    slug: "dental",
    emoji: "🦷",
    name: "Dental clinic",
    plural: "dental clinics",
    image: IMAGES.dental,
    headline: "Toothache at 7:45? The AI already found a slot",
    intro: "Mornings are chaos: emergency calls, check-up rebookings and new patients – all while the first patient is in the chair. The AI takes every call and books with the right dentist or hygienist.",
    pain: "Morning phone rush",
    aiCan: ["Emergency appointments same day", "Check-ups & hygienist bookings", "New patient registration (confirmed by clinic)", "Move and cancel appointments", "Calm, patient answers for anxious patients"],
    questions: ["I have a toothache – can I come today?", "How much is a check-up?", "I'm nervous about the dentist", "Can I move my cleaning?"],
    callTitle: "Inbound call · Smile Dental Clinic",
    call: [
      { who: "Caller", text: "Hi, I've got a really bad toothache. Can I come in today?" },
      { who: "AI", text: "I'm sorry – let's get you seen. I have an emergency appointment today at 13:30 with Dr. Juhl. It's DKK 450. Shall I book it?" },
      { who: "Caller", text: "Yes, please." },
      { who: "AI", text: "You're booked ✓ Take a painkiller if you need one, and see you at 13:30." },
    ],
    demoSlug: "smile-dental",
  },
  {
    slug: "beauty-skin",
    emoji: "🌸",
    name: "Beauty & skin clinic",
    plural: "beauty & skin clinics",
    image: IMAGES.skin,
    headline: "Book facials and lashes while you're with a client",
    intro: "Clients ask about prices, downtime and which treatment suits their skin – often in the evening. The AI answers, recommends a free consultation and books straight into your calendar.",
    pain: "Evening enquiries lost overnight",
    aiCan: ["Book facials, peels & lashes", "Explain prices and downtime", "Recommend a free consultation", "Rebook and cancel with your policy", "Book 24/7 – also at night"],
    questions: ["How much is a HydraFacial?", "Is there downtime after microneedling?", "Which treatment is best for acne?", "Can I book a lash lift on Saturday?"],
    callTitle: "Voice widget · Glow Skin Clinic",
    call: [
      { who: "Caller", text: "How much is a HydraFacial, and is there any downtime?" },
      { who: "AI", text: "A HydraFacial is DKK 1,495 for 60 minutes – and there's no downtime, you can go straight back to work. Would you like to book one?" },
      { who: "Caller", text: "Yes, Friday after work." },
      { who: "AI", text: "Camilla is free Friday at 17:00. Shall I book it for you?" },
    ],
    demoSlug: "glow-skin",
  },
  {
    slug: "podiatry",
    emoji: "🦶",
    name: "Podiatry",
    plural: "podiatry clinics",
    image: IMAGES.feet,
    headline: "Regular clients, regular calls – now automated",
    intro: "Most foot care clients come back every 6–8 weeks, and many prefer calling to booking online. The AI takes those calls, books the next treatment and handles subsidies for diabetic patients.",
    pain: "Older clients prefer to call",
    aiCan: ["Book regular foot treatments", "Diabetic foot care with referral info", "Ingrown toenail – fast slots", "Clear, patient voice for older callers", "Move and cancel appointments"],
    questions: ["Can you help with an ingrown toenail?", "I have diabetes – is there a subsidy?", "How often should I come?", "Do you have step-free access?"],
    callTitle: "Inbound call · Step Foot Clinic",
    call: [
      { who: "Caller", text: "Hello, I'd like my usual foot treatment. I have diabetes." },
      { who: "AI", text: "Of course. With a referral you get a public subsidy for diabetic foot care. Karin has time on Wednesday at 09:30 – does that suit you?" },
      { who: "Caller", text: "Yes, that's fine." },
      { who: "AI", text: "Lovely – you're booked Wednesday at 09:30 with Karin. Remember your referral." },
    ],
    demoSlug: "step-foot",
  },
];

export const getClinicType = (slug: string) => CLINIC_TYPES.find((v) => v.slug === slug);

/** Prices (EUR). One source – used on the home page, clinic-type pages and the contact form. */
export interface PriceItem {
  key: string;
  emoji: string;
  name: string;
  price: number;
  unit?: string;
  /** Show as "from" price */
  from?: boolean;
  text: string;
  highlight?: boolean;
}

/** Monthly platform subscription and the partner's share of sales + subscription. */
export const PLATFORM_MONTHLY = 50;
export const PARTNER_SHARE = 0.5;

export const PRICES: { base: PriceItem[]; platform: PriceItem[]; addons: PriceItem[]; ai: PriceItem[] } = {
  base: [
    {
      key: "website",
      emoji: "🌐",
      name: "Clinic website with price list & booking",
      price: 200,
      from: true,
      text: "Mobile-friendly clinic website in your design with treatments, prices, team, opening hours and online booking – plus add-ons as you need them.",
    },
  ],
  platform: [
    {
      key: "platform",
      emoji: "🧩",
      name: "AIbooking platform",
      price: PLATFORM_MONTHLY,
      unit: "month",
      text: "Login, appointment calendar, practitioners, rebooking log, call log, QR/NFC management, AI setup, updates and support.",
    },
  ],
  addons: [
    { key: "import", emoji: "📥", name: "Import of your price list & services", price: 100, text: "We transfer your current treatments, durations, prices and team." },
    { key: "integration", emoji: "🔌", name: "Calendar / practice system integration", price: 150, from: true, text: "Connect your existing booking or journal system (Cal.com, Google Calendar or via API)." },
    { key: "qr", emoji: "🔳", name: "QR code for print", price: 30, unit: "piece", text: "Opens your booking page – for reception, mirrors, business cards and flyers." },
    { key: "nfc", emoji: "⭐", name: "NFC review chip", price: 30, unit: "piece", text: "Clients tap their phone and land on your Google reviews. You manage the link in your login." },
  ],
  ai: [
    { key: "ai-150", emoji: "📞", name: "AI minutes · Starter", price: 134, unit: "150 min", text: "Phone + voice widget. About 60–80 calls – perfect for a solo practitioner." },
    { key: "ai-400", emoji: "🎙️", name: "AI minutes · Clinic", price: 329, unit: "400 min", text: "About 160–200 calls. For clinics with 2–5 practitioners.", highlight: true },
    { key: "ai-1000", emoji: "🏥", name: "AI minutes · Busy clinic", price: 749, unit: "1,000 min", text: "About 400–500 calls. For larger or multi-location clinics." },
  ],
};

export const eur = (n: number) => `€${new Intl.NumberFormat("en-GB").format(n)}`;
