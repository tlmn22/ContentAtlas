import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, computeSessionToken } from "@/lib/admin-auth";

/**
 * Cookie-session auth for /admin. /admin/login itself stays public so the
 * login form and its server action are reachable.
 */
export async function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("ADMIN_PASSWORD тохируулагдаагүй тул /admin хаалттай байна.", {
      status: 503,
    });
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const expected = await computeSessionToken(password);
  if (cookie === expected) return NextResponse.next();

  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
