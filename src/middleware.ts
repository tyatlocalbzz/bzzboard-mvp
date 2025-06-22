import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const pathname = req.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )

  // If user is authenticated and trying to access signin, redirect to dashboard
  if (isAuthenticated && pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 