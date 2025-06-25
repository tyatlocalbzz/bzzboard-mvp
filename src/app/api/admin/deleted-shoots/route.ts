import { NextRequest } from 'next/server'
import { getDeletedShoots, restoreShoot } from '@/lib/db/shoots'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface RestoreShootBody {
  shootId: number
  action: string
}

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

    // Get deleted shoots
    const deletedShoots = await getDeletedShoots()

    // Transform for frontend
    const transformedShoots = deletedShoots.map(shoot => ({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client?.name || 'Unknown Client',
      scheduledAt: shoot.scheduledAt.toISOString(),
      duration: shoot.duration,
      location: shoot.location || '',
      status: shoot.status,
      deletedAt: shoot.deletedAt?.toISOString(),
      deletedBy: shoot.deletedBy,
      postIdeasCount: shoot.postIdeasCount
    }))

    return ApiSuccess.ok({
      deletedShoots: transformedShoots
    })

  } catch (error) {
    console.error('❌ [Admin API] Get deleted shoots error:', error)
    return ApiErrors.internalError('Failed to fetch deleted shoots')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    const body = await getValidatedBody<RestoreShootBody>(request)
    const { shootId, action } = body

    if (!shootId || !action) {
      return ApiErrors.badRequest('Shoot ID and action are required')
    }

    if (action === 'restore') {
      const success = await restoreShoot(shootId)
      
      if (!success) {
        return ApiErrors.internalError('Failed to restore shoot')
      }

      // Log admin action for audit trail
      console.log(`✅ [Admin] Shoot ${shootId} restored by admin: ${user.email}`)

      return ApiSuccess.ok({}, 'Shoot restored successfully')
    }

    return ApiErrors.badRequest('Invalid action')

  } catch (error) {
    console.error('❌ [Admin API] Restore shoot error:', error)
    return ApiErrors.internalError('Failed to process shoot restoration')
  }
} 