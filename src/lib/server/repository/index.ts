import { isSupabaseConfigured, serverEnv } from "@/lib/server/env";
import { isPlaceholderPhone } from "@/lib/format";
import type { Clinic } from "@/lib/types";
import { memoryRepository } from "./memory";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";

export type { Repository, WebhookLogEntry } from "./types";

export const repo = (): Repository => (isSupabaseConfigured() ? supabaseRepository : memoryRepository);

/**
 * The phone number comes from the database/config – never hardcoded in components.
 * In demo mode AIBOOKING_DEMO_PHONE can replace placeholder numbers, so "Call the demo"
 * points to the real AI phone line.
 */
function withPhone(c: Clinic): Clinic {
  if (serverEnv.demoPhone && isPlaceholderPhone(c.phone)) return { ...c, phone: serverEnv.demoPhone };
  return c;
}

export async function getClinic(idOrSlug: string): Promise<Clinic | null> {
  const c = await repo().getClinic(idOrSlug);
  return c ? withPhone(c) : null;
}

export async function listClinics(): Promise<Clinic[]> {
  return (await repo().listClinics()).map(withPhone);
}

export async function getDefaultClinic(): Promise<Clinic> {
  const c = (await getClinic(serverEnv.defaultClinicSlug)) ?? (await listClinics())[0];
  if (!c) throw new Error("No clinics found – run supabase/seed.sql or use demo mode.");
  return c;
}

/** The number for "Call the demo" on the landing page. */
export async function getDemoPhone(): Promise<string> {
  if (serverEnv.demoPhone) return serverEnv.demoPhone;
  return (await getDefaultClinic()).phone;
}
