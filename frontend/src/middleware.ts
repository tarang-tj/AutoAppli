import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/privacy",
  "/terms",
  "/api",       // API routes must never be auth-gated
] as const;

// Matches Google Search Console site-verification files at the root,
// e.g. /googlebbf6fa95789b3f0a.html. These MUST be served as the literal
// static file (not redirected to /login) or Google's crawler can't verify
// ownership.
const GOOGLE_VERIFY_RE = /^\/google[a-f0-9]+\.html$/i;

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (GOOGLE_VERIFY_RE.test(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|google[a-f0-9]+\\.html|login|signup|forgot-password|auth|privacy|terms|robots.txt|sitemap.xml|api).*)",
  ],
};
