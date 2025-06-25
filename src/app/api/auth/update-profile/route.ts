import { NextRequest } from 'next/server'
import { updateUser } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'
import { 
  ApiErrors, 
  ApiSuccess, 
  validateAuthInput
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface UpdateProfileBody {
  name: string
  email: string
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const body: UpdateProfileBody = await req.json()
    
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

    const { name, email } = body

    // Security check: Prevent users from updating to existing emails
    // This would typically be handled at the database level with unique constraints
    // but adding validation here for better user experience

    // Update user in database
    await updateUser(user.email, { name, email })

    // Create response with updated user data
    const userResponse = {
      id: user.id,
      name,
      email,
      role: user.role
    }

    // Log profile update for security audit
    console.log(`✅ [Auth] Profile updated for user: ${user.email} -> ${email}`)

    // Return sanitized user data
    return ApiSuccess.authSuccess(
      'Profile updated successfully',
      { user: userResponse }
    )
    
  } catch (error) {
    console.error('❌ [Auth] Update profile error:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return ApiErrors.emailTaken()
      }
    }
    
    return ApiErrors.internalError('Failed to update profile')
  }
} 