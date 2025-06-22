import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createInvitedUser, userExists } from '@/lib/db/users'
import { z } from 'zod'

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { email, name } = inviteUserSchema.parse(body)

    // Check if user already exists
    const exists = await userExists(email)
    if (exists) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create the invited user with secure temporary password
    const newUser = await createInvitedUser(email, name)

    // TODO: Send invitation email here
    // await sendInvitationEmail(email, name, tempPassword)

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      }
    })

  } catch (error: unknown) {
    console.error('Invite user error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    )
  }
} 