import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess, getValidatedBody, validateId, sanitizeUserResponse } from '@/lib/api/api-helpers'
import { changeUserStatus } from '@/lib/db/users-enhanced'

interface ChangeStatusBody {
  status: 'active' | 'inactive'
}

// PATCH /api/admin/users/[id]/status - Change user status (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) {
      return ApiErrors.unauthorized()
    }
    if (sessionUser.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    // Get full user data with database ID
    const currentUser = await getCurrentAuthUser()

    // Validate parameters
    const { id } = await params
    const userId = validateId(id, 'User')

    const body = await getValidatedBody<ChangeStatusBody>(request)
    const { status } = body

    // Validate status value
    if (!['active', 'inactive'].includes(status)) {
      return ApiErrors.badRequest('Status must be either "active" or "inactive"')
    }

    console.log(`🔄 [Admin User Status] Admin ${currentUser.email} changing user ${userId} status to: ${status}`)

    // Prevent self-deactivation
    if (currentUser.dbId === userId && status === 'inactive') {
      return ApiErrors.badRequest('You cannot deactivate your own account')
    }

    // Change user status with activity logging
    const updatedUser = await changeUserStatus(userId, status, currentUser.dbId)

    console.log(`✅ [Admin User Status] User ${userId} status changed to ${status} by ${currentUser.email}`)

    return ApiSuccess.ok(
      { 
        user: sanitizeUserResponse(updatedUser)
      },
      `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    )

  } catch (error) {
    console.error('❌ [Admin User Status] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
    }

    return ApiErrors.internalError('Failed to change user status')
  }
} 