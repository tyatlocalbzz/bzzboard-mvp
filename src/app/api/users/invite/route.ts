import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { createInvitedUser, userExists } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUserForAPI()
    if (!currentUser || !currentUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    // Validate using shared validation library
    const validation = clientValidation.userProfile({
      name: body.name,
      email: body.email
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

    const { email, name } = body

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

    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    )
  }
} 