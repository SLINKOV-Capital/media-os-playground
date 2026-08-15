import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const INTERNAL_PREFIXES = [
  "/today",
  "/templates",
  "/documents",
  "/materials",
  "/nihuyasi",
] as const;

const LEGACY_PUBLIC_PATHS = [
  "/articles",
  "/stories",
  "/books",
  "/plays",
  "/video",
  "/videos",
  "/glossary",
  "/presentations",
  "/consulting",
] as const;

function isPathOrChild(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isInternalPath(pathname: string): boolean {
  return (
    pathname === "/slinkov-cockpit-login" ||
    INTERNAL_PREFIXES.some((prefix) => isPathOrChild(pathname, prefix))
  );
}

function isExplicitPublicPath(pathname: string): boolean {
  return (
    isPathOrChild(pathname, "/ru") ||
    isPathOrChild(pathname, "/p") ||
    LEGACY_PUBLIC_PATHS.some((path) => pathname === path)
  );
}

function redirectToHost(request: NextRequest, hostname: string) {
  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.hostname = hostname;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const hostname = (
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    request.nextUrl.hostname
  ).split(":")[0];
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = hostname === "app.soloten.com" ? "/documents" : "/ru";
    return NextResponse.redirect(url, 308);
  }

  if (hostname === "soloten.com" && isInternalPath(pathname)) {
    return redirectToHost(request, "app.soloten.com");
  }

  if (hostname === "app.soloten.com") {
    if (isExplicitPublicPath(pathname)) {
      return redirectToHost(request, "soloten.com");
    }
  }

  const response = await updateSession(request);
  if (hostname === "app.soloten.com") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
