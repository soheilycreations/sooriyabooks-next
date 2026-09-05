import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const VISITOR_COOKIE = "sb_visitor_id";

/**
 * Records one storefront page view for the admin dashboard's traffic
 * stats — fire-and-forget via event.waitUntil() so it never delays the
 * response. Skips anything that isn't a real full-page visit: admin/
 * account/api routes (not "traffic" in the customer-facing sense), and
 * React Server Component data requests / prefetches, which the App
 * Router fires constantly during normal navigation and would otherwise
 * multiply-count a single visit.
 */
function trackPageView(request: NextRequest, event: NextFetchEvent, response: NextResponse) {
  const path = request.nextUrl.pathname;
  if (request.method !== "GET") return;
  if (path.startsWith("/admin") || path.startsWith("/account") || path.startsWith("/api")) return;
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch")) return;

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  event.waitUntil(
    fetch(`${url}/rest/v1/page_views`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, visitor_id: visitorId }),
    }).catch((err) => console.error("trackPageView failed:", err)),
  );
}

/**
 * Session refresh + coarse route gating. Fine-grained authorization still
 * happens at the database via RLS (docs/architecture.md §4) — this layer
 * only avoids rendering protected shells for obviously unauthenticated
 * requests, as a UX/perf optimization, not the security boundary itself.
 */
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isAccountRoute = path.startsWith("/account");

  if ((isAdminRoute || isAccountRoute) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  trackPageView(request, event, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif)$).*)",
  ],
};
