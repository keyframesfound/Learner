import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const BASE = "/learner";
const PUBLIC = ["/login", "/api/auth"];

export function middleware(req: NextRequest) {
  /* local design work needs the screens without a Google round trip */
  if (process.env.LEARNER_GATE === "off") return NextResponse.next();

  const raw = req.nextUrl.pathname;
  const path = raw.startsWith(BASE) ? raw.slice(BASE.length) || "/" : raw;

  if (PUBLIC.some((p) => path === p || path.startsWith(p + "/"))) return NextResponse.next();

  /* cheap check: a session cookie, not a database round trip */
  if (!getSessionCookie(req)) {
    /* plain Response: NextResponse.redirect re-applies basePath, and a relative
       Location is rejected when the URL is parsed. Apache forwards the host. */
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
    const location = proto + "://" + host + BASE + "/login";
    return new Response(null, { status: 307, headers: { location } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
