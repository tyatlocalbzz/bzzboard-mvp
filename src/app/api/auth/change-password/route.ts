import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { verifyUserPassword, updateUserPassword } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate using shared validation library
    const validation = clientValidation.passwordChange({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmPassword: body.newPassword // For API, we assume they match if provided
    })

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = body

    // Verify current password
    const isCurrentPasswordValid = await verifyUserPassword(user.email!, currentPassword)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password
    await updateUserPassword(user.email!, newPassword)

    return NextResponse.json({ message: 'Password changed successfully' }, { status: 200 })
    
  } catch (error) {
    console.error('Change password error:', error)
    
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
} 