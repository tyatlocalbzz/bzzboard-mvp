import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const pathname = req.nextUrl.pathname

  // Define route categories for better organization
  const publicRoutes = [
    '/auth/signin',
    '/auth/signup', // For future registration
  ]
  
  const authApiRoutes = [
    '/api/auth/signin',
    '/api/auth/callback',
    '/api/auth/csrf',
    '/api/auth/session',
    '/api/auth/providers',
  ]

  const protectedAuthRoutes = [
    '/auth/first-login',
  ]

  // Check route types
  const isPublicRoute = publicRoutes.some(route => pathname === route)
  const isAuthApiRoute = authApiRoutes.some(route => pathname.startsWith(route))
  const isProtectedAuthRoute = protectedAuthRoutes.some(route => pathname === route)
  const isApiRoute = pathname.startsWith('/api/')

  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Handle authenticated user trying to access signin
  if (isAuthenticated && pathname === '/auth/signin') {
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl')
    const redirectUrl = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/'
    return NextResponse.redirect(new URL(redirectUrl, req.url))
  }

  // Allow public routes (signin, signup, etc.)
  if (isPublicRoute || isAuthApiRoute) {
    return response
  }

  // Protected auth routes require authentication but have special handling
  if (isProtectedAuthRoute) {
    if (!isAuthenticated) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    return response
  }

  // API routes handle their own authentication (return JSON, not redirects)
  if (isApiRoute) {
    return response
  }

  // All other routes require authentication
  if (!isAuthenticated) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return response
})

// Comprehensive matcher that protects all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
} 