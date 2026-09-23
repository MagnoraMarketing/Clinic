import { NextResponse, type NextRequest } from "next/server";
import { getClinic } from "@/lib/server/repository";

/**
 * GET /r/<slug> – the address written on the NFC review chip.
 * The chip never changes; the clinic manages the target (reviewUrl) in the admin.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/r/[slug]">) {
  const { slug } = await ctx.params;
  const c = await getClinic(slug);
  if (!c) return NextResponse.redirect(new URL("/", req.url));
  const target = c.reviewUrl && /^https:\/\//.test(c.reviewUrl) ? c.reviewUrl : new URL(`/demo/${c.slug}`, req.url).toString();
  return NextResponse.redirect(target, 302);
}
