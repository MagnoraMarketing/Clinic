import type { NextRequest } from "next/server";
import { handler, json, requireAdmin } from "@/lib/server/http";
import { integrationStatuses } from "@/lib/server/integrations";

/** GET /api/integrations (admin) – which integrations are configured (without revealing keys). */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  return json({ data: integrationStatuses() });
});
