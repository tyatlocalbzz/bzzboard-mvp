import { getCurrentUser } from './session'
import { getUserByEmail } from '@/lib/db/users'
import { AuthUser } from './types'
import { redirect } from 'next/navigation'

/**
 * Get the current authenticated user with full database information
 * This combines session validation with database user fetching
 */
export const getCurrentAuthUser = async (): Promise<AuthUser> => {
  const sessionUser = await getCurrentUser()
  
  // Get full user data from database
  const dbUser = await getUserByEmail(sessionUser.email!)
  if (!dbUser) {
    // Session is valid but user doesn't exist in DB (should not happen)
    redirect('/auth/signin')
  }

  // Return user with NextAuth-compatible string ID
  return {
    ...dbUser,
    id: dbUser.id.toString(),
    dbId: dbUser.id,
  }
}

/**
 * Get current user without redirecting (for conditional rendering)
 */
export const getCurrentAuthUserOptional = async (): Promise<AuthUser | null> => {
  try {
    return await getCurrentAuthUser()
  } catch {
    return null
  }
} 