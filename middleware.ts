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
    /* a relative Location keeps the public prefix intact behind the proxy,
       and avoids Next re-applying basePath to an absolute URL */
    return new NextResponse(null, { status: 307, headers: { location: BASE + "/login" } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
