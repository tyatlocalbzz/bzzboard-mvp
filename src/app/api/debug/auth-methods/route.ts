import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllUsers, getUserAuthMethod } from '@/lib/db/users'

/**
 * Debug endpoint to check user authentication methods
 * Helps admins understand which users are using OAuth vs credentials
 */
export async function GET() {
  try {
    // Check if user is authenticated and is admin
    const currentUser = await getCurrentUserForAPI()
    if (!currentUser?.email) {
      return ApiErrors.unauthorized()
    }
    
    if (currentUser.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    // Get all users and their auth methods
    const users = await getAllUsers()
    
    const userAuthMethods = await Promise.all(
      users.map(async (user) => {
        const authMethod = await getUserAuthMethod(user.email)
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          authMethod,
          isFirstLogin: user.isFirstLogin,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        }
      })
    )

    // Generate summary statistics
    const stats = {
      total: userAuthMethods.length,
      credentials: userAuthMethods.filter(u => u.authMethod === 'credentials').length,
      oauth: userAuthMethods.filter(u => u.authMethod === 'oauth').length,
      firstTimeUsers: userAuthMethods.filter(u => u.isFirstLogin).length,
      activeUsers: userAuthMethods.filter(u => u.status === 'active').length,
      admins: userAuthMethods.filter(u => u.role === 'admin').length
    }

    return ApiSuccess.ok({
      users: userAuthMethods,
      stats,
      message: 'User authentication methods retrieved successfully'
    })

  } catch (error) {
    console.error('❌ [Debug] Error fetching user auth methods:', error)
    return ApiErrors.internalError('Failed to fetch user authentication methods')
  }
} 