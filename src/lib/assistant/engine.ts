import type { Appointment, Catalog, Clinic, Practitioner, Service } from "@/lib/types";
import type { AvailabilityResult } from "@/lib/server/services";
import { dkk, duration, formatDate, formatDateShort, dayName, priceLabel } from "@/lib/format";
import { addDays, clinicNow, groupedHours, hoursForDate, hoursUntil, isOpenNow, practitionersFor, toMin } from "@/lib/hours";
import { findPractitioner, rankServices, wantsAnyone } from "@/lib/match";
import { norm, parseDate, parseDayPart, parseEmail, parsePhone, parseReference, parseTime } from "./parse";

// The demo receptionist's conversation engine. It runs in the browser and uses the
// real API (availability, appointments, lookup, rebooking), so bookings made in the
// chat show up in the admin calendar immediately. The production AIbooking agent
// replaces it via the widget configuration – but follows the same flows.

export type QuickReply = { label: string; value: string };

export type AssistantCard =
  | { type: "appointment"; appointment: Appointment; title?: string }
  | { type: "summary"; lines: { label: string; value: string }[]; note?: string }
  | { type: "prices"; services: Pick<Service, "id" | "name" | "price" | "priceFrom" | "durationMinutes" | "emoji">[] }
  | { type: "call"; phone: string };

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  card?: AssistantCard;
  quickReplies?: QuickReply[];
}

type Stage =
  | "idle"
  | "book_service"
  | "book_practitioner"
  | "book_date"
  | "book_time"
  | "book_name"
  | "book_phone"
  | "book_confirm"
  | "manage_reference"
  | "manage_phone"
  | "manage_pick"
  | "manage_action"
  | "manage_date"
  | "manage_time"
  | "manage_cancel_confirm";

export interface AssistantState {
  stage: Stage;
  booking: {
    serviceId?: string;
    practitionerId?: string;
    /** Client said "anyone is fine". */
    anyPractitioner?: boolean;
    date?: string;
    time?: string;
    dayPart?: [number, number];
    comment?: string;
  };
  manage?: {
    intent?: "move" | "cancel";
    reference?: string;
    matches?: Appointment[];
    appointment?: Appointment;
    date?: string;
    dayPart?: [number, number];
  };
  /** Times offered last – so "the first one" or "10" can be resolved. */
  offered?: { date: string; times: string[] };
  name?: string;
  phone?: string;
  email?: string;
}

export const initialState = (): AssistantState => ({ stage: "idle", booking: {} });

export interface AssistantContext {
  clinic: Clinic;
  catalog: Catalog;
  source: "chat" | "voice";
  /** Override "now" (tests). */
  now?: Date;
  api: {
    availability(q: { clinicId: string; serviceId: string; date: string; practitionerId?: string; excludeAppointmentId?: string }): Promise<AvailabilityResult>;
    createAppointment(body: unknown): Promise<Appointment>;
    lookup(reference: string, phone: string): Promise<Appointment[]>;
    updateAppointment(id: string, body: unknown): Promise<Appointment>;
  };
}

type Reply = Omit<AssistantMessage, "id" | "role">;
const say = (text: string, extra: Partial<Reply> = {}): Reply => ({ text, ...extra });
const qr = (label: string, value = label): QuickReply => ({ label, value });

export const mainMenu = (): QuickReply[] => [
  qr("📅 Book an appointment", "I'd like to book an appointment"),
  qr("🔄 Move my appointment", "I need to move my appointment"),
  qr("✕ Cancel an appointment", "I need to cancel my appointment"),
  qr("🏷️ Prices", "What are your prices?"),
];

const has = (t: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? t.includes(w) : w.test(t)));
const YES = /^(yes|yeah|yep|yup|sure|ok|okay|confirm|correct|perfect|great|please do|do it|go ahead|sounds good|that s right|thats right|absolutely|book it|lovely|fine)\b/;
const NO = /^(no|nope|nah|not really|no thanks|wrong)\b/;

const W = {
  reset: /\b(start over|reset|never mind|nevermind|forget it|restart)\b/,
  book: ["book", "appointment", "reserve", "schedule", "time for", "have time", "any time", "available", "availability", "free slot", "slot", "come in", "get in", "see someone", "an opening", "can i come", "make an"],
  move: ["move", "reschedule", "rebook", "re book", "change my", "change the", "postpone", "another time", "another day", "different time", "different day", "push", "bring forward", "earlier", "later appointment", "can t make it", "cant make it"],
  cancel: ["cancel", "call off", "can t come", "cant come", "won t make", "wont make", "not coming", "unable to come"],
  mine: ["my appointment", "my booking", "my time", "my massage", "my treatment", "my session", "my cut", "my check", "i have an appointment", "i m booked", "im booked", "booked for", "my reservation", "existing"],
  greet: /^(hi|hello|hey|good morning|good afternoon|good evening|hiya|howdy)\b/,
  thanks: /\b(thanks|thank you|cheers|ta)\b/,
  help: ["what can you", "help", "what do you do", "options"],
  human: ["human", "real person", "someone at the clinic", "speak to", "talk to", "staff", "receptionist please", "call me back", "manager"],
};

