import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Call, Catalog, Clinic, Customer, Practitioner, Service } from "@/lib/types";
import { serverEnv } from "@/lib/server/env";
import { clinicNow } from "@/lib/hours";
import type { Repository, WebhookLogEntry } from "./types";

// Supabase implementation of Repository. Runs server-side only with the service
// role key (bypasses RLS) – so every query ALWAYS filters explicitly on clinic_id.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

let client: SupabaseClient<any, any, any> | null = null;
const db = () =>
  (client ??= createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: serverEnv.supabaseSchema },
  }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const CLINIC_SELECT = "*, clinic_settings(*), ai_agents(*)";
const one = (v: unknown): Row => ((Array.isArray(v) ? v[0] : v) as Row) ?? {};

function toClinic(r: Row): Clinic {
  const s = one(r.clinic_settings);
  const a = one(r.ai_agents);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    type: r.type,
    emoji: r.emoji,
    accentColor: r.accent_color,
    heroImage: r.hero_image,
    address: r.address,
    city: r.city,
    phone: a.phone_number || r.phone,
    email: r.email,
    parking: r.parking,
    insurance: r.insurance || undefined,
    reviewUrl: r.review_url || undefined,
    openingHours: s.opening_hours ?? [],
    booking: s.booking ?? {
      enabled: true, slotMinutes: 15, bufferMinutes: 10, minNoticeHours: 2, maxDaysAhead: 60,
      cancellationHours: 24, lateCancellationFee: 0, confirmNewClients: false, rules: "",
    },
    paymentMethods: s.payment_methods ?? ["card"],
    faq: s.faq ?? [],
    widget: {
      clinicId: r.id,
      agentId: a.agent_id ?? undefined,
      voiceAgentId: a.voice_agent_id ?? undefined,
      chatAgentId: a.chat_agent_id ?? undefined,
      theme: a.theme ?? "dark",
      accentColor: a.accent_color ?? r.accent_color,
      welcomeMessage: a.welcome_message ?? `Hi 👋 I'm the AI receptionist at ${r.name}.`,
      position: a.position ?? "bottom-right",
      enabled: a.enabled ?? true,
    },
  };
}

const num = (v: unknown) => Number(v ?? 0);

function toService(r: Row): Service {
  return {
    id: r.id,
    clinicId: r.clinic_id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    durationMinutes: r.duration_minutes,
    price: num(r.price),
    priceFrom: r.price_from || undefined,
    emoji: r.emoji,
    aliases: r.aliases ?? [],
    popular: r.popular || undefined,
    newClientsOnly: r.new_clients_only || undefined,
    available: r.available,
    practitionerIds: r.practitioner_ids ?? [],
  };
}

function toPractitioner(r: Row): Practitioner {
  return { id: r.id, clinicId: r.clinic_id, name: r.name, title: r.title, bio: r.bio, color: r.color, workDays: r.work_days ?? [], active: r.active };
}

