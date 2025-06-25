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

  // API routes should handle their own authentication and return JSON responses
  // Don't redirect API routes to signin page
  const isApiRoute = pathname.startsWith('/api/')
  
  // If user is authenticated and trying to access signin, redirect to dashboard
  if (isAuthenticated && pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow API routes to handle their own authentication
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Redirect to signin if not authenticated (only for page routes)
  if (!isAuthenticated) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check if authenticated user is on first login and needs to set password
  // Allow access to first-login page and auth-related API routes
  const isFirstLoginPage = pathname === '/auth/first-login'
  const isAuthChangePasswordApi = pathname === '/api/auth/change-password'
  const isAuthSetFirstPasswordApi = pathname === '/api/auth/set-first-password'
  const isAuthCheckFirstLoginApi = pathname === '/api/auth/check-first-login'
  
  if (isAuthenticated && req.auth?.user) {
    // Note: We can't access the database user data in middleware easily
    // So we'll handle the first-login redirect in the main layout or pages
    // For now, just allow access to first-login page and related APIs
    if (isFirstLoginPage || isAuthChangePasswordApi || isAuthSetFirstPasswordApi || isAuthCheckFirstLoginApi) {
      return NextResponse.next()
    }
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