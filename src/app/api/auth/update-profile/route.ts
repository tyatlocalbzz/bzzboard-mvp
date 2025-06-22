import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { updateUser } from '@/lib/db/users'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email } = updateProfileSchema.parse(body)

    // Update user in database
    await updateUser(user.email!, { name, email })

    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 })
    
  } catch (error) {
    console.error('Update profile error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
} 