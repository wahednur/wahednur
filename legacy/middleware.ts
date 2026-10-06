import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!token && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
