import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody, 
  getValidatedParams,
  validateId, 
  sanitizeUserResponse
} from '@/lib/api/api-helpers'
import { updateUserDetails, deactivateUser, hardDeleteUser, getUserByIdEnhanced } from '@/lib/db/users-enhanced'
import { clientValidation } from '@/lib/validation/client-validation'

interface UpdateUserBody {
  name?: string
  email?: string
}

// GET /api/admin/users/[id] - Get single user (admin only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    // Validate parameters
    const { id } = await getValidatedParams(params)
    const userId = validateId(id, 'User')

    console.log(`📊 [Admin User Get] Admin ${user.email} fetching user: ${userId}`)

    // Get user by ID
    const targetUser = await getUserByIdEnhanced(userId)
    
    if (!targetUser) {
      return ApiErrors.notFound('User')
    }

    console.log(`✅ [Admin User Get] Retrieved user ${userId}`)

    return ApiSuccess.ok(
      { 
        user: sanitizeUserResponse(targetUser)
      },
      'User retrieved successfully'
    )

  } catch (error) {
    console.error('❌ [Admin User Get] Error:', error)
    return ApiErrors.internalError('Failed to fetch user')
  }
}

// PUT /api/admin/users/[id] - Update user (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    // Get full user data with database ID for activity logging
    const currentUser = await getCurrentAuthUser()

    // Validate parameters
    const { id } = await getValidatedParams(params)
    const userId = validateId(id, 'User')

    const body = await getValidatedBody<UpdateUserBody>(request)

    // Validate the update data
    const validation = clientValidation.userProfile({
      name: body.name || '',
      email: body.email || ''
    })

    if (!validation.valid) {
      return ApiErrors.badRequest(Object.values(validation.errors)[0] as string)
    }

    console.log(`🔄 [Admin User Update] Admin ${currentUser.email} updating user ${userId}:`, body)

    // Update user with activity logging
    const updatedUser = await updateUserDetails(userId, body, currentUser.dbId)

    console.log(`✅ [Admin User Update] User ${userId} updated successfully by ${currentUser.email}`)

    return ApiSuccess.ok(
      { 
        user: sanitizeUserResponse(updatedUser)
      },
      'User updated successfully'
    )

  } catch (error) {
    console.error('❌ [Admin User Update] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return ApiErrors.badRequest('Email address is already in use')
      }
    }

    return ApiErrors.internalError('Failed to update user')
  }
}

// DELETE /api/admin/users/[id] - Delete user (admin only)
// Query parameters:
// - type: 'deactivate' (default) or 'hard' - type of deletion
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    // Get full user data with database ID for activity logging
    const currentUser = await getCurrentAuthUser()

    // Validate parameters
    const { id } = await getValidatedParams(params)
    const userId = validateId(id, 'User')

    // Get deletion type from query parameters
    const { searchParams } = new URL(request.url)
    const deletionType = searchParams.get('type') || 'deactivate'

    if (!['deactivate', 'hard'].includes(deletionType)) {
      return ApiErrors.badRequest('Invalid deletion type. Use "deactivate" or "hard"')
    }

    console.log(`🗑️ [Admin User Delete] Admin ${currentUser.email} ${deletionType} deleting user ${userId}`)

    // Prevent self-deletion
    if (currentUser.dbId === userId) {
      return ApiErrors.badRequest('You cannot delete your own account')
    }

    if (deletionType === 'hard') {
      // Hard delete - permanent removal
      await hardDeleteUser(userId, currentUser.dbId)
      
      console.log(`✅ [Admin User Delete] User ${userId} permanently deleted by ${currentUser.email}`)
      
      return ApiSuccess.ok(
        { 
          deletedUserId: userId,
          deletionType: 'hard'
        },
        'User permanently deleted'
      )
    } else {
      // Deactivate - soft delete (default)
      const deactivatedUser = await deactivateUser(userId, currentUser.dbId)
      
      console.log(`✅ [Admin User Delete] User ${userId} deactivated by ${currentUser.email}`)
      
      return ApiSuccess.ok(
        { 
          user: sanitizeUserResponse(deactivatedUser),
          deletionType: 'deactivate'
        },
        'User deactivated successfully'
      )
    }

  } catch (error) {
    console.error('❌ [Admin User Delete] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
    }

    return ApiErrors.internalError('Failed to delete user')
  }
} 