function toAppointment(r: Row): Appointment {
  return {
    id: r.id,
    clinicId: r.clinic_id,
    reference: r.reference,
    source: r.source,
    status: r.status,
    date: r.date,
    time: String(r.time).slice(0, 5),
    durationMinutes: r.duration_minutes,
    serviceId: r.service_id,
    serviceName: r.service_name,
    practitionerId: r.practitioner_id,
    practitionerName: r.practitioner_name,
    price: num(r.price),
    customer: { name: r.customer_name, phone: r.customer_phone, email: r.customer_email ?? undefined },
    newClient: r.new_client,
    comment: r.comment ?? undefined,
    changes: r.changes ?? [],
    cancelledAt: r.cancelled_at ?? undefined,
    lateCancellation: r.late_cancellation || undefined,
    externalRefs: r.external_refs ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function fromAppointment(a: Partial<Appointment>): Row {
  const row: Row = {};
  if (a.id !== undefined) row.id = a.id;
  if (a.clinicId !== undefined) row.clinic_id = a.clinicId;
  if (a.reference !== undefined) row.reference = a.reference;
  if (a.source !== undefined) row.source = a.source;
  if (a.status !== undefined) row.status = a.status;
  if (a.date !== undefined) row.date = a.date;
  if (a.time !== undefined) row.time = a.time;
  if (a.durationMinutes !== undefined) row.duration_minutes = a.durationMinutes;
  if (a.serviceId !== undefined) row.service_id = a.serviceId;
  if (a.serviceName !== undefined) row.service_name = a.serviceName;
  if (a.practitionerId !== undefined) row.practitioner_id = a.practitionerId;
  if (a.practitionerName !== undefined) row.practitioner_name = a.practitionerName;
  if (a.price !== undefined) row.price = a.price;
  if (a.customer !== undefined) {
    row.customer_name = a.customer.name;
    row.customer_phone = a.customer.phone;
    row.customer_email = a.customer.email ?? null;
  }
  if (a.newClient !== undefined) row.new_client = a.newClient;
  if (a.comment !== undefined) row.comment = a.comment ?? null;
  if (a.changes !== undefined) row.changes = a.changes;
  if (a.cancelledAt !== undefined) row.cancelled_at = a.cancelledAt;
  if (a.lateCancellation !== undefined) row.late_cancellation = a.lateCancellation;
  if (a.externalRefs !== undefined) row.external_refs = a.externalRefs;
  if (a.createdAt !== undefined) row.created_at = a.createdAt;
  return row;
}

function toCall(r: Row): Call {
  return {
    id: r.id,
    clinicId: r.clinic_id,
    from: r.from_number,
    channel: r.channel,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    outcome: r.outcome,
    summary: r.summary,
    transcript: r.transcript ?? [],
    appointmentId: r.appointment_id ?? undefined,
  };
}

export const supabaseRepository: Repository = {
  kind: "supabase",

  async listClinics() {
    const rows = check(await db().from("clinics").select(CLINIC_SELECT).eq("active", true).order("name"));
    return (rows as Row[]).map(toClinic);
  },
  async getClinic(idOrSlug) {
    const col = UUID.test(idOrSlug) ? "id" : "slug";
    const row = check(await db().from("clinics").select(CLINIC_SELECT).eq(col, idOrSlug).maybeSingle());
    return row ? toClinic(row as Row) : null;
  },
  async updateClinic(id, patch) {
    const base: Row = {};
    const map: [keyof Clinic, string][] = [
      ["name", "name"], ["tagline", "tagline"], ["description", "description"], ["address", "address"], ["city", "city"],
      ["phone", "phone"], ["email", "email"], ["parking", "parking"], ["accentColor", "accent_color"], ["reviewUrl", "review_url"], ["insurance", "insurance"],
    ];
    for (const [k, col] of map) if (patch[k] !== undefined) base[col] = patch[k];
    if (Object.keys(base).length) check(await db().from("clinics").update({ ...base, updated_at: new Date().toISOString() }).eq("id", id));

    const settings: Row = {};
    if (patch.openingHours) settings.opening_hours = patch.openingHours;
    if (patch.booking) settings.booking = patch.booking;
    if (patch.paymentMethods) settings.payment_methods = patch.paymentMethods;
    if (patch.faq) settings.faq = patch.faq;
    if (Object.keys(settings).length) check(await db().from("clinic_settings").upsert({ clinic_id: id, ...settings }));

    if (patch.widget) {
      const w = patch.widget;
      check(
        await db().from("ai_agents").upsert({
          clinic_id: id,
          agent_id: w.agentId ?? null,
          voice_agent_id: w.voiceAgentId ?? null,
          chat_agent_id: w.chatAgentId ?? null,
          theme: w.theme,
          accent_color: w.accentColor,
          welcome_message: w.welcomeMessage,
          position: w.position,
          enabled: w.enabled,
        }),
      );
    }
    return this.getClinic(id);
  },

  async getCatalog(clinicId): Promise<Catalog> {
    const [cats, svcs, staff] = await Promise.all([
      db().from("service_categories").select("*").eq("clinic_id", clinicId).order("sort_order"),
      db().from("services").select("*").eq("clinic_id", clinicId).order("sort_order"),
      db().from("practitioners").select("*").eq("clinic_id", clinicId).order("sort_order"),
    ]);
    return {
      categories: (check(cats) as Row[]).map((c) => ({ id: c.id, clinicId: c.clinic_id, name: c.name, emoji: c.emoji, sortOrder: c.sort_order })),
      services: (check(svcs) as Row[]).map(toService),
      practitioners: (check(staff) as Row[]).map(toPractitioner),
    };
  },
  async updateService(clinicId, serviceId, patch) {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.price !== undefined) row.price = patch.price;
    if (patch.priceFrom !== undefined) row.price_from = patch.priceFrom;
    if (patch.durationMinutes !== undefined) row.duration_minutes = patch.durationMinutes;
    if (patch.available !== undefined) row.available = patch.available;
    if (patch.popular !== undefined) row.popular = patch.popular;
    if (patch.practitionerIds !== undefined) row.practitioner_ids = patch.practitionerIds;
    const r = check(await db().from("services").update(row).eq("clinic_id", clinicId).eq("id", serviceId).select().maybeSingle());
    return r ? toService(r as Row) : null;
  },
  async updatePractitioner(clinicId, practitionerId, patch) {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.workDays !== undefined) row.work_days = patch.workDays;
    if (patch.active !== undefined) row.active = patch.active;
    const r = check(await db().from("practitioners").update(row).eq("clinic_id", clinicId).eq("id", practitionerId).select().maybeSingle());
    return r ? toPractitioner(r as Row) : null;
  },

  async listAppointments(clinicId, opts = {}) {
    let q = db().from("appointments").select("*").eq("clinic_id", clinicId);
    if (opts.date) q = q.eq("date", opts.date);
    if (opts.from) q = q.gte("date", opts.from);
    if (opts.to) q = q.lte("date", opts.to);
    const rows = check(await q.order("date").order("time").limit(2000));
    return (rows as Row[]).map(toAppointment);
  },
  async getAppointment(id) {
    if (!UUID.test(id)) return null;
    const r = check(await db().from("appointments").select("*").eq("id", id).maybeSingle());
    return r ? toAppointment(r as Row) : null;
  },
  async insertAppointment(a) {
    const res = await db().from("appointments").insert(fromAppointment(a)).select().single();
    // 23P01 = exclusion violation: the practitioner was booked by someone else a moment ago
    if (res.error?.code === "23P01") throw new Error("That time was just taken – please pick another");
    return toAppointment(check(res) as Row);
  },
  async updateAppointment(id, patch) {
    const res = await db().from("appointments").update({ ...fromAppointment(patch), updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle();
    if (res.error?.code === "23P01") throw new Error("That time was just taken – please pick another");
    const r = check(res);
    return r ? toAppointment(r as Row) : null;
  },

  async listCustomers(clinicId) {
    const rows = (check(await db().from("appointments").select("*").eq("clinic_id", clinicId).limit(5000)) as Row[]).map(toAppointment);
    const today = clinicNow().date;
    const map = new Map<string, Customer>();
    for (const a of rows) {
      const key = a.customer.phone.replace(/\D/g, "").slice(-8) || a.customer.name;
      const c = map.get(key) ?? { id: key, clinicId, name: a.customer.name, phone: a.customer.phone, email: a.customer.email, visitCount: 0, upcomingCount: 0, cancellationCount: 0, totalSpent: 0, lastSeenAt: a.createdAt };
      if (a.updatedAt > c.lastSeenAt) c.lastSeenAt = a.updatedAt;
      if (a.status === "cancelled" || a.status === "no_show") c.cancellationCount++;
      else if (a.status === "completed" || a.date < today) {
        c.visitCount++;
        c.totalSpent += a.price;
      } else c.upcomingCount++;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  },

  async listCalls(clinicId, limit = 100) {
    const rows = check(await db().from("calls").select("*").eq("clinic_id", clinicId).order("started_at", { ascending: false }).limit(limit));
    return (rows as Row[]).map(toCall);
  },
  async insertCall(c) {
    const r = check(
      await db()
        .from("calls")
        .insert({
          id: c.id,
          clinic_id: c.clinicId,
          from_number: c.from,
          channel: c.channel,
          started_at: c.startedAt,
          duration_sec: c.durationSec,
          outcome: c.outcome,
          summary: c.summary,
          transcript: c.transcript,
          appointment_id: c.appointmentId && UUID.test(c.appointmentId) ? c.appointmentId : null,
        })
        .select()
        .single(),
    );
    return toCall(r as Row);
  },

  async logWebhook(entry) {
    await db().from("webhook_log").insert({
      clinic_id: entry.clinicId,
      direction: entry.direction,
      event: entry.event,
      target: entry.target,
      status: entry.status,
      detail: entry.detail ?? null,
    });
  },
  async listWebhookLog(clinicId, limit = 50) {
    let q = db().from("webhook_log").select("*").order("created_at", { ascending: false }).limit(limit);
    if (clinicId) q = q.eq("clinic_id", clinicId);
    return (check(await q) as Row[]).map(
      (r): WebhookLogEntry => ({ id: r.id, clinicId: r.clinic_id, direction: r.direction, event: r.event, target: r.target, status: r.status, detail: r.detail ?? undefined, createdAt: r.created_at }),
    );
  },
};
