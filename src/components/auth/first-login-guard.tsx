'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FirstLoginGuardProps {
  children: React.ReactNode
}

/**
 * Client-side guard that redirects first-time users to password change page
 * This runs after authentication but checks if user needs to set their password
 */
export const FirstLoginGuard = ({ children }: FirstLoginGuardProps) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkFirstLogin = async () => {
      // Skip check if not authenticated or still loading
      if (status === 'loading' || status === 'unauthenticated') {
        setIsChecking(false)
        return
      }

      // Skip check if already on first-login page or auth pages
      const isFirstLoginPage = pathname === '/auth/first-login'
      const isAuthPage = pathname.startsWith('/auth/')
      const isApiRoute = pathname.startsWith('/api/')
      
      if (isFirstLoginPage || isAuthPage || isApiRoute) {
        setIsChecking(false)
        return
      }

      // Check if user needs to set password
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/auth/check-first-login', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            
            if (data.isFirstLogin) {
              console.log('🔒 [FirstLoginGuard] Redirecting first-time user to password setup')
              router.push('/auth/first-login')
              return
            }
          }
        } catch (error) {
          console.error('❌ [FirstLoginGuard] Error checking first login status:', error)
        }
      }

      setIsChecking(false)
    }

    checkFirstLogin()
  }, [session, status, pathname, router])

  // Show loading while checking first login status
  if (isChecking && status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
} 