// ------------------------------------------------------------------------------------------

export async function respond(ctx: AssistantContext, state: AssistantState, input: string): Promise<{ state: AssistantState; replies: Reply[] }> {
  const s: AssistantState = structuredClone(state);
  const t = norm(input);
  const replies: Reply[] = [];
  const push = (m: Reply) => replies.push(m);
  const out = () => ({ state: s, replies });

  if (has(t, W.reset) || (t === "cancel" && s.stage.startsWith("book_"))) {
    Object.assign(s, initialState(), { name: s.name, phone: s.phone });
    push(say("No problem – I've cleared that. What else can I help with?", { quickReplies: mainMenu() }));
    return out();
  }

  // ------------------------------------------------ Flow steps
  switch (s.stage) {
    case "book_service": {
      const svc = pickService(ctx, input);
      if (svc) {
        s.booking.serviceId = svc.id;
        fillBooking(ctx, s, input);
        await advanceBooking(ctx, s, replies);
        return out();
      }
      if (!isQuestion(t)) {
        push(say("I couldn't find that treatment. Which one of these would you like?", { quickReplies: serviceReplies(ctx) }));
        return out();
      }
      break;
    }
    case "book_practitioner": {
      const p = findPractitioner(ctx.catalog.practitioners, input);
      if (p || wantsAnyone(t) || NO.test(t)) {
        s.booking.practitionerId = p?.id;
        s.booking.anyPractitioner = !p;
        fillBooking(ctx, s, input);
        await advanceBooking(ctx, s, replies);
        return out();
      }
      break;
    }
    case "book_date":
    case "book_time": {
      const before = { ...s.booking };
      fillBooking(ctx, s, input);
      pickOffered(s, input, (time, date) => {
        s.booking.time = time;
        s.booking.date = date;
      });
      const changed = JSON.stringify(before) !== JSON.stringify(s.booking);
      if (changed || !isQuestion(t)) {
        await advanceBooking(ctx, s, replies);
        return out();
      }
      break;
    }
    case "book_name": {
      s.name = cleanName(input);
      s.stage = "book_phone";
      if (s.phone) return confirmBooking(ctx, s, replies);
      push(say(`Thanks, ${s.name.split(" ")[0]}. What's the best phone number to reach you on?`));
      return out();
    }
    case "book_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say("That doesn't look like a valid phone number – could you try again? For example 12 34 56 78."));
        return out();
      }
      s.phone = phone;
      s.email = parseEmail(input) ?? s.email;
      return confirmBooking(ctx, s, replies);
    }
    case "book_confirm": {
      if (YES.test(t) || has(t, "confirm")) {
        const svc = service(ctx, s.booking.serviceId);
        try {
          const appointment = await ctx.api.createAppointment({
            clinicId: ctx.clinic.id,
            source: ctx.source,
            serviceId: s.booking.serviceId,
            practitionerId: s.booking.practitionerId,
            date: s.booking.date,
            time: s.booking.time,
            customer: { name: s.name, phone: s.phone, email: s.email },
            comment: s.booking.comment,
            newClient: svc?.newClientsOnly,
          });
          Object.assign(s, initialState(), { name: s.name, phone: s.phone });
          push(say(
            appointment.status === "pending"
              ? `Thank you! Your request is registered (ref. ${appointment.reference}). As a new patient, the clinic confirms your time personally – usually within one working day.`
              : `You're booked ✓ ${appointment.serviceName} with ${first(appointment.practitionerName)} on ${formatDate(appointment.date)} at ${appointment.time}. Your reference is ${appointment.reference} – you'll get a text confirmation.`,
            { card: { type: "appointment", appointment }, quickReplies: [qr("Anything else?", "What else can you help with?"), qr("See it in the clinic's calendar", "__admin__")] },
          ));
        } catch (e) {
          s.booking.time = undefined;
          s.stage = "book_time";
          push(say(`Sorry – I couldn't book that: ${errText(e)}. Let me find another time.`));
          await advanceBooking(ctx, s, replies);
        }
        return out();
      }
      if (NO.test(t) || has(t, "change", "edit", "different")) {
        s.booking.time = undefined;
        s.booking.date = undefined;
        s.stage = "book_date";
        push(say("No problem – which day would suit you instead?", { quickReplies: dateReplies(ctx) }));
        return out();
      }
      fillBooking(ctx, s, input);
      await advanceBooking(ctx, s, replies);
      return out();
    }
    case "manage_reference": {
      const ref = parseReference(input);
      if (!ref) {
        push(say("What's your booking reference? It's in your confirmation text – for example CA-4201."));
        return out();
      }
      s.manage = { ...s.manage, reference: ref };
      const phone = parsePhone(input.replace(ref, ""));
      if (phone) s.phone = phone;
      if (s.phone) return lookup(ctx, s, replies);
      s.stage = "manage_phone";
      push(say("Thanks. And which phone number did you book with?"));
      return out();
    }
    case "manage_phone": {
      const phone = parsePhone(input);
      if (!phone) {
        push(say("Please give me the phone number the appointment was booked with."));
        return out();
      }
      s.phone = phone;
      return lookup(ctx, s, replies);
    }
    case "manage_pick": {
      const list = s.manage?.matches ?? [];
      const pick = list.find((a) => t.includes(norm(a.reference))) ?? list.find((a) => t.includes(norm(a.serviceName))) ?? (/\b(first|1st|one)\b/.test(t) ? list[0] : /\b(second|2nd|two)\b/.test(t) ? list[1] : undefined);
      if (pick) {
        s.manage = { ...s.manage, appointment: pick };
        return nextManageStep(ctx, s, replies);
      }
      push(say("Which appointment do you mean?", { quickReplies: list.map((a) => qr(`${a.serviceName} · ${formatDateShort(a.date)} ${a.time}`, a.reference)) }));
      return out();
    }
    case "manage_action": {
      if (has(t, ...W.cancel)) s.manage = { ...s.manage, intent: "cancel" };
      else if (has(t, ...W.move) || has(t, "change")) s.manage = { ...s.manage, intent: "move" };
      if (s.manage?.intent) {
        fillManage(ctx, s, input);
        return nextManageStep(ctx, s, replies);
      }
      break;
    }
    case "manage_date":
    case "manage_time": {
      const m = s.manage!;
      fillManage(ctx, s, input);
      let time = parseTime(input) ?? (/^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`at ${t}`) : undefined);
      pickOffered(s, input, (tm, d) => {
        time = tm;
        m.date = d;
      });
      if (m.date && time) return moveAppointment(ctx, s, replies, m.date, time);
      return nextManageStep(ctx, s, replies);
    }
    case "manage_cancel_confirm": {
      if (YES.test(t) || has(t, "cancel anyway", "yes cancel", "cancel it")) return cancelAppointment(ctx, s, replies);
      if (has(t, ...W.move) || has(t, "instead")) {
        s.manage = { ...s.manage, intent: "move" };
        return nextManageStep(ctx, s, replies);
      }
      if (NO.test(t) || has(t, "keep")) {
        Object.assign(s, initialState(), { name: s.name, phone: s.phone });
        push(say("Great – I'll keep your appointment as it is. See you then!", { quickReplies: mainMenu() }));
        return out();
      }
      break;
    }
    default:
      break;
  }

  // ------------------------------------------------ Intents (free text)
  if (has(t, ...W.human) && !has(t, "book")) {
    push(say(`Of course. You can reach the team directly on ${ctx.clinic.phone} – or I can take a message and ask them to call you back.`, { card: { type: "call", phone: ctx.clinic.phone } }));
    return out();
  }

  const wantsCancel = has(t, ...W.cancel) && (has(t, ...W.mine) || /\b(appointment|booking|session|time)\b/.test(t) || !!parseReference(input));
  const wantsMove = has(t, ...W.move) && (has(t, ...W.mine) || /\b(appointment|booking|session|time)\b/.test(t) || !!parseReference(input));
  if (wantsCancel || wantsMove) {
    s.manage = { intent: wantsCancel ? "cancel" : "move" };
    fillManage(ctx, s, input);
    const ref = parseReference(input);
    if (ref) {
      s.manage.reference = ref;
      if (s.phone) return lookup(ctx, s, replies);
      s.stage = "manage_phone";
      push(say(`I can help with that. Which phone number is booking ${ref} under?`));
      return out();
    }
    s.stage = "manage_reference";
    push(say(`I can ${wantsCancel ? "cancel" : "move"} that for you. What's your booking reference? It's in your confirmation – for example ${exampleRef(ctx)}.`));
    return out();
  }

  const svc = pickService(ctx, input);
  const bookingWords = has(t, ...W.book) || (!!svc && (!!parseDate(input, today(ctx)) || !!parseTime(input) || !!parseDayPart(input)));
  const priceQuestion = has(t, "how much", "price", "cost", "prices", "fee", "expensive", "cheap", "rates");

  if (bookingWords && !priceQuestion && !(isQuestion(t) && !has(t, "do you have", "can i", "could i", "is there", "are there", "have time", "available", "free"))) {
    if (!ctx.clinic.booking.enabled) {
      push(say(`${ctx.clinic.name} doesn't take online bookings right now – please call us on ${ctx.clinic.phone}.`, { card: { type: "call", phone: ctx.clinic.phone } }));
      return out();
    }
    s.booking = {};
    if (svc) s.booking.serviceId = svc.id;
    fillBooking(ctx, s, input);
    await advanceBooking(ctx, s, replies, !svc);
    return out();
  }

  const answer = answerQuestion(ctx, t, input, svc);
  if (answer) {
    push(answer);
    return out();
  }

  if (svc && !isQuestion(t)) {
    s.booking = { serviceId: svc.id };
    fillBooking(ctx, s, input);
    await advanceBooking(ctx, s, replies, true);
    return out();
  }

  if (W.greet.test(t)) {
    push(say(ctx.clinic.widget.welcomeMessage, { quickReplies: mainMenu() }));
    return out();
  }
  if (W.thanks.test(t)) {
    push(say("You're welcome! Is there anything else I can help with?", { quickReplies: mainMenu() }));
    return out();
  }
  if (has(t, ...W.help)) {
    push(say("I can book appointments, move or cancel existing ones, and answer questions about treatments, prices, insurance, opening hours and parking. Try for example:", {
      quickReplies: [
        qr(`Do you have time tomorrow afternoon?`),
        qr(`How much is ${popular(ctx)[0]?.name.toLowerCase() ?? "a treatment"}?`),
        qr("I need to move my appointment"),
        qr("When are you open?"),
      ],
    }));
    return out();
  }

  push(say(`I'm not completely sure about that – but I can book, move or cancel appointments and answer questions about ${ctx.clinic.name}. You can also call the team on ${ctx.clinic.phone}.`, { quickReplies: mainMenu() }));
  return out();
}

