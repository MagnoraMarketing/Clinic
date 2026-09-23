import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/server/env";
import { ADMIN_COOKIE, verifyApiKey, verifySessionToken } from "@/lib/server/admin-auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

/** Wrapper that turns errors into clean JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message, details: e.details }, e.status);
      console.error("[api]", e);
      return json({ error: "Internal server error" }, 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON in request body");
  }
}

/** Does the caller have admin rights? (API key, admin cookie or demo mode) */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  if (serverEnv.demoMode) return true;
  if (verifyApiKey(req.headers.get("authorization"), serverEnv.adminApiKey)) return true;
  if (verifyApiKey(req.headers.get("x-api-key"), serverEnv.adminApiKey)) return true;
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, serverEnv.adminSessionSecret);
}

export async function requireAdmin(req: NextRequest) {
  if (!(await isAdmin(req))) throw new ApiError(401, "Admin access required (Authorization: Bearer <ADMIN_API_KEY>)");
}

/** Trusted integrations (AIbooking Voice, practice systems) may e.g. look up bookings by caller ID. */
export function isTrustedIntegration(req: NextRequest): boolean {
  const h = req.headers.get("authorization") ?? req.headers.get("x-api-key");
  return verifyApiKey(h, serverEnv.aibookingApiKey) || verifyApiKey(h, serverEnv.adminApiKey);
}
