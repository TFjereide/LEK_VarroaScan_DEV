import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureAnonymousSession  } from "@/lib/auth/actions.server";
import { isAdmin } from "@/lib/auth/actions.server";
import { AppAuthError } from "./lib/auth/appAuthError";
// import { cookies } from 'next/headers';

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const {user, error} = await ensureAnonymousSession();
  if (user == null || error !== AppAuthError.Ok) {
    console.error("Error: somehow can't produce even an anonymous user! -> " + error)
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // dobbeltsjekker admin-path. Litt rart, men ok.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!(await isAdmin())) {
      console.log("Not admin -> redirect to /login");
      return NextResponse.redirect(new URL('/login?redirectedfrom=admin', request.url));
    }
    console.log("Is admin -> carry on");
  }

  return supabaseResponse;
}

export const config = {
  matcher: '/admin/:path*',
}