import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { ApiErrors, ApiSuccess, getValidatedBody, sanitizeUserResponse } from '@/lib/api/api-helpers'
import { clientValidation } from '@/lib/validation/client-validation'
import { userExists } from '@/lib/db/users'
import { createUserWithActivity } from '@/lib/db/users-enhanced'
import { sendInvitationEmail } from '@/lib/services/email-service'
import { debugEmailConfiguration, testResendConnection, validateEmailAddress } from '@/lib/services/email-debug'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

interface InviteUserBody {
  email: string
  name: string
}

// POST /api/admin/users/invite - Invite new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    // Get full user data with database ID for activity logging
    const currentUser = await getCurrentAuthUser()

    const body = await getValidatedBody<InviteUserBody>(request)
    
    // Enhanced validation with auth-specific patterns
    const validation = clientValidation.userProfile({
      name: body.name,
      email: body.email
    })

    if (!validation.valid) {
      return ApiErrors.badRequest(Object.values(validation.errors)[0] as string)
    }

    const { email, name } = body

    console.log(`📧 [Admin Invite] Starting invitation process:`, {
      adminEmail: currentUser.email,
      inviteeEmail: email,
      inviteeName: name,
      timestamp: new Date().toISOString()
    })

    // Debug email configuration and validate email
    debugEmailConfiguration()
    validateEmailAddress(email)
    await testResendConnection()

    // Security check: Prevent duplicate user invitations
    console.log(`🔍 [Admin Invite] Checking if user already exists: ${email}`)
    const exists = await userExists(email)
    if (exists) {
      console.warn(`❌ [Admin Invite] Attempted to invite existing user: ${email} by ${currentUser.email}`)
      return ApiErrors.badRequest('User with this email already exists')
    }

    // Generate a secure temporary password
    console.log(`🔐 [Admin Invite] Generating temporary password for: ${email}`)
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    console.log(`💾 [Admin Invite] Creating user in database:`, {
      email,
      name,
      role: 'user',
      status: 'active',
      isFirstLogin: true,
      tempPasswordLength: tempPassword.length
    })

    // Create the invited user with activity logging
    const newUser = await createUserWithActivity({
      email,
      name,
      passwordHash: hashedPassword,
      role: 'user',
      status: 'active',
      isFirstLogin: true
    }, currentUser.dbId!)

    // Log successful invitation for security audit
    console.log(`✅ [Admin Invite] User created successfully in database:`, {
      userId: newUser.id,
      email: newUser.email,
      createdBy: currentUser.email
    })

    // Send invitation email
    console.log(`📨 [Admin Invite] Attempting to send invitation email to: ${email}`)
    const emailResult = await sendInvitationEmail({
      email,
      name,
      tempPassword,
      invitedBy: currentUser.email
    })

    console.log(`📧 [Admin Invite] Email send result:`, {
      success: emailResult.success,
      messageId: emailResult.messageId,
      error: emailResult.error,
      email: email
    })

    if (!emailResult.success) {
      console.warn(`⚠️ [Admin Invite] Email sending failed but user was created:`, {
        email,
        error: emailResult.error,
        userId: newUser.id
      })
      // Continue with success response even if email fails
      // The user account was created successfully
    } else {
      console.log(`🎉 [Admin Invite] Complete success - user created and email sent:`, {
        email,
        messageId: emailResult.messageId
      })
    }

    return ApiSuccess.created(
      { 
        user: sanitizeUserResponse(newUser),
        invitedBy: currentUser.email,
        emailSent: emailResult.success,
        emailError: emailResult.error,
        // In production, don't return the temp password
        // tempPassword: tempPassword // Only for development
      },
      emailResult.success 
        ? 'User invited successfully and email sent'
        : 'User invited successfully but email failed to send'
    )

  } catch (error) {
    console.error('❌ [Admin Invite] Error:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return ApiErrors.badRequest('User with this email already exists')
      }
    }

    return ApiErrors.internalError('Failed to invite user')
  }
} 