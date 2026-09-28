import { NextRequest } from "next/server";
import {NextResponse } from "next/server";
import { getClient } from "@/lib/auth/server";
// import { cookies } from 'next/headers';

// TODO: replace this
function isAdmin(id:string){return false;}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  const supabase = await getClient();
  const {data} = await supabase.auth.getClaims();
  const user = data?.claims;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
 
  return supabaseResponse;
}

// export const config = {
//   matcher: '/admin/:path*',
// }