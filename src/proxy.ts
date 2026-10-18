import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureAnonymousSession, isAdmin } from "@/lib/auth/actions";
import { AppAuthError } from "./lib/auth/appAuthError";
// import { cookies } from 'next/headers';


export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const {user, error} = await ensureAnonymousSession();
  if (user == null || error !== AppAuthError.Ok) {
    console.error("Error:" + error)

    console.log("somehow can't produce even an anonymous user!");
    return NextResponse.redirect(new URL('/login', request.url));
    // return new NextResponse("403: Not authorized", { status: 403 });
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