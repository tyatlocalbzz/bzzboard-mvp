import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = existingUser[0]

    if (user.role === 'admin') {
      return NextResponse.json({
        success: true,
        message: 'User is already an admin',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      })
    }

    // Promote user to admin
    const [updatedUser] = await db
      .update(users)
      .set({
        role: 'admin',
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning()

    return NextResponse.json({
      success: true,
      message: 'User promoted to admin successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    })

  } catch (error) {
    console.error('❌ [Admin Setup] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 