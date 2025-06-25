import { NextRequest } from 'next/server'
import { createInvitedUser, userExists } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'
import { 
  ApiErrors, 
  ApiSuccess, 
  validateAuthInput,
  sanitizeUserResponse 
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface InviteUserBody {
  email: string
  name: string
}

export async function POST(request: NextRequest) {
  try {
    // Enhanced authentication - only authenticated users can invite
    const currentUser = await getCurrentUserForAPI()
    if (!currentUser?.email) {
      return ApiErrors.unauthorized()
    }

    // TODO: Add role-based access control for invites
    // For now, any authenticated user can invite, but this should likely be admin-only
    // if (currentUser.role !== 'admin') {
    //   return ApiErrors.forbidden()
    // }

    const body: InviteUserBody = await request.json()
    
    // Enhanced validation with auth-specific patterns
    const validation = validateAuthInput(body, (data) => 
      clientValidation.userProfile({
        name: data.name,
        email: data.email
      })
    )

    if (!validation.isValid) {
      return ApiErrors.validationError(validation.errors!)
    }

    const { email, name } = body

    // Security check: Prevent duplicate user invitations
    const exists = await userExists(email)
    if (exists) {
      console.warn(`❌ [Auth] Attempted to invite existing user: ${email} by ${currentUser.email}`)
      return ApiErrors.emailTaken()
    }

    // Create the invited user with secure temporary password
    const newUser = await createInvitedUser(email, name)

    // Log successful invitation for security audit
    console.log(`✅ [Auth] User invited successfully: ${email} by ${currentUser.email}`)

    // TODO: Send invitation email here
    // await sendInvitationEmail(email, name, tempPassword)

    return ApiSuccess.created(
      { 
        user: sanitizeUserResponse(newUser),
        invitedBy: currentUser.email 
      },
      'User invited successfully'
    )

  } catch (error: unknown) {
    console.error('❌ [Auth] Invite user error:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return ApiErrors.emailTaken()
      }
    }

    return ApiErrors.internalError('Failed to invite user')
  }
} 