import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureAnonymousSession, getCurrentUser  } from "@/lib/auth/actions.server";
import { AppAuthError } from "./lib/auth/appAuthError";
import { isAdmin } from "./lib/auth/roles.client";
// import { cookies } from 'next/headers';

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const {user, error} = await getCurrentUser();
  if (user == null || error !== AppAuthError.Ok) {
    console.error("Error: somehow can't produce even an anonymous user! -> " + error)
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // dobbeltsjekker admin-path. Litt rart, men ok.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAdmin(user.role)) {
      console.log("Not admin -> redirect to /login");
      return NextResponse.redirect(new URL('/login?redirectedfrom=admin', request.url));
    }
    console.log("Proxy: admin access granted");
  }

  return supabaseResponse;
}

export const config = {
  matcher: '/admin/:path*',
}