import { NextResponse } from "next/server";

const PROTECTED = ["/play", "/dungeons", "/quests", "/inventory"];

/**
 * proxy.js — Next.js 16 edge proxy (replaces middleware.ts).
 * Gates the (game) routes behind a valid `mythoria_token` cookie.
 * The client-side layout.tsx provides a belt-and-suspenders check.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected) {
    const token = request.cookies.get("mythoria_token")?.value;
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
