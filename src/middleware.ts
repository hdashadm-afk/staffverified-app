import { NextResponse, type NextRequest } from 'next/server'

// Auth redirect is handled in (dashboard)/layout.tsx via supabase.auth.getUser()
// Middleware just passes requests through — no Supabase client here (Edge Runtime incompatible)
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
