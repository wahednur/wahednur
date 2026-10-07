import { NextResponse, type NextRequest } from "next/server";

// Fast, optimistic checks only. A cookie can be stale or half-finished (sign-up in progress),
// so the real decision is made on the server by AuthGate and by the API on every request.
const SESSION_COOKIE = "wn_sid";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in: keep people away from the sign-in and registration pages.
  // `reason` is set by AuthGate when a cookie turned out to be invalid, which prevents a loop.
  if ((pathname === "/login" || pathname === "/register") && hasSession && !searchParams.has("reason")) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/login", "/register"] };
