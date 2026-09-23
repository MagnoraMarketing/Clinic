import type { NextRequest } from "next/server";
import { ApiError, handler, json, readJson } from "@/lib/server/http";
import { serverEnv } from "@/lib/server/env";
import { ADMIN_COOKIE, createSessionToken, safeEqual } from "@/lib/server/admin-auth";

/** POST /api/admin/session { password } – log in to /admin (only when DEMO_MODE=false). */
export const POST = handler(async (req: NextRequest) => {
  if (serverEnv.demoMode) return json({ ok: true, demo: true });
  if (!serverEnv.adminPassword || !serverEnv.adminSessionSecret) throw new ApiError(503, "ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set");
  const { password } = await readJson<{ password?: string }>(req);
  if (typeof password !== "string" || !safeEqual(password, serverEnv.adminPassword)) {
    await new Promise((r) => setTimeout(r, 600));
    throw new ApiError(401, "Wrong password");
  }
  const res = json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(serverEnv.adminSessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
  return res;
});

export const DELETE = handler(async () => {
  const res = json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
});
