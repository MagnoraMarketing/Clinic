import type { BookingRules, Catalog, Clinic, ClinicType, FaqEntry, OpeningHours, Practitioner, Service, ServiceCategory, Weekday } from "@/lib/types";
import { IMAGES } from "./images";

// Demo tenants. Every clinic is a separate tenant with its own brand, services,
// prices, team, opening hours, phone number and AI agent – exactly like real
// customers on the platform. Phone numbers are placeholders; the real demo line
// is set via AIBOOKING_DEMO_PHONE (see src/lib/server/repository) or in the database.

const PLACEHOLDER_PHONE = "+45 XX XX XX XX";

const hours = (weekday: [string, string], friday: [string, string] | null, saturday: [string, string] | null, sunday: [string, string] | null = null): OpeningHours[] => {
  const closed = (day: Weekday): OpeningHours => ({ day, open: "00:00", close: "00:00", closed: true });
  const fri = friday ?? weekday;
  return [
    sunday ? { day: 0, open: sunday[0], close: sunday[1] } : closed(0),
    { day: 1, open: weekday[0], close: weekday[1] },
    { day: 2, open: weekday[0], close: weekday[1] },
    { day: 3, open: weekday[0], close: weekday[1] },
    { day: 4, open: weekday[0], close: weekday[1] },
    { day: 5, open: fri[0], close: fri[1] },
    saturday ? { day: 6, open: saturday[0], close: saturday[1] } : closed(6),
  ];
};

const rules = (patch: Partial<BookingRules> & { rules: string }): BookingRules => ({
  enabled: true,
  slotMinutes: 15,
  bufferMinutes: 10,
  minNoticeHours: 2,
  maxDaysAhead: 60,
  cancellationHours: 24,
  lateCancellationFee: 0,
  confirmNewClients: false,
  ...patch,
});

const commonFaq = (extra: FaqEntry[] = []): FaqEntry[] => [
  ...extra,
  {
    question: "How do I pay?",
    answer: "You pay after your appointment by card or MobilePay. We don't take cash.",
    keywords: ["pay", "payment", "mobilepay", "card", "cash"],
  },
  {
    question: "Do you send a reminder?",
    answer: "Yes – you get a text message the day before your appointment with the time and a link to rebook or cancel.",
    keywords: ["reminder", "sms", "text message", "confirmation"],
  },
];

// Small builders so the demo catalogue stays readable
type SvcDef = [cat: string, name: string, minutes: number, price: number, emoji: string, description: string, extra?: Partial<Service>];
function catalog(clinicId: string, cats: [id: string, name: string, emoji: string][], team: Omit<Practitioner, "clinicId" | "active">[], services: SvcDef[]): Catalog {
  const categories: ServiceCategory[] = cats.map(([id, name, emoji], i) => ({ id: `${clinicId}_${id}`, clinicId, name, emoji, sortOrder: i }));
  const practitioners: Practitioner[] = team.map((p) => ({ ...p, clinicId, active: true }));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    categories,
    practitioners,
    services: services.map(([cat, name, minutes, price, emoji, description, extra]) => ({
      id: `${clinicId}_${slug(name)}`,
      clinicId,
      categoryId: `${clinicId}_${cat}`,
      name,
      description,
      durationMinutes: minutes,
      price,
      emoji,
      available: true,
      practitionerIds: [],
      ...extra,
    })),
  };
}
const MON_FRI: Weekday[] = [1, 2, 3, 4, 5];

type Tenant = { clinic: Clinic; catalog: Catalog };

function tenant(c: Omit<Clinic, "widget"> & { welcome: string; theme?: "dark" | "light" }, cat: Catalog): Tenant {
  const { welcome, theme, ...clinic } = c;
  return {
    clinic: {
      ...clinic,
      widget: { clinicId: clinic.id, theme: theme ?? "dark", accentColor: clinic.accentColor, welcomeMessage: welcome, position: "bottom-right", enabled: true },
    },
    catalog: cat,
  };
}

