import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { 
  ApiErrors, 
  ApiSuccess, 
  sanitizeUserResponse,
  getValidatedBody 
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface PromoteUserBody {
  email: string
}

export async function POST(request: NextRequest) {
  try {
    // 🚨 CRITICAL SECURITY: Only existing admins can promote other users
    const currentUser = await getCurrentUserForAPI()
    if (!currentUser?.email) {
      return ApiErrors.unauthorized()
    }

    if (currentUser.role !== 'admin') {
      console.warn(`❌ [Admin Setup] Non-admin user attempted to promote user: ${currentUser.email}`)
      return ApiErrors.forbidden()
    }

    const body = await getValidatedBody<PromoteUserBody>(request)
    const { email } = body

    if (!email) {
      return ApiErrors.badRequest('Email is required')
    }

    // Check if target user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length === 0) {
      return ApiErrors.notFound('User')
    }

    const user = existingUser[0]

    if (user.role === 'admin') {
      console.log(`ℹ️ [Admin Setup] User ${email} is already an admin`)
      return ApiSuccess.ok({
        user: sanitizeUserResponse(user)
      }, 'User is already an admin')
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

    // Log admin promotion for security audit
    console.log(`✅ [Admin Setup] User promoted to admin: ${email} by ${currentUser.email}`)

    return ApiSuccess.ok({
      user: sanitizeUserResponse(updatedUser)
    }, 'User promoted to admin successfully')

  } catch (error) {
    console.error('❌ [Admin Setup] Error:', error)
    return ApiErrors.internalError('Failed to promote user')
  }
} 