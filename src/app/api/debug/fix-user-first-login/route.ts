import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { fixUserFirstLoginFlag, getUserByIdEnhanced } from '@/lib/db/users-enhanced'

// POST /api/debug/fix-user-first-login - Fix isFirstLogin flag for users who haven't logged in (admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) return ApiErrors.unauthorized()
    if (sessionUser.role !== 'admin') return ApiErrors.forbidden()

    // Get full user data for activity logging
    const currentUser = await getCurrentAuthUser()

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return ApiErrors.badRequest('userId is required')
    }

    console.log(`🔧 [Fix User] Fixing isFirstLogin for user: ${userId}`)

    // Get current user data
    const userData = await getUserByIdEnhanced(userId)
    if (!userData) {
      return ApiErrors.notFound('User')
    }

    console.log(`👤 [Fix User] Current user data:`, {
      id: userData.id,
      email: userData.email,
      isFirstLogin: userData.isFirstLogin,
      lastLoginAt: userData.lastLoginAt,
      status: userData.status
    })

    // Fix the user using the enhanced function
    const updatedUser = await fixUserFirstLoginFlag(userId, currentUser.dbId!)

    console.log(`✅ [Fix User] User ${userId} fixed - isFirstLogin reset to true`)

    return ApiSuccess.ok({
      message: 'User isFirstLogin flag fixed',
      userId,
      before: {
        isFirstLogin: userData.isFirstLogin,
        lastLoginAt: userData.lastLoginAt
      },
      after: {
        isFirstLogin: updatedUser.isFirstLogin,
        lastLoginAt: updatedUser.lastLoginAt
      }
    })

  } catch (error) {
    console.error('❌ [Fix User] Error:', error)
    return ApiErrors.internalError('Failed to fix user')
  }
} 