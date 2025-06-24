import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { updateUser } from '@/lib/db/users'
import { clientValidation } from '@/lib/validation/client-validation'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
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

    const { name, email } = body

    // Update user in database
    await updateUser(user.email!, { name, email })

    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 })
    
  } catch (error) {
    console.error('Update profile error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
} 