import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/today") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/materials") ||
    pathname.startsWith("/nihuyasi");
  const isLogin = pathname === COCKPIT_LOGIN_PATH;

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = COCKPIT_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/documents";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
