import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Redirect to signin if not authenticated and trying to access protected routes
  if (!token && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Redirect away from auth pages if already authenticated
  if (token && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
