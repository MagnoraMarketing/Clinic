import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/server/admin-auth";

// Protects /admin when DEMO_MODE=false. In demo mode the admin is public (sales demo).
export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  if (url.pathname.startsWith("/admin")) {
    const demo = !["false", "0", "no", "off"].includes((process.env.DEMO_MODE ?? "true").toLowerCase());
    if (!demo && url.pathname !== "/admin/login") {
      const ok = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET ?? "");
      if (!ok) {
        const login = url.clone();
        login.pathname = "/admin/login";
        return NextResponse.redirect(login);
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
