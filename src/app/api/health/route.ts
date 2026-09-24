import { json } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** GET /api/health – used by Vercel/monitoring. Also checks that the database answers. */
export async function GET() {
  const r = repo();
  let database: { ok: boolean; clinics?: number; schema?: string; error?: string };
  try {
    database = { ok: true, clinics: (await r.listClinics()).length };
  } catch (e) {
    database = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (r.kind === "supabase") database.schema = serverEnv.supabaseSchema;
  return json(
    { ok: database.ok, storage: r.kind, database, demoMode: serverEnv.demoMode, time: new Date().toISOString() },
    database.ok ? 200 : 503,
  );
}
