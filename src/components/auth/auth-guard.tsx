'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useMemo, useRef } from 'react'
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
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingFirstLogin, setIsCheckingFirstLogin] = useState(false)
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false)
  const hasTriedRefresh = useRef(false)

  // Debug effect to track session changes
  useEffect(() => {
    // Handle post-login session sync issue
    if (status === 'unauthenticated' && pathname === '/' && !hasTriedRefresh.current) {
      console.log('🔄 [AuthGuard] Attempting session refresh...')
      hasTriedRefresh.current = true
      setIsManuallyRefreshing(true)
      
      // Try to manually update the session
      update().then((updatedSession) => {
        setIsManuallyRefreshing(false)
        if (!updatedSession) {
          // If manual refresh fails, redirect to signin
          router.push('/auth/signin')
        }
      }).catch((error) => {
        console.error('❌ [AuthGuard] Session refresh failed:', error)
        setIsManuallyRefreshing(false)
        router.push('/auth/signin')
      })
    }
  }, [session, status, pathname, router, update])

  // Reset refresh flag when leaving home page
  useEffect(() => {
    if (pathname !== '/') {
      hasTriedRefresh.current = false
    }
  }, [pathname])

  // Memoize route calculations to prevent useEffect dependency issues
  const routeInfo = useMemo(() => {
    const publicRoutes = ['/auth/signin', '/auth/signup']
    const authRoutes = ['/auth/first-login']
    
    return {
      isPublicRoute: publicRoutes.includes(pathname),
      isAuthRoute: authRoutes.includes(pathname)
    }
  }, [pathname])

  useEffect(() => {
    const handleAuthentication = async () => {
      // Skip if still loading session or manually refreshing
      if (status === 'loading' || isManuallyRefreshing) {
        return
      }

      // Handle unauthenticated users
      if (status === 'unauthenticated') {
        if (!routeInfo.isPublicRoute) {
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
        if (!routeInfo.isAuthRoute && !routeInfo.isPublicRoute) {
          setIsCheckingFirstLogin(true)
          
          try {
            const response = await fetch('/api/auth/check-first-login', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            })

            if (response.ok) {
              const data = await response.json()
              
              if (data.isFirstLogin) {
                router.push('/auth/first-login')
                return
              }
            } else {
              console.error('❌ [AuthGuard] First login check failed:', response.status)
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
  }, [session, status, pathname, router, routeInfo.isPublicRoute, routeInfo.isAuthRoute, isManuallyRefreshing])
  // Note: isCheckingFirstLogin is intentionally omitted from deps to prevent infinite loop
  // since it's set inside the effect

  // Show loading spinner while checking authentication or manually refreshing
  if (status === 'loading' || isCheckingFirstLogin || isManuallyRefreshing) {
    return fallback || <AuthLoadingFallback />
  }

  // Show nothing while redirecting unauthenticated users
  if (status === 'unauthenticated' && !routeInfo.isPublicRoute) {
    return fallback || <AuthLoadingFallback />
  }

  // Render children for authenticated users or public routes
  return <>{children}</>
}

/**
 * Default loading fallback component
 */
const AuthLoadingFallback = () => {
  return (
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
}

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