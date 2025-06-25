import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess, getValidatedBody, validateId, sanitizeUserResponse } from '@/lib/api/api-helpers'
import { changeUserRole } from '@/lib/db/users-enhanced'

interface ChangeRoleBody {
  role: 'admin' | 'user'
}

// PATCH /api/admin/users/[id]/role - Change user role (admin only)
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

    const body = await getValidatedBody<ChangeRoleBody>(request)
    const { role } = body

    // Validate role value
    if (!['admin', 'user'].includes(role)) {
      return ApiErrors.badRequest('Role must be either "admin" or "user"')
    }

    console.log(`🔄 [Admin User Role] Admin ${currentUser.email} changing user ${userId} role to: ${role}`)

    // Prevent self-demotion (admin cannot demote themselves)
    if (currentUser.dbId === userId && role === 'user') {
      return ApiErrors.badRequest('You cannot demote your own admin privileges')
    }

    // Change user role with activity logging
    const updatedUser = await changeUserRole(userId, role, currentUser.dbId)

    console.log(`✅ [Admin User Role] User ${userId} role changed to ${role} by ${currentUser.email}`)

    const action = role === 'admin' ? 'promoted to admin' : 'demoted to user'
    
    return ApiSuccess.ok(
      { 
        user: sanitizeUserResponse(updatedUser)
      },
      `User ${action} successfully`
    )

  } catch (error) {
    console.error('❌ [Admin User Role] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
    }

    return ApiErrors.internalError('Failed to change user role')
  }
} 