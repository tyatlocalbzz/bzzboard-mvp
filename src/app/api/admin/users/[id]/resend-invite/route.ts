import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess, getValidatedParams, validateId } from '@/lib/api/api-helpers'
import { resendUserInvite, getUserByIdEnhanced } from '@/lib/db/users-enhanced'
import { resendInvitationEmail } from '@/lib/services/email-service'
import { updateUserTempPassword } from '@/lib/db/users'
import crypto from 'crypto'

// POST /api/admin/users/[id]/resend-invite - Resend user invitation (admin only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) return ApiErrors.unauthorized()
    if (sessionUser.role !== 'admin') return ApiErrors.forbidden()

    // Get full user data with database ID for activity logging
    const currentUser = await getCurrentAuthUser()

    // Validate parameters
    const { id } = await getValidatedParams(params)
    const userId = validateId(id, 'User')

    console.log(`🔄 [Admin Resend Invite] Starting resend process:`, {
      adminEmail: currentUser.email,
      targetUserId: userId,
      timestamp: new Date().toISOString()
    })

    // Check if user exists
    console.log(`🔍 [Admin Resend Invite] Looking up user by ID: ${userId}`)
    const targetUser = await getUserByIdEnhanced(userId)
    if (!targetUser) {
      console.error(`❌ [Admin Resend Invite] User not found: ${userId}`)
      return ApiErrors.notFound('User')
    }

    console.log(`👤 [Admin Resend Invite] Found target user:`, {
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      isFirstLogin: targetUser.isFirstLogin,
      status: targetUser.status
    })

    // Check if user has actually logged in or if this is a data issue
    if (!targetUser.isFirstLogin) {
      // If user has no lastLoginAt but isFirstLogin is false, this is likely a data issue
      if (!targetUser.lastLoginAt) {
        console.warn(`🔧 [Admin Resend Invite] User has isFirstLogin=false but no lastLoginAt - fixing data issue for user: ${userId}`)
        
        // Import the fix function
        const { fixUserFirstLoginFlag } = await import('@/lib/db/users-enhanced')
        const fixedUser = await fixUserFirstLoginFlag(userId, currentUser.dbId)
        
        console.log(`✅ [Admin Resend Invite] Fixed user data - isFirstLogin reset to true for user: ${userId}`)
        
        // Update targetUser with fixed data
        targetUser.isFirstLogin = fixedUser.isFirstLogin
        targetUser.lastLoginAt = fixedUser.lastLoginAt
      } else {
        console.warn(`⚠️ [Admin Resend Invite] User has already logged in: ${userId}`)
        return ApiErrors.badRequest('User has already completed their first login')
      }
    }

    // Generate new temporary password for security
    console.log(`🔐 [Admin Resend Invite] Generating new temporary password for: ${targetUser.email}`)
    const newTempPassword = crypto.randomBytes(16).toString('hex')
    
    // Update user with new temporary password
    console.log(`💾 [Admin Resend Invite] Updating user password in database: ${targetUser.email}`)
    await updateUserTempPassword(targetUser.email, newTempPassword)

    // Log the resend activity
    console.log(`📝 [Admin Resend Invite] Logging resend activity for user: ${userId}`)
    await resendUserInvite(userId, currentUser.dbId)

    // Send invitation email with new password
    console.log(`📨 [Admin Resend Invite] Attempting to send resend email to: ${targetUser.email}`)
    const emailResult = await resendInvitationEmail({
      email: targetUser.email,
      name: targetUser.name,
      tempPassword: newTempPassword,
      invitedBy: currentUser.email
    })

    console.log(`📧 [Admin Resend Invite] Email resend result:`, {
      success: emailResult.success,
      messageId: emailResult.messageId,
      error: emailResult.error,
      email: targetUser.email
    })

    if (!emailResult.success) {
      console.warn(`⚠️ [Admin Resend Invite] Email sending failed but password updated:`, {
        email: targetUser.email,
        error: emailResult.error,
        userId
      })
      // Continue with success response even if email fails
      // The password was updated successfully
    } else {
      console.log(`🎉 [Admin Resend Invite] Complete success - password updated and email sent:`, {
        email: targetUser.email,
        messageId: emailResult.messageId
      })
    }

    console.log(`✅ [Admin Resend Invite] Resend process completed for user ${userId} by ${currentUser.email}`)

    return ApiSuccess.ok(
      { 
        userId,
        userEmail: targetUser.email,
        resentBy: currentUser.email,
        emailSent: emailResult.success,
        emailError: emailResult.error
      },
      emailResult.success 
        ? 'Invitation resent successfully and email sent'
        : 'Invitation resent successfully but email failed to send'
    )

  } catch (error) {
    console.error('❌ [Admin Resend Invite] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('User')
      }
    }

    return ApiErrors.internalError('Failed to resend invitation')
  }
} 