import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { verifyUserPassword, updateUserPassword } from '@/lib/db/users'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
} 