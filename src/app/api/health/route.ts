import { json } from "@/lib/server/http";
import { repo } from "@/lib/server/repository";
import { serverEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** GET /api/health – used by Vercel/monitoring. */
export async function GET() {
  return json({ ok: true, storage: repo().kind, demoMode: serverEnv.demoMode, time: new Date().toISOString() });
}
