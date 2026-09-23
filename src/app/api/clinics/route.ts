import { handler, json } from "@/lib/server/http";
import { listClinics } from "@/lib/server/repository";
import { toPublicClinic } from "@/lib/server/public";

/** GET /api/clinics – public information about active clinics. */
export const GET = handler(async () => json({ data: (await listClinics()).map(toPublicClinic) }));