// ------------------------------------------------ Booking helpers

const today = (ctx: AssistantContext) => clinicNow(ctx.now).date;
const first = (name: string) => name.replace(/^Dr\.\s+/, "Dr. ").split(" ").slice(0, name.startsWith("Dr.") ? 3 : 1).join(" ");
const errText = (e: unknown) => ((e as Error).message || "unknown error").replace(/\.$/, "");
const service = (ctx: AssistantContext, id?: string) => ctx.catalog.services.find((x) => x.id === id);
const popular = (ctx: AssistantContext) => {
  const list = ctx.catalog.services.filter((x) => x.available && x.popular);
  return list.length ? list : ctx.catalog.services.filter((x) => x.available).slice(0, 4);
};
const exampleRef = (ctx: AssistantContext) => `${ctx.clinic.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}-4201`;

function pickService(ctx: AssistantContext, input: string): Service | undefined {
  const ranked = rankServices(input, ctx.catalog.services.filter((x) => x.available));
  return ranked[0] && ranked[0].score >= 20 ? ranked[0].service : undefined;
}

function serviceReplies(ctx: AssistantContext): QuickReply[] {
  return popular(ctx)
    .slice(0, 5)
    .map((x) => qr(`${x.emoji} ${x.name} · ${priceLabel(x)}`, x.name));
}

