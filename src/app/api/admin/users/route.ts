
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getAllUsersEnhanced } from '@/lib/db/users-enhanced'

// GET /api/admin/users - Get all users (admin only)
export async function GET() {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    console.log(`📊 [Admin Users API] Fetching all users for admin: ${user.email}`)

    // Get all users with enhanced data
    const users = await getAllUsersEnhanced()

    console.log(`✅ [Admin Users API] Retrieved ${users.length} users`)

    return ApiSuccess.ok({
      users
    }, `Retrieved ${users.length} users`)

  } catch (error) {
    console.error('❌ [Admin Users API] Error fetching users:', error)
    return ApiErrors.internalError('Failed to fetch users')
  }
} 