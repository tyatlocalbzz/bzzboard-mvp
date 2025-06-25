import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { ApiErrors, ApiSuccess, validateId } from '@/lib/api/api-helpers'
import { getUserActivities } from '@/lib/db/users-enhanced'

// GET /api/admin/users/[id]/activity - Get user activities (admin only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) {
      return ApiErrors.unauthorized()
    }
    if (sessionUser.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    // Validate parameters
    const { id } = await params
    const userId = validateId(id, 'User')

    console.log(`📊 [Admin User Activity] Admin ${sessionUser.email} fetching activities for user: ${userId}`)

    // Get user activities
    const activities = await getUserActivities(userId)

    console.log(`✅ [Admin User Activity] Retrieved ${activities.length} activities for user ${userId}`)

    return ApiSuccess.ok(
      { 
        activities,
        userId
      },
      `Retrieved ${activities.length} activities`
    )

  } catch (error) {
    console.error('❌ [Admin User Activity] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
    }

    return ApiErrors.internalError('Failed to fetch user activities')
  }
} 