import { auth } from './index'
import { redirect } from 'next/navigation'
import { cache } from 'react'

/**
 * Get the current session (cached for the request)
 * Returns null if not authenticated
 */
export const getSession = cache(async () => {
  const session = await auth()
  return session
})

/**
 * Get the current session user or redirect to signin
 * Use this for pages that require authentication
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  return session.user
})

/**
 * Check if user is authenticated (for conditional rendering)
 * Returns boolean without redirecting
 */
export const isAuthenticated = cache(async () => {
  const session = await getSession()
  return !!session?.user
})

// Get session on client side
export const getClientSession = () => {
  if (typeof window === 'undefined') {
    throw new Error('getClientSession can only be called on the client side')
  }
  // This would be used with SessionProvider context
  return null
} 