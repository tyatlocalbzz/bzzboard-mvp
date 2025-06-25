import { NextRequest } from 'next/server'
import { updateUserPassword } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'
import { 
  ApiErrors, 
  ApiSuccess 
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCurrentAuthUser } from '@/lib/auth/user-service'

interface SetFirstPasswordBody {
  newPassword: string
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const sessionUser = await getCurrentUserForAPI()
    if (!sessionUser?.email) {
      return ApiErrors.unauthorized()
    }

    // Get full user data to check if this is actually a first login
    const user = await getCurrentAuthUser()
    if (!user.isFirstLogin) {
      return ApiErrors.badRequest('User has already set their password. Use change password instead.')
    }

    const body: SetFirstPasswordBody = await req.json()
    
    // Validate new password
    const passwordValidation = clientValidation.password(body.newPassword)
    if (!passwordValidation.valid) {
      return ApiErrors.validationError({ newPassword: passwordValidation.error! })
    }

    // Update password and mark first login as complete
    await updateUserPassword(user.email, body.newPassword)

    // Log successful password set for security audit
    console.log(`✅ [Auth] First password set successfully for user: ${user.email}`)

    return ApiSuccess.authSuccess('Password set successfully')
    
  } catch (error) {
    console.error('❌ [Auth] Set first password error:', error)
    
    // Don't leak sensitive error details in auth operations
    return ApiErrors.internalError('Failed to set password')
  }
} 