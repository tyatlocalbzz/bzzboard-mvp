import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

// GET /api/auth/check-first-login - Check if current user is on first login
export async function GET() {
  try {
    // Authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) {
      return ApiErrors.unauthorized()
    }

    // Get full user data from database
    const user = await getCurrentAuthUser()
    
    return ApiSuccess.ok({
      isFirstLogin: user.isFirstLogin,
      email: user.email,
      name: user.name
    })

  } catch (error) {
    console.error('❌ [Auth] Check first login error:', error)
    return ApiErrors.internalError('Failed to check first login status')
  }
} 