const TENANTS: Tenant[] = [
  // ------------------------------------------------------------------ Massage
  tenant(
    {
      id: "clinic_calm_hands",
      slug: "calm-hands",
      name: "Calm Hands Massage",
      tagline: "Massage & bodywork in the heart of Copenhagen",
      description: "Therapeutic and relaxing massage by certified therapists. Deep tissue, sports, pregnancy and hot stone – book online, by phone or just ask our AI receptionist.",
      type: "massage",
      emoji: "💆",
      accentColor: "#3fcfab",
      heroImage: IMAGES.massage,
      address: "Østerbrogade 64",
      city: "2100 Copenhagen Ø",
      phone: PLACEHOLDER_PHONE,
      email: "hello@calmhands.demo",
      parking: "Street parking (zone 2) on the side streets. Bus 1A and 14 stop right outside.",
      openingHours: hours(["09:00", "20:00"], ["09:00", "18:00"], ["10:00", "16:00"]),
      booking: rules({
        bufferMinutes: 15,
        lateCancellationFee: 300,
        rules: "Free rebooking and cancellation up to 24 hours before your appointment. Later cancellations and no-shows are charged DKK 300. Please arrive 5 minutes early.",
      }),
      paymentMethods: ["card", "mobilepay", "insurance"],
      insurance: "Massage by our certified therapists is covered by 'Sygeforsikringen danmark' (groups 1, 2 and 5) and by many workplace health insurances. Bring your membership card – we give you an invoice you can submit.",
      reviewUrl: "https://www.google.com/search?q=Calm+Hands+Massage+reviews",
      faq: commonFaq([
        {
          question: "What's the difference between classic and deep tissue massage?",
          answer: "Classic massage is relaxing with lighter pressure. Deep tissue works deeper into the muscles and is ideal for tension, stiffness and pain – it can be a bit more intense.",
          keywords: ["difference", "deep tissue", "classic", "pressure", "which massage", "recommend"],
        },
        {
          question: "Can I get a massage when I'm pregnant?",
          answer: "Yes – from week 12 we offer pregnancy massage on a special cushion. Book 'Pregnancy massage' and tell us which week you're in.",
          keywords: ["pregnant", "pregnancy", "expecting"],
        },
        {
          question: "Do you sell gift cards?",
          answer: "Yes, gift cards for any amount or treatment. They're valid for 2 years and can be bought in the clinic or by email.",
          keywords: ["gift", "gift card", "voucher", "present"],
        },
      ]),
      welcome: "Hi 👋 I'm the AI receptionist at Calm Hands Massage. I can book, move or cancel your massage – or answer questions about prices and treatments.",
    },
    catalog(
      "clinic_calm_hands",
      [["massage", "Massage", "💆"], ["special", "Specialised", "🌿"]],
      [
        { id: "ph_calm_sofie", name: "Sofie Lund", title: "Certified massage therapist", bio: "Deep tissue and sports massage. 9 years of experience.", color: "#3fcfab", workDays: [1, 2, 3, 4, 5] },
        { id: "ph_calm_jonas", name: "Jonas Holm", title: "Sports massage therapist", bio: "Former physio assistant for FC Nordsjælland. Loves runners.", color: "#7aa7ff", workDays: [2, 3, 4, 5, 6] },
        { id: "ph_calm_amira", name: "Amira Nasser", title: "Massage & pregnancy specialist", bio: "Pregnancy, lymphatic and hot stone massage.", color: "#f2b880", workDays: [1, 3, 5, 6] },
      ],
      [
        ["massage", "Classic massage 30 min", 30, 395, "💆", "Back, neck and shoulders – perfect for a quick reset.", { aliases: ["30 min massage", "half hour massage", "short massage", "back massage"] }],
        ["massage", "Classic massage 60 min", 60, 645, "💆", "Full-body relaxing massage with medium pressure.", { popular: true, aliases: ["60 min massage", "hour massage", "one hour massage", "full body massage", "relaxing massage", "classic massage"] }],
        ["massage", "Deep tissue massage 60 min", 60, 695, "💪", "Firm pressure for tension, knots and stiffness.", { popular: true, aliases: ["deep tissue", "deep massage", "firm massage"] }],
        ["massage", "Massage 90 min", 90, 945, "🕯️", "Extra time for full body plus focus areas.", { aliases: ["90 min massage", "long massage", "90 minute"] }],
        ["special", "Sports massage 45 min", 45, 525, "🏃", "Recovery and injury prevention for active people.", { aliases: ["sports massage", "sport massage", "runner"], practitionerIds: ["ph_calm_jonas", "ph_calm_sofie"] }],
        ["special", "Hot stone massage 75 min", 75, 845, "🪨", "Warm basalt stones melt away tension.", { aliases: ["hot stone", "stones", "stone massage"], practitionerIds: ["ph_calm_amira"] }],
        ["special", "Pregnancy massage 60 min", 60, 695, "🤰", "Safe, gentle massage from week 12 on a pregnancy cushion.", { aliases: ["pregnancy", "pregnant", "prenatal"], practitionerIds: ["ph_calm_amira"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Hair salon
  tenant(
    {
      id: "clinic_studio_nord",
      slug: "studio-nord",
      name: "Studio Nord Hair",
      tagline: "Hair salon · cuts, colour & styling",
      description: "Scandinavian hair salon with a relaxed vibe. Cuts, colour, balayage and styling for women, men and kids.",
      type: "hair",
      emoji: "✂️",
      accentColor: "#e7a977",
      heroImage: IMAGES.hairSalon,
      address: "Værnedamsvej 9",
      city: "1619 Copenhagen V",
      phone: PLACEHOLDER_PHONE,
      email: "book@studionord.demo",
      parking: "Paid street parking (zone 1). Nearest car park: Frederiksberg Centret, 6 min walk.",
      openingHours: hours(["10:00", "19:00"], ["09:00", "18:00"], ["09:00", "15:00"]),
      booking: rules({
        bufferMinutes: 5,
        lateCancellationFee: 250,
        rules: "Rebook or cancel for free up to 24 hours before. Late cancellations and no-shows are charged DKK 250. Colour prices depend on hair length and are confirmed in the salon.",
      }),
      paymentMethods: ["card", "mobilepay"],
      reviewUrl: "https://www.google.com/search?q=Studio+Nord+Hair+reviews",
      faq: commonFaq([
        {
          question: "How long does colour take?",
          answer: "A full colour takes about 2 hours, highlights or balayage 2.5–3 hours incl. cut and styling. Book the service and we'll reserve the right time.",
          keywords: ["how long", "colour take", "color take", "time"],
        },
        {
          question: "Do I need a patch test?",
          answer: "New colour clients need an allergy patch test at least 48 hours before the colour appointment. It's free and takes 5 minutes – just drop by.",
          keywords: ["patch", "allergy", "allergic", "test"],
        },
        {
          question: "Which products do you use?",
          answer: "We use Davines and Olaplex – vegan-friendly and without harsh sulphates.",
          keywords: ["product", "brand", "vegan", "olaplex", "davines"],
        },
      ]),
      welcome: "Hi ✂️ I'm Studio Nord's AI receptionist. Want to book a cut or colour, move your appointment, or check our prices?",
    },
    catalog(
      "clinic_studio_nord",
      [["cut", "Cuts", "✂️"], ["colour", "Colour", "🎨"], ["styling", "Styling", "✨"]],
      [
        { id: "ph_nord_emma", name: "Emma Kjær", title: "Senior stylist · colour specialist", bio: "Balayage and blonde transformations.", color: "#e7a977", workDays: [2, 3, 4, 5, 6] },
        { id: "ph_nord_malik", name: "Malik Omar", title: "Barber & stylist", bio: "Fades, classic cuts and beards.", color: "#8fb3ff", workDays: [1, 2, 3, 4, 5] },
        { id: "ph_nord_ida", name: "Ida Berg", title: "Stylist", bio: "Precision cuts, curls and kids.", color: "#c89bf2", workDays: [1, 3, 4, 5, 6] },
      ],
      [
        ["cut", "Women's cut & blow-dry", 60, 595, "💇‍♀️", "Consultation, wash, cut and blow-dry.", { popular: true, aliases: ["women's cut", "womens cut", "ladies cut", "haircut", "hair cut", "cut and blow dry", "trim"] }],
        ["cut", "Men's cut", 30, 395, "💇‍♂️", "Classic or fade, incl. wash and styling.", { popular: true, aliases: ["men's cut", "mens cut", "fade", "gents cut", "male haircut"] }],
        ["cut", "Kids cut (under 12)", 30, 295, "🧒", "Relaxed cut for the little ones.", { aliases: ["kids cut", "children's cut", "child", "kid"] }],
        ["cut", "Beard trim", 20, 195, "🧔", "Shape, line-up and hot towel.", { aliases: ["beard"], practitionerIds: ["ph_nord_malik"] }],
        ["colour", "Full colour", 120, 895, "🎨", "Root-to-tip colour incl. cut and blow-dry.", { priceFrom: true, aliases: ["colour", "color", "hair colour", "dye", "full color"], practitionerIds: ["ph_nord_emma", "ph_nord_ida"] }],
        ["colour", "Balayage / highlights", 150, 1295, "🌅", "Hand-painted balayage or foils incl. toner and cut.", { priceFrom: true, popular: true, aliases: ["balayage", "highlights", "foils", "blonde"], practitionerIds: ["ph_nord_emma"] }],
        ["styling", "Blow-dry & styling", 45, 350, "💨", "Wash and blow-out – curls, waves or sleek.", { aliases: ["blow dry", "blowout", "styling", "blow-dry"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Chiropractor
  tenant(
    {
      id: "clinic_align_chiro",
      slug: "align-chiro",
      name: "Align Chiropractic",
      tagline: "Chiropractic clinic for back, neck & joints",
      description: "Authorised chiropractors helping with back pain, neck pain, headaches and sports injuries. No referral needed.",
      type: "chiropractic",
      emoji: "🦴",
      accentColor: "#6fb7ff",
      heroImage: IMAGES.chiro,
      address: "Gammel Kongevej 110",
      city: "1850 Frederiksberg C",
      phone: PLACEHOLDER_PHONE,
      email: "reception@align.demo",
      parking: "2 hours free parking with a parking disc on Gammel Kongevej. Elevator access.",
      openingHours: hours(["07:30", "18:00"], ["07:30", "15:00"], null),
      booking: rules({
        slotMinutes: 10,
        bufferMinutes: 0,
        minNoticeHours: 1,
        rules: "New patients start with a first consultation (45 min) incl. examination. Rebook or cancel up to 24 hours before. Acute pain? Call us – we keep same-day slots free.",
      }),
      paymentMethods: ["card", "mobilepay", "insurance"],
      insurance: "You get a public subsidy ('sygesikring' group 1) for chiropractic treatment – it's deducted automatically. 'Sygeforsikringen danmark' also covers part of the price. No referral from your doctor is needed.",
      reviewUrl: "https://www.google.com/search?q=Align+Chiropractic+reviews",
      faq: commonFaq([
        {
          question: "Do I need a referral?",
          answer: "No, you don't need a referral to see a chiropractor. Just book a first consultation.",
          keywords: ["referral", "doctor", "henvisning", "gp"],
        },
        {
          question: "What happens at the first consultation?",
          answer: "We go through your history, do a thorough examination and – if appropriate – start treatment the same day. Plan 45 minutes and wear comfortable clothes.",
          keywords: ["first time", "first consultation", "first visit", "what happens", "new patient"],
        },
        {
          question: "I'm in acute pain – can I come today?",
          answer: "Yes, we keep acute slots free every day. Ask me for today's first available time, or call the clinic directly.",
          keywords: ["acute", "emergency", "today", "urgent", "pain", "hurt", "locked"],
        },
      ]),
      welcome: "Hi 👋 I'm the AI receptionist at Align Chiropractic. I can book a first consultation or treatment, find an acute slot, or move your appointment.",
    },
    catalog(
      "clinic_align_chiro",
      [["consult", "Consultations", "🩺"], ["treat", "Treatments", "🦴"]],
      [
        { id: "ph_align_lars", name: "Dr. Lars Mikkelsen", title: "Chiropractor, MSc", bio: "Back pain, disc problems and headaches.", color: "#6fb7ff", workDays: MON_FRI },
        { id: "ph_align_nadia", name: "Dr. Nadia Rahimi", title: "Chiropractor, MSc", bio: "Sports injuries, shoulders and knees.", color: "#3fcfab", workDays: [1, 2, 4, 5] },
      ],
      [
        ["consult", "First consultation", 45, 695, "🩺", "Full examination, diagnosis and first treatment.", { popular: true, newClientsOnly: true, aliases: ["first consultation", "first visit", "new patient", "examination", "first time", "initial"] }],
        ["treat", "Follow-up treatment", 20, 395, "🦴", "Treatment for existing patients.", { popular: true, aliases: ["follow up", "follow-up", "treatment", "adjustment", "regular"] }],
        ["treat", "Extended treatment", 30, 495, "⏱️", "Longer treatment incl. soft tissue and exercises.", { aliases: ["extended", "longer treatment", "30 min"] }],
        ["treat", "Acute appointment", 20, 450, "⚡", "Same-day slot for acute pain.", { aliases: ["acute", "emergency", "urgent", "locked back", "today"] }],
        ["consult", "Children's check (0–12 years)", 20, 295, "🧸", "Gentle check for babies and children.", { aliases: ["baby", "child", "children", "kid", "infant"], practitionerIds: ["ph_align_nadia"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Physiotherapy
  tenant(
    {
      id: "clinic_movewell",
      slug: "movewell-physio",
      name: "MoveWell Physio",
      tagline: "Physiotherapy & sports rehab",
      description: "Physiotherapists specialised in sports injuries, back pain and rehab after surgery. With or without a doctor's referral.",
      type: "physio",
      emoji: "🏃",
      accentColor: "#9adf6a",
      heroImage: IMAGES.physio,
      address: "Amagerbrogade 150",
      city: "2300 Copenhagen S",
      phone: PLACEHOLDER_PHONE,
      email: "hello@movewell.demo",
      parking: "Free parking in the courtyard behind the clinic. Metro: Amagerbro, 3 min walk.",
      openingHours: hours(["07:00", "19:00"], ["07:00", "16:00"], null),
      booking: rules({
        minNoticeHours: 3,
        lateCancellationFee: 200,
        rules: "New patients start with an initial assessment (60 min). Bring your referral if you have one. Cancel or rebook up to 24 hours before – later cancellations are charged DKK 200.",
      }),
      paymentMethods: ["card", "mobilepay", "insurance", "invoice"],
      insurance: "With a referral from your GP you get a public subsidy (approx. 40%) that is deducted automatically. We also work with most health insurances (e.g. Skandia, Tryg, PFA) – we invoice them directly.",
      reviewUrl: "https://www.google.com/search?q=MoveWell+Physio+reviews",
      faq: commonFaq([
        {
          question: "Do I need a referral?",
          answer: "No – you can book without a referral. With a referral from your GP you get a public subsidy of about 40%.",
          keywords: ["referral", "doctor", "gp", "henvisning"],
        },
        {
          question: "What should I wear?",
          answer: "Comfortable clothes you can move in – shorts are great for knee and hip problems. We have changing rooms.",
          keywords: ["wear", "clothes", "bring", "dress"],
        },
      ]),
      welcome: "Hi 👋 I'm MoveWell's AI receptionist. I can book an assessment or treatment, check if your insurance covers it, or move your appointment.",
    },
    catalog(
      "clinic_movewell",
      [["assess", "Assessments", "📋"], ["treat", "Treatments", "🏃"]],
      [
        { id: "ph_move_mads", name: "Mads Winther", title: "Physiotherapist, sports", bio: "Runners, football and knee rehab.", color: "#9adf6a", workDays: MON_FRI },
        { id: "ph_move_julie", name: "Julie Sørensen", title: "Physiotherapist, MSc", bio: "Back, neck and post-surgery rehab.", color: "#6fb7ff", workDays: [1, 2, 3, 4] },
        { id: "ph_move_anton", name: "Anton Friis", title: "Physiotherapist", bio: "Shockwave, shoulders and tendons.", color: "#f2b880", workDays: [2, 3, 4, 5] },
      ],
      [
        ["assess", "Initial assessment", 60, 650, "📋", "Examination, diagnosis and a personal rehab plan.", { popular: true, newClientsOnly: true, aliases: ["initial assessment", "first appointment", "first visit", "new patient", "assessment", "examination"] }],
        ["treat", "Treatment 30 min", 30, 450, "🩹", "Follow-up treatment and exercise progression.", { popular: true, aliases: ["treatment", "follow up", "follow-up", "30 min"] }],
        ["treat", "Treatment 45 min", 45, 575, "🩹", "Longer follow-up incl. manual therapy.", { aliases: ["45 min", "longer treatment"] }],
        ["treat", "Sports injury session 60 min", 60, 750, "⚽", "Return-to-sport testing and training.", { aliases: ["sports injury", "sport injury", "return to sport", "running injury"], practitionerIds: ["ph_move_mads"] }],
        ["treat", "Shockwave therapy", 30, 500, "〰️", "For tendon problems, heel spurs and tennis elbow.", { aliases: ["shockwave", "shock wave", "heel spur", "tennis elbow"], practitionerIds: ["ph_move_anton"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Dental
  tenant(
    {
      id: "clinic_smile_dental",
      slug: "smile-dental",
      name: "Smile Dental Clinic",
      tagline: "Friendly dentist for the whole family",
      description: "Modern dental clinic with check-ups, hygienist, fillings, whitening and emergency appointments. Anxious patients are very welcome.",
      type: "dental",
      emoji: "🦷",
      accentColor: "#7ad3f2",
      heroImage: IMAGES.dental,
      address: "Lyngbyvej 32",
      city: "2100 Copenhagen Ø",
      phone: PLACEHOLDER_PHONE,
      email: "tand@smiledental.demo",
      parking: "Free parking for patients behind the building (entrance from Lyngbyvej).",
      openingHours: hours(["08:00", "17:00"], ["08:00", "14:00"], null),
      booking: rules({
        slotMinutes: 15,
        bufferMinutes: 10,
        minNoticeHours: 2,
        maxDaysAhead: 120,
        lateCancellationFee: 350,
        confirmNewClients: true,
        rules: "New patients are confirmed by the clinic within one working day. Cancel or rebook up to 24 hours before – later cancellations are charged DKK 350. Emergency? Call us before 10:00 for a same-day appointment.",
      }),
      paymentMethods: ["card", "mobilepay", "insurance"],
      insurance: "The public subsidy for dental care is deducted automatically. With 'Sygeforsikringen danmark' you get additional reimbursement – we send it directly, so you only pay your share.",
      reviewUrl: "https://www.google.com/search?q=Smile+Dental+Clinic+reviews",
      faq: commonFaq([
        {
          question: "I'm nervous about the dentist – can you help?",
          answer: "Absolutely. Tell us when you book and we'll plan extra time, explain everything along the way and agree on a stop signal. We can also offer calming medication.",
          keywords: ["nervous", "anxious", "anxiety", "scared", "afraid", "fear"],
        },
        {
          question: "I have a toothache – can I come today?",
          answer: "Yes, we have emergency appointments every weekday. Ask me for today's first available emergency time, or call before 10:00.",
          keywords: ["toothache", "tooth ache", "pain", "emergency", "broken", "cracked", "today", "acute"],
        },
        {
          question: "How often should I have a check-up?",
          answer: "Most adults should come every 12–18 months – we'll tell you your recommended interval after your check-up.",
          keywords: ["how often", "interval", "every"],
        },
      ]),
      welcome: "Hi 😊 I'm Smile Dental's AI receptionist. I can book a check-up, an emergency appointment or a hygienist – or move your existing appointment.",
    },
    catalog(
      "clinic_smile_dental",
      [["exam", "Check-ups", "🦷"], ["care", "Treatments", "🪥"], ["cosmetic", "Cosmetic", "✨"]],
      [
        { id: "ph_smile_helle", name: "Dr. Helle Juhl", title: "Dentist", bio: "Family dentistry and anxious patients.", color: "#7ad3f2", workDays: MON_FRI },
        { id: "ph_smile_omar", name: "Dr. Omar Aziz", title: "Dentist", bio: "Fillings, crowns and cosmetic dentistry.", color: "#c89bf2", workDays: [1, 2, 3, 4] },
        { id: "ph_smile_line", name: "Line Møller", title: "Dental hygienist", bio: "Cleaning, gum health and prevention.", color: "#9adf6a", workDays: [1, 2, 3, 5] },
      ],
      [
        ["exam", "Check-up & cleaning", 45, 595, "🦷", "Examination, X-rays if needed, and cleaning.", { popular: true, aliases: ["check up", "check-up", "checkup", "cleaning", "routine", "annual"], practitionerIds: ["ph_smile_helle", "ph_smile_omar"] }],
        ["exam", "New patient examination", 60, 795, "📋", "Full examination incl. X-rays and treatment plan.", { newClientsOnly: true, aliases: ["new patient", "first visit", "first time", "register"], practitionerIds: ["ph_smile_helle", "ph_smile_omar"] }],
        ["care", "Emergency appointment", 30, 450, "🚑", "Toothache, broken tooth or swelling – same day.", { popular: true, aliases: ["emergency", "toothache", "tooth ache", "pain", "broken tooth", "acute"], practitionerIds: ["ph_smile_helle", "ph_smile_omar"] }],
        ["care", "Hygienist cleaning", 45, 695, "🪥", "Deep cleaning, tartar removal and polishing.", { aliases: ["hygienist", "tartar", "deep clean", "polish"], practitionerIds: ["ph_smile_line"] }],
        ["care", "Filling", 45, 750, "🔧", "White composite filling – price depends on size.", { priceFrom: true, aliases: ["filling", "cavity", "hole"], practitionerIds: ["ph_smile_helle", "ph_smile_omar"] }],
        ["cosmetic", "Teeth whitening", 90, 2995, "✨", "In-clinic whitening incl. take-home kit.", { aliases: ["whitening", "bleaching", "white teeth"], practitionerIds: ["ph_smile_omar"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Beauty & skin
  tenant(
    {
      id: "clinic_glow_skin",
      slug: "glow-skin",
      name: "Glow Skin Clinic",
      tagline: "Skin, facials & lashes",
      description: "Skin clinic with facials, HydraFacial, peels, microneedling, lashes and brows. Every new client gets a free skin consultation.",
      type: "beauty",
      emoji: "🌸",
      accentColor: "#f29bc1",
      heroImage: IMAGES.skin,
      address: "Kronprinsensgade 5",
      city: "1114 Copenhagen K",
      phone: PLACEHOLDER_PHONE,
      email: "glow@glowskin.demo",
      parking: "Nearest car park: Q-Park Illum/Magasin, 4 min walk. Metro: Kongens Nytorv.",
      openingHours: hours(["10:00", "19:00"], ["10:00", "18:00"], ["10:00", "16:00"]),
      booking: rules({
        lateCancellationFee: 400,
        rules: "Cancel or rebook for free up to 24 hours before. Later cancellations and no-shows are charged DKK 400. Please arrive with a clean face for peels and microneedling.",
      }),
      paymentMethods: ["card", "mobilepay"],
      reviewUrl: "https://www.google.com/search?q=Glow+Skin+Clinic+reviews",
      faq: commonFaq([
        {
          question: "Which treatment is right for my skin?",
          answer: "Book a free 30-minute skin consultation – our skin therapist analyses your skin and recommends a plan. No obligation.",
          keywords: ["which treatment", "right for", "recommend", "my skin", "acne", "pigment", "wrinkles"],
        },
        {
          question: "Is there downtime after microneedling?",
          answer: "Expect 1–2 days of redness. Avoid sun, make-up and exercise for 24 hours. We give you aftercare products to take home.",
          keywords: ["downtime", "after", "aftercare", "red", "redness", "recovery"],
        },
      ]),
      welcome: "Hi 🌸 I'm Glow's AI receptionist. Shall I book a facial, a free skin consultation or your lashes – or move an existing appointment?",
      theme: "light",
    },
    catalog(
      "clinic_glow_skin",
      [["skin", "Skin treatments", "🌸"], ["lash", "Lashes & brows", "👁️"]],
      [
        { id: "ph_glow_camilla", name: "Camilla Dahl", title: "Skin therapist", bio: "Acne, pigmentation and anti-age.", color: "#f29bc1", workDays: [1, 2, 3, 4, 5] },
        { id: "ph_glow_yasmin", name: "Yasmin Ali", title: "Beautician · lash & brow artist", bio: "Lash lifts, brow lamination and facials.", color: "#e7a977", workDays: [2, 3, 4, 5, 6] },
      ],
      [
        ["skin", "Free skin consultation", 30, 0, "🔍", "Skin analysis and a personal treatment plan.", { aliases: ["consultation", "skin consultation", "free consultation", "skin analysis"] }],
        ["skin", "Classic facial", 60, 795, "🧖‍♀️", "Cleansing, exfoliation, extraction, mask and massage.", { popular: true, aliases: ["facial", "classic facial", "face treatment"] }],
        ["skin", "HydraFacial", 60, 1495, "💧", "Deep cleanse, extraction and hydration in one.", { popular: true, aliases: ["hydrafacial", "hydra facial", "hydra"], practitionerIds: ["ph_glow_camilla"] }],
        ["skin", "Chemical peel", 45, 995, "🍋", "For pigmentation, acne and fine lines.", { aliases: ["peel", "chemical peel", "acid peel"], practitionerIds: ["ph_glow_camilla"] }],
        ["skin", "Microneedling", 75, 1795, "🪡", "Collagen boost for scars, pores and fine lines.", { aliases: ["microneedling", "micro needling", "dermapen", "needling"], practitionerIds: ["ph_glow_camilla"] }],
        ["lash", "Lash lift & tint", 60, 595, "👁️", "Natural curl that lasts 6–8 weeks.", { popular: true, aliases: ["lash lift", "lashes", "lash tint", "eyelash"], practitionerIds: ["ph_glow_yasmin"] }],
        ["lash", "Brow shaping & tint", 30, 395, "〰️", "Shape, wax and tint.", { aliases: ["brows", "brow", "eyebrow", "brow tint", "brow lamination"], practitionerIds: ["ph_glow_yasmin"] }],
      ],
    ),
  ),

  // ------------------------------------------------------------------ Podiatry
  tenant(
    {
      id: "clinic_step_foot",
      slug: "step-foot",
      name: "Step Foot Clinic",
      tagline: "State-registered podiatrists",
      description: "Foot care by state-registered podiatrists: treatments, ingrown toenails, diabetic foot care, warts and custom insoles.",
      type: "podiatry",
      emoji: "🦶",
      accentColor: "#f2c46b",
      heroImage: IMAGES.feet,
      address: "Frederikssundsvej 88",
      city: "2400 Copenhagen NV",
      phone: PLACEHOLDER_PHONE,
      email: "fod@stepfoot.demo",
      parking: "Free 2-hour parking in front of the clinic. Step-free access.",
      openingHours: hours(["08:00", "17:00"], ["08:00", "15:00"], null),
      booking: rules({
        lateCancellationFee: 200,
        rules: "Cancel or rebook up to 24 hours before – later cancellations are charged DKK 200. Diabetic patients with a referral get a public subsidy.",
      }),
      paymentMethods: ["card", "mobilepay", "insurance"],
      insurance: "With a doctor's referral for diabetes (or certain other conditions) you get a public subsidy for podiatry. 'Sygeforsikringen danmark' also reimburses part of foot treatments.",
      reviewUrl: "https://www.google.com/search?q=Step+Foot+Clinic+reviews",
      faq: commonFaq([
        {
          question: "How often should I get a foot treatment?",
          answer: "Most clients come every 6–8 weeks. With diabetes we usually recommend every 4–6 weeks.",
          keywords: ["how often", "interval", "every"],
        },
        {
          question: "Can you help with an ingrown toenail today?",
          answer: "Often yes – ask me for today's first free time for 'Ingrown toenail'. If it's red and swollen, please mention it when booking.",
          keywords: ["ingrown", "toenail", "nail", "infection", "swollen"],
        },
      ]),
      welcome: "Hi 👣 I'm the AI receptionist at Step Foot Clinic. I can book a foot treatment, help with an ingrown toenail or move your appointment.",
    },
    catalog(
      "clinic_step_foot",
      [["care", "Foot care", "🦶"], ["special", "Specialised", "🩺"]],
      [
        { id: "ph_step_karin", name: "Karin Holt", title: "State-registered podiatrist", bio: "Diabetic feet and nail corrections.", color: "#f2c46b", workDays: MON_FRI },
        { id: "ph_step_ali", name: "Ali Hassan", title: "State-registered podiatrist", bio: "Insoles, running feet and warts.", color: "#6fb7ff", workDays: [1, 2, 4, 5] },
      ],
      [
        ["care", "Foot treatment", 45, 450, "🦶", "Nails, calluses and corns – the full treatment.", { popular: true, aliases: ["foot treatment", "pedicure", "feet", "callus", "corns", "nails"] }],
        ["care", "Ingrown toenail", 30, 395, "💅", "Treatment of ingrown or painful nails.", { popular: true, aliases: ["ingrown", "ingrown toenail", "toenail", "nail brace", "nail"] }],
        ["special", "Diabetic foot care", 45, 450, "🩺", "Foot check and treatment for diabetes patients.", { aliases: ["diabetic", "diabetes"], practitionerIds: ["ph_step_karin"] }],
        ["special", "Custom insoles consultation", 60, 695, "👟", "Gait analysis and made-to-measure insoles.", { priceFrom: true, aliases: ["insoles", "insole", "gait", "orthotics"], practitionerIds: ["ph_step_ali"] }],
        ["special", "Wart treatment", 20, 295, "🎯", "Freezing or acid treatment of verrucas.", { aliases: ["wart", "warts", "verruca"] }],
      ],
    ),
  ),
];

export const DEMO_CLINICS: Clinic[] = TENANTS.map((t) => t.clinic);
export const DEMO_CATALOGS: Record<string, Catalog> = Object.fromEntries(TENANTS.map((t) => [t.clinic.id, t.catalog]));
export const DEFAULT_CLINIC_SLUG = "calm-hands";

export const TYPE_LABEL: Record<ClinicType, string> = {
  massage: "Massage",
  hair: "Hair salon",
  chiropractic: "Chiropractor",
  physio: "Physiotherapy",
  dental: "Dental clinic",
  beauty: "Beauty & skin",
  podiatry: "Podiatry",
};
