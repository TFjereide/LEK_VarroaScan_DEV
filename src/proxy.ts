import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureAnonymousSession, isAdmin } from "@/lib/auth/actions";
import { AppAuthError } from "./lib/auth/appAuthError";
// import { cookies } from 'next/headers';


export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const {error} = await ensureAnonymousSession();
  if (error !== AppAuthError.Ok) {
    console.error(error)
    return new NextResponse("403: Not authorized", { status: 403 });
  }

  // dobbeltsjekker admin-path. Litt rart, men ok.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!(await isAdmin())) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: '/admin/:path*',
}