import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/**
 * Signed-cookie session auth for /admin. /admin/login itself stays public
 * so the login form and its server action are reachable.
 */
export async function proxy(req: NextRequest) {
  if (!process.env.ADMIN_SESSION_SECRET) {
    return new NextResponse("ADMIN_SESSION_SECRET тохируулагдаагүй тул /admin хаалттай байна.", {
      status: 503,
    });
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(cookie);
  if (session) return NextResponse.next();

  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
