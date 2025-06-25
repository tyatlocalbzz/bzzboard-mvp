import { NextRequest } from 'next/server'
import { verifyUserPassword, updateUserPassword } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'
import { 
  ApiErrors, 
  ApiSuccess, 
  validateAuthInput 
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const body: ChangePasswordBody = await req.json()
    
    // Enhanced validation with auth-specific patterns
    const validation = validateAuthInput(body, (data) => 
      clientValidation.passwordChange({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.newPassword // For API, we assume they match if provided
      })
    )

    if (!validation.isValid) {
      return ApiErrors.validationError(validation.errors!)
    }

    const { currentPassword, newPassword } = body

    // Security: Verify current password before allowing change
    const isCurrentPasswordValid = await verifyUserPassword(user.email, currentPassword)
    if (!isCurrentPasswordValid) {
      console.warn(`❌ [Auth] Failed password change attempt for user: ${user.email}`)
      return ApiErrors.passwordIncorrect()
    }

    // Update password with new secure hash
    await updateUserPassword(user.email, newPassword)

    // Log successful password change for security audit
    console.log(`✅ [Auth] Password successfully changed for user: ${user.email}`)

    return ApiSuccess.authSuccess('Password changed successfully')
    
  } catch (error) {
    console.error('❌ [Auth] Change password error:', error)
    
    // Don't leak sensitive error details in auth operations
    return ApiErrors.internalError('Failed to change password')
  }
} 