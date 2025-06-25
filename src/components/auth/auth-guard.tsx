'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Comprehensive authentication guard that handles:
 * 1. Loading states
 * 2. Unauthenticated users (redirect to signin)
 * 3. First-time users (redirect to password setup)
 * 4. Authenticated users (allow access)
 */
export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingFirstLogin, setIsCheckingFirstLogin] = useState(false)

  // Routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Auth-related routes that need special handling
  const authRoutes = ['/auth/first-login']
  const isAuthRoute = authRoutes.includes(pathname)

  useEffect(() => {
    const handleAuthentication = async () => {
      // Skip if still loading session
      if (status === 'loading') return

      // Handle unauthenticated users
      if (status === 'unauthenticated') {
        if (!isPublicRoute) {
          const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`
          router.push(signInUrl)
        }
        return
      }

      // Handle authenticated users
      if (status === 'authenticated' && session?.user) {
        // Redirect away from signin if already authenticated
        if (pathname === '/auth/signin') {
          const urlParams = new URLSearchParams(window.location.search)
          const callbackUrl = urlParams.get('callbackUrl')
          const redirectUrl = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/'
          router.push(redirectUrl)
          return
        }

        // Check first-login status for non-auth routes
        if (!isAuthRoute && !isPublicRoute) {
          setIsCheckingFirstLogin(true)
          
          try {
            const response = await fetch('/api/auth/check-first-login', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            })

            if (response.ok) {
              const data = await response.json()
              
              if (data.isFirstLogin) {
                console.log('🔒 [AuthGuard] Redirecting first-time user to password setup')
                router.push('/auth/first-login')
                return
              }
            }
          } catch (error) {
            console.error('❌ [AuthGuard] Error checking first login status:', error)
          } finally {
            setIsCheckingFirstLogin(false)
          }
        }
      }
    }

    handleAuthentication()
  }, [session, status, pathname, router, isPublicRoute, isAuthRoute])

  // Show loading spinner while checking authentication
  if (status === 'loading' || isCheckingFirstLogin) {
    return fallback || <AuthLoadingFallback />
  }

  // Show nothing while redirecting unauthenticated users
  if (status === 'unauthenticated' && !isPublicRoute) {
    return fallback || <AuthLoadingFallback />
  }

  // Render children for authenticated users or public routes
  return <>{children}</>
}

/**
 * Default loading fallback component
 */
const AuthLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Loading Buzzboard
        </h3>
        <p className="text-sm text-gray-600">
          Checking your authentication status...
        </p>
      </div>
    </div>
  </div>
)

/**
 * Higher-order component for page-level authentication protection
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode
    requireAuth?: boolean
  }
) => {
  const WrappedComponent = (props: P) => {
    if (options?.requireAuth === false) {
      return <Component {...props} />
    }

    return (
      <AuthGuard fallback={options?.fallback}>
        <Component {...props} />
      </AuthGuard>
    )
  }

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return WrappedComponent
} 