function isQuestion(t: string) {
  return /\b(what|where|when|which|how|who|why|do you|does|is there|are there|can you tell|price|cost|do i need)\b/.test(t);
}

function cleanName(input: string) {
  return input
    .replace(/^(my name is|my name s|i m|i am|it s|it is|this is|name s|call me)\s+/i, "")
    .replace(/[.!]$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fillBooking(ctx: AssistantContext, s: AssistantState, input: string) {
  const t = norm(input);
  const b = s.booking;
  b.date = parseDate(input, today(ctx)) ?? b.date;
  b.time = parseTime(input) ?? (s.stage === "book_time" && /^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`at ${t}`) : undefined) ?? b.time;
  b.dayPart = parseDayPart(input) ?? b.dayPart;
  const p = findPractitioner(ctx.catalog.practitioners, input);
  if (p) {
    b.practitionerId = p.id;
    b.anyPractitioner = false;
  } else if (wantsAnyone(t)) b.anyPractitioner = true;
  const note = t.match(/\b(pregnant|pregnancy|nervous|anxious|first time|sensitive|allergic|allergy|referral|insurance|wheelchair|pain|injury|acute)\b/);
  if (note && !(b.comment ?? "").includes(note[1])) b.comment = [b.comment, note[1]].filter(Boolean).join(", ");
  s.email = parseEmail(input) ?? s.email;
  const phone = parsePhone(input);
  if (phone && input.replace(/\D/g, "").length >= 8 && !parseTime(input)) s.phone = phone;
}

/** "the first one", "10:30", "Thu 25 Sep 10:00" → resolves against the last offered times. */
function pickOffered(s: AssistantState, input: string, set: (time: string, date: string) => void) {
  const o = s.offered;
  if (!o) return;
  const t = norm(input);
  const iso = input.match(/(\d{4}-\d{2}-\d{2})\D+(\d{2}:\d{2})/);
  if (iso) return set(iso[2], iso[1]);
  const idx = /\b(first|1st|earliest)\b/.test(t) ? 0 : /\b(second|2nd)\b/.test(t) ? 1 : /\b(third|3rd)\b/.test(t) ? 2 : /\b(last|latest)\b/.test(t) ? o.times.length - 1 : -1;
  if (idx >= 0 && o.times[idx]) return set(o.times[idx], o.date);
  const time = parseTime(input) ?? (/^\d{1,2}([:.]\d{2})?$/.test(t) ? parseTime(`at ${t.replace(" ", ":")}`) : undefined);
  if (time && o.times.includes(time)) set(time, o.date);
}

function dateReplies(ctx: AssistantContext): QuickReply[] {
  const out: QuickReply[] = [];
  for (let i = 0; i < 10 && out.length < 4; i++) {
    const d = addDays(today(ctx), i);
    if (!hoursForDate(ctx.clinic, d)) continue;
    const day = new Date(`${d}T12:00:00`).getDay();
    out.push(qr(i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayName(day), i === 0 ? "today" : i === 1 ? "tomorrow" : dayName(day).toLowerCase()));
  }
  return out;
}

function inPart(time: string, part?: [number, number]) {
  if (!part) return true;
  const m = toMin(time);
  return m >= part[0] && m < part[1];
}

/** Spread offered times over the day, max 6. */
function spread(times: string[], max = 6) {
  if (times.length <= max) return times;
  const step = (times.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => times[Math.round(i * step)]);
}

function practitionerChoices(ctx: AssistantContext, svc: Service): Practitioner[] {
  return practitionersFor(ctx.catalog, svc);
}

async function advanceBooking(ctx: AssistantContext, s: AssistantState, replies: Reply[], intro = false): Promise<void> {
  const c = ctx.clinic;
  const b = s.booking;
  const svc = service(ctx, b.serviceId);
  if (!svc) {
    s.stage = "book_service";
    replies.push(say(intro ? "I'd be happy to book that for you. Which treatment would you like?" : "Which treatment would you like?", { quickReplies: serviceReplies(ctx) }));
    return;
  }
  const staff = practitionerChoices(ctx, svc);
  if (b.practitionerId && !staff.some((p) => p.id === b.practitionerId)) {
    const p = ctx.catalog.practitioners.find((x) => x.id === b.practitionerId);
    replies.push(say(`${p ? first(p.name) : "That practitioner"} doesn't do ${svc.name.toLowerCase()} – ${staff.map((x) => first(x.name)).join(" or ")} does.`));
    b.practitionerId = undefined;
  }
  if (!b.practitionerId && !b.anyPractitioner && staff.length > 1 && !b.date) {
    s.stage = "book_practitioner";
    replies.push(say(`${svc.name} – ${priceLabel(svc)}, ${duration(svc.durationMinutes)}. Do you have a preferred ${roleWord(c)}?`, {
      quickReplies: [qr("No preference", "anyone is fine"), ...staff.map((p) => qr(p.name, `with ${p.name}`))],
    }));
    return;
  }
  if (!b.date) {
    s.stage = "book_date";
    replies.push(say(`${intro ? `${svc.name} – ${priceLabel(svc)}. ` : ""}Which day would suit you?`, { quickReplies: dateReplies(ctx) }));
    return;
  }

  let avail: AvailabilityResult;
  try {
    avail = await ctx.api.availability({ clinicId: c.id, serviceId: svc.id, date: b.date, practitionerId: b.practitionerId });
  } catch (e) {
    s.stage = "book_date";
    b.date = undefined;
    replies.push(say(`Sorry, I couldn't check the calendar: ${errText(e)}. Which day would you like?`, { quickReplies: dateReplies(ctx) }));
    return;
  }
  const who = b.practitionerId ? first(ctx.catalog.practitioners.find((p) => p.id === b.practitionerId)!.name) : undefined;
  const times = avail.slots.map((x) => x.time);

  if (!times.length) {
    const closed = !hoursForDate(c, b.date);
    const alt = avail.alternatives;
    s.stage = "book_time";
    b.time = undefined;
    const first3 = alt.flatMap((d) => d.times.slice(0, 2).map((time) => ({ date: d.date, time }))).slice(0, 4);
    s.offered = alt[0] ? { date: alt[0].date, times: alt[0].times } : undefined;
    replies.push(say(
      `${closed ? `We're closed on ${formatDate(b.date)}.` : b.date === today(ctx) ? `There are no more free times today${who ? ` with ${who}` : ""}.` : `${who ?? "We"} ${who ? "is" : "are"} fully booked on ${formatDate(b.date)}.`} ${first3.length ? "The next free times are:" : "Please try another day."}`,
      { quickReplies: [...first3.map((x) => qr(`${formatDateShort(x.date)} · ${x.time}`, `${x.date} at ${x.time}`)), qr("Another day", "another day")] },
    ));
    b.date = undefined;
    return;
  }

  if (b.time && !times.includes(b.time)) {
    const nearest = [...times].sort((x, y) => Math.abs(toMin(x) - toMin(b.time!)) - Math.abs(toMin(y) - toMin(b.time!))).slice(0, 4).sort();
    s.stage = "book_time";
    s.offered = { date: b.date, times: nearest };
    replies.push(say(`${b.time} is taken${who ? ` for ${who}` : ""} on ${formatDate(b.date)}. The closest free times are:`, { quickReplies: nearest.map((x) => qr(x, `at ${x}`)) }));
    b.time = undefined;
    return;
  }

  if (!b.time) {
    const part = times.filter((x) => inPart(x, b.dayPart));
    const list = spread(part.length ? part : times);
    s.stage = "book_time";
    s.offered = { date: b.date, times: list };
    const lead = part.length || !b.dayPart ? "" : "There's nothing free at that time of day, but ";
    replies.push(say(`${lead}${lead ? "on" : "On"} ${formatDate(b.date)} ${who ? `${who} has` : "I have"} these times for ${svc.name.toLowerCase()}:`, { quickReplies: list.map((x) => qr(x, `at ${x}`)) }));
    return;
  }

  // Time is free → lock the practitioner shown to the client
  const slot = avail.slots.find((x) => x.time === b.time)!;
  if (!b.practitionerId) b.practitionerId = slot.practitionerIds[0];
  s.offered = undefined;
  if (!s.name) {
    s.stage = "book_name";
    const p = ctx.catalog.practitioners.find((x) => x.id === b.practitionerId);
    replies.push(say(`${formatDate(b.date)} at ${b.time}${p ? ` with ${first(p.name)}` : ""} is free. Can I have your full name?`));
    return;
  }
  if (!s.phone) {
    s.stage = "book_phone";
    replies.push(say(`Great. And which phone number can we reach you on, ${s.name.split(" ")[0]}?`));
    return;
  }
  confirmBooking(ctx, s, replies);
}

function roleWord(c: Clinic) {
  return { massage: "therapist", hair: "stylist", chiropractic: "chiropractor", physio: "physiotherapist", dental: "dentist", beauty: "therapist", podiatry: "podiatrist" }[c.type];
}

function policyNote(c: Clinic) {
  const b = c.booking;
  return b.lateCancellationFee
    ? `Free rebooking/cancellation up to ${b.cancellationHours} h before – later: ${dkk(b.lateCancellationFee)}.`
    : `Free rebooking/cancellation up to ${b.cancellationHours} h before.`;
}

function confirmBooking(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const b = s.booking;
  const svc = service(ctx, b.serviceId);
  if (!svc || !b.date || !b.time) {
    s.stage = "book_date";
    replies.push(say("Which day would suit you?", { quickReplies: dateReplies(ctx) }));
    return { state: s, replies };
  }
  const p = ctx.catalog.practitioners.find((x) => x.id === b.practitionerId);
  s.stage = "book_confirm";
  const pending = ctx.clinic.booking.confirmNewClients && svc.newClientsOnly;
  replies.push(say(pending ? "Here's your request – shall I send it? The clinic confirms new patients personally." : "Shall I confirm this appointment?", {
    card: {
      type: "summary",
      lines: [
        { label: "Treatment", value: `${svc.name}` },
        { label: "When", value: `${formatDateShort(b.date)} · ${b.time}` },
        { label: "Duration", value: duration(svc.durationMinutes) },
        ...(p ? [{ label: roleWord(ctx.clinic).replace(/^\w/, (x) => x.toUpperCase()), value: p.name }] : []),
        { label: "Price", value: priceLabel(svc) },
        { label: "Name", value: `${s.name} · ${s.phone}` },
        ...(b.comment ? [{ label: "Note", value: b.comment }] : []),
      ],
      note: policyNote(ctx.clinic),
    },
    quickReplies: [qr("✓ Confirm", "Yes, confirm"), qr("Change time", "No, change the time")],
  }));
  return { state: s, replies };
}

// ------------------------------------------------ Rebooking / cancellation helpers

function fillManage(ctx: AssistantContext, s: AssistantState, input: string) {
  const m = (s.manage ??= {});
  m.date = parseDate(input, today(ctx)) ?? m.date;
  m.dayPart = parseDayPart(input) ?? m.dayPart;
}

async function lookup(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  try {
    const found = await ctx.api.lookup(s.manage!.reference!, s.phone!);
    s.manage = { ...s.manage, matches: found };
    if (found.length > 1) {
      s.stage = "manage_pick";
      replies.push(say("I found more than one appointment. Which one?", { quickReplies: found.map((a) => qr(`${a.serviceName} · ${formatDateShort(a.date)} ${a.time}`, a.reference)) }));
      return { state: s, replies };
    }
    s.manage.appointment = found[0];
    return nextManageStep(ctx, s, replies, true);
  } catch {
    s.stage = "manage_reference";
    replies.push(say("I couldn't find an upcoming appointment with that reference and phone number. Could you check the reference and try again?"));
    return { state: s, replies };
  }
}

async function nextManageStep(ctx: AssistantContext, s: AssistantState, replies: Reply[], justFound = false): Promise<{ state: AssistantState; replies: Reply[] }> {
  const m = s.manage!;
  const a = m.appointment!;
  const c = ctx.clinic;
  if (!m.intent) {
    s.stage = "manage_action";
    replies.push(say("I found your appointment. What would you like to do?", {
      card: { type: "appointment", appointment: a },
      quickReplies: [qr("🔄 Move it", "Move it"), qr("✕ Cancel it", "Cancel it")],
    }));
    return { state: s, replies };
  }
  const lead = justFound ? `Found it – ${a.serviceName} with ${first(a.practitionerName)} on ${formatDate(a.date)} at ${a.time}. ` : "";

  if (m.intent === "cancel") {
    const late = hoursUntil(a.date, a.time, ctx.now) < c.booking.cancellationHours;
    s.stage = "manage_cancel_confirm";
    replies.push(say(
      late && c.booking.lateCancellationFee
        ? `${lead}As it's less than ${c.booking.cancellationHours} hours before your appointment, our cancellation fee of ${dkk(c.booking.lateCancellationFee)} applies. Would you rather move it to another time instead?`
        : `${lead}Are you sure you want to cancel it? You're welcome to move it instead.`,
      { card: justFound ? { type: "appointment", appointment: a } : undefined, quickReplies: [qr("Cancel anyway", "Yes, cancel it"), qr("🔄 Move it instead", "Move it instead"), qr("Keep it", "No, keep it")] },
    ));
    return { state: s, replies };
  }

  // Move
  if (!m.date) {
    s.stage = "manage_date";
    replies.push(say(`${lead}Which day would you like to move it to?`, { quickReplies: dateReplies(ctx) }));
    return { state: s, replies };
  }
  let avail: AvailabilityResult;
  try {
    avail = await ctx.api.availability({ clinicId: c.id, serviceId: a.serviceId, date: m.date, practitionerId: a.practitionerId, excludeAppointmentId: a.id });
    if (!avail.slots.length) {
      // Same practitioner is full – try anyone qualified
      const anyone = await ctx.api.availability({ clinicId: c.id, serviceId: a.serviceId, date: m.date, excludeAppointmentId: a.id });
      if (anyone.slots.length) avail = anyone;
    }
  } catch (e) {
    s.stage = "manage_date";
    m.date = undefined;
    replies.push(say(`Sorry, I couldn't check the calendar: ${errText(e)}. Which day would you like?`, { quickReplies: dateReplies(ctx) }));
    return { state: s, replies };
  }
  const times = avail.slots.map((x) => x.time);
  if (!times.length) {
    const alt = avail.alternatives.flatMap((d) => d.times.slice(0, 2).map((time) => ({ date: d.date, time }))).slice(0, 4);
    s.stage = "manage_time";
    s.offered = avail.alternatives[0] ? { date: avail.alternatives[0].date, times: avail.alternatives[0].times } : undefined;
    replies.push(say(`${lead}${formatDate(m.date)} is fully booked. The next free times are:`, { quickReplies: alt.map((x) => qr(`${formatDateShort(x.date)} · ${x.time}`, `${x.date} at ${x.time}`)) }));
    m.date = undefined;
    return { state: s, replies };
  }
  const part = times.filter((x) => inPart(x, m.dayPart));
  const list = spread(part.length ? part : times);
  s.stage = "manage_time";
  s.offered = { date: m.date, times: list };
  const sameP = avail.slots.some((x) => x.practitionerIds.includes(a.practitionerId));
  replies.push(say(`${lead}On ${formatDate(m.date)} ${sameP ? `${first(a.practitionerName)} has` : "I have"} these times:`, { quickReplies: list.map((x) => qr(x, `at ${x}`)) }));
  return { state: s, replies };
}

async function moveAppointment(ctx: AssistantContext, s: AssistantState, replies: Reply[], date: string, time: string) {
  const a = s.manage!.appointment!;
  try {
    const updated = await ctx.api.updateAppointment(a.id, { date, time, phone: s.phone, source: ctx.source });
    Object.assign(s, initialState(), { name: s.name, phone: s.phone });
    replies.push(say(`Done ✓ Your ${updated.serviceName.toLowerCase()} is moved to ${formatDate(updated.date)} at ${updated.time} with ${first(updated.practitionerName)}. You'll get an updated confirmation.`, {
      card: { type: "appointment", appointment: updated, title: "Appointment moved" },
    }));
  } catch (e) {
    s.manage!.date = date;
    replies.push(say(`That time didn't work: ${errText(e)}.`));
    return nextManageStep(ctx, s, replies);
  }
  return { state: s, replies };
}

async function cancelAppointment(ctx: AssistantContext, s: AssistantState, replies: Reply[]) {
  const a = s.manage!.appointment!;
  try {
    const updated = await ctx.api.updateAppointment(a.id, { status: "cancelled", phone: s.phone, source: ctx.source });
    Object.assign(s, initialState(), { name: s.name, phone: s.phone });
    replies.push(say(`Your appointment ${updated.reference} is cancelled.${updated.lateCancellation && ctx.clinic.booking.lateCancellationFee ? ` As it was a late cancellation, the ${dkk(ctx.clinic.booking.lateCancellationFee)} fee applies.` : ""} Thanks for letting us know – would you like to book a new time?`, {
      card: { type: "appointment", appointment: updated, title: "Appointment cancelled" },
      quickReplies: [qr("📅 Book a new time", "I'd like to book an appointment"), qr("No thanks", "thanks")],
    }));
  } catch (e) {
    replies.push(say(`That didn't work: ${errText(e)}`));
  }
  return { state: s, replies };
}

// ------------------------------------------------ Questions

function answerQuestion(ctx: AssistantContext, t: string, raw: string, svc?: Service): Reply | null {
  const c = ctx.clinic;
  const faq = () => c.faq.find((f) => f.keywords.some((k) => t.includes(norm(k))));
  const bookIt = (x: Service) => [qr(`📅 Book ${x.name.toLowerCase()}`, `I'd like to book ${x.name}`)];

  if (has(t, "how much", "price", "cost", "prices", "fee", "expensive", "rates", "price list", "what do you charge") && !has(t, "cancellation fee", "cancel fee", "late fee", "no show")) {
    if (svc) {
      const ranked = rankServices(raw, ctx.catalog.services).slice(0, 3).map((r) => r.service);
      const related = ranked.length > 1 && ranked[1] && !/\d{2,3}\s*min/.test(t) ? ranked : [svc];
      if (related.length > 1)
        return say(`Here are the prices: ${related.map((x) => `${x.name} ${priceLabel(x)} (${duration(x.durationMinutes)})`).join(" · ")}.`, { card: { type: "prices", services: related }, quickReplies: bookIt(svc) });
      return say(`${svc.name} is ${priceLabel(svc)} for ${duration(svc.durationMinutes)}.${svc.priceFrom ? " The final price depends on your needs and is confirmed at the clinic." : ""} Would you like me to find a time?`, { quickReplies: bookIt(svc) });
    }
    const list = ctx.catalog.services.filter((x) => x.available);
    return say(`Here's our price list. Just tell me which treatment you'd like and I'll find a time.`, { card: { type: "prices", services: list }, quickReplies: serviceReplies(ctx).slice(0, 3) });
  }
  if (svc && has(t, "how long", "duration", "take", "minutes")) {
    return say(`${svc.name} takes ${duration(svc.durationMinutes)} and costs ${priceLabel(svc)}.`, { quickReplies: bookIt(svc) });
  }
  if (has(t, "what treatments", "which treatments", "what services", "which services", "what do you offer", "menu", "treatments do you", "services do you")) {
    return say(`We offer: ${ctx.catalog.services.filter((x) => x.available).map((x) => x.name).join(", ")}.`, { card: { type: "prices", services: ctx.catalog.services.filter((x) => x.available) } });
  }
  if (has(t, "insurance", "sygeforsikring", "danmark", "subsidy", "subsidised", "reimburse", "covered", "cover", "referral", "tryg", "skandia", "pfa", "health plan")) {
    const f = faq();
    const parts = [f && has(norm(f.question), "referral") && has(t, "referral") ? f.answer : "", c.insurance ?? ""].filter(Boolean);
    return say(parts.length ? parts.join(" ") : `We don't have an insurance agreement, but you're welcome to ask your insurer – we give you an itemised receipt.`, { quickReplies: [qr("📅 Book an appointment", "I'd like to book an appointment")] });
  }
  if (has(t, "cancellation", "cancel policy", "late fee", "no show", "noshow", "cancellation fee", "cancel fee", "how late can i")) {
    return say(c.booking.rules);
  }
  if (has(t, "open", "opening", "hours", "close", "closing", "when are you")) {
    const open = isOpenNow(c, ctx.now);
    return say(`${open ? "We're open right now." : "We're closed right now – but I can still book you in."} Opening hours: ${groupedHours(c).map((h) => `${h.label} ${h.value}`).join(" · ")}.`, {
      quickReplies: [qr("📅 Book an appointment", "I'd like to book an appointment")],
    });
  }
  if (has(t, "park", "parking", "car", "bus", "metro", "train", "wheelchair", "step free", "stairs", "elevator", "lift", "access")) return say(`${c.parking} You'll find us at ${c.address}, ${c.city}.`);
  if (has(t, "address", "where are you", "location", "located", "find you", "directions")) return say(`We're at ${c.address}, ${c.city}. ${c.parking}`);
  if (has(t, "pay", "payment", "mobilepay", "card", "cash", "invoice")) {
    const f = faq();
    return say(f ? f.answer : `You can pay by ${c.paymentMethods.join(", ").replace("mobilepay", "MobilePay")}.`);
  }
  if (has(t, "who works", "therapists", "staff", "team", "practitioners", "stylists", "dentists", "who is", "who are", "physio", "specialist") && !svc) {
    return say(`Our team: ${ctx.catalog.practitioners.filter((p) => p.active).map((p) => `${p.name} (${p.title.toLowerCase()})`).join(", ")}. Would you like to book with someone in particular?`, {
      quickReplies: ctx.catalog.practitioners.filter((p) => p.active).slice(0, 3).map((p) => qr(`Book with ${first(p.name)}`, `I'd like to book an appointment with ${p.name}`)),
    });
  }
  const f = faq();
  if (f) return say(f.answer, { quickReplies: [qr("📅 Book an appointment", "I'd like to book an appointment")] });
  return null;
}
