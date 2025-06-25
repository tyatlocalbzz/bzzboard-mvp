import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiUser {
  id: string
  email: string
  role: string
}

/**
 * Standard API error responses following DRY principles
 */
export const ApiErrors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 }),
  notFound: (resource = 'Resource') => NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  badRequest: (message = 'Bad request') => NextResponse.json({ error: message }, { status: 400 }),
  conflict: (message = 'Resource already exists') => NextResponse.json({ error: message }, { status: 409 }),
  internalError: (message = 'Internal server error') => NextResponse.json({ error: message }, { status: 500 }),
  rateLimit: () => NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
  
  // Auth-specific errors
  invalidCredentials: () => NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
  passwordIncorrect: () => NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 }),
  weakPassword: () => NextResponse.json({ error: 'Password does not meet security requirements' }, { status: 400 }),
  emailTaken: () => NextResponse.json({ error: 'User with this email already exists' }, { status: 409 }),
  
  // Validation error with details
  validationError: (details: Record<string, string>) => NextResponse.json({ 
    error: 'Invalid input', 
    details 
  }, { status: 400 })
}

/**
 * Standard success response helper
 */
export const ApiSuccess = {
  ok: <T>(data: T, message?: string): NextResponse => {
    return NextResponse.json({
      success: true,
      data,
      ...(message && { message })
    })
  },
  created: <T>(data: T, message?: string): NextResponse => {
    return NextResponse.json({
      success: true,
      data,
      ...(message && { message })
    }, { status: 201 })
  },
  
  // Auth-specific success responses
  authSuccess: (message: string, data?: Record<string, unknown>): NextResponse => {
    return NextResponse.json({
      success: true,
      message,
      ...(data && { data })
    })
  }
}

/**
 * Authentication wrapper - handles auth checking and returns user
 */
export async function withAuth(
  handler: (req: NextRequest, user: ApiUser, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const user = await getCurrentUserForAPI()
      if (!user || !user.email) {
        return ApiErrors.unauthorized()
      }

      return await handler(req, user as ApiUser, ...args)
    } catch (error) {
      console.error('❌ [API Auth] Authentication error:', error)
      return ApiErrors.internalError()
    }
  }
}

/**
 * Admin-only authentication wrapper
 */
export async function withAdminAuth(
  handler: (req: NextRequest, user: ApiUser, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const user = await getCurrentUserForAPI()
      if (!user || !user.email) {
        return ApiErrors.unauthorized()
      }

      if (user.role !== 'admin') {
        return ApiErrors.forbidden()
      }

      return await handler(req, user as ApiUser, ...args)
    } catch (error) {
      console.error('❌ [API Admin Auth] Authentication error:', error)
      return ApiErrors.internalError()
    }
  }
}

/**
 * Admin-only authentication wrapper for handlers that don't need the request object
 */
export async function withAdminAuthSimple(
  handler: (user: ApiUser, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const user = await getCurrentUserForAPI()
      if (!user || !user.email) {
        return ApiErrors.unauthorized()
      }

      if (user.role !== 'admin') {
        return ApiErrors.forbidden()
      }

      return await handler(user as ApiUser, ...args)
    } catch (error) {
      console.error('❌ [API Admin Auth] Authentication error:', error)
      return ApiErrors.internalError()
    }
  }
}

/**
 * Error handling wrapper - catches and standardizes errors
 */
export function withErrorHandling(
  handler: (...args: unknown[]) => Promise<NextResponse>
) {
  return async (...args: unknown[]): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('❌ [API Error Handler] Unhandled error:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          return ApiErrors.conflict(error.message)
        }
        if (error.message.includes('not found')) {
          return ApiErrors.notFound()
        }
        if (error.message.includes('unauthorized')) {
          return ApiErrors.unauthorized()
        }
        if (error.message.includes('forbidden')) {
          return ApiErrors.forbidden()
        }
      }

      return ApiErrors.internalError()
    }
  }
}

/**
 * Parameter validation helper
 */
export async function getValidatedParams<T extends Record<string, string>>(
  params: Promise<T>
): Promise<T> {
  try {
    return await params
  } catch {
    throw new Error('Invalid route parameters')
  }
}

/**
 * ID validation helper
 */
export function validateId(id: string, resourceName = 'Resource'): number {
  const numericId = parseInt(id)
  if (isNaN(numericId)) {
    throw new Error(`Invalid ${resourceName.toLowerCase()} ID`)
  }
  return numericId
}

/**
 * Request body validation helper with enhanced error handling
 */
export async function getValidatedBody<T>(
  req: NextRequest,
  validator?: (body: unknown) => { valid: boolean; errors: Record<string, string> }
): Promise<T> {
  try {
    const body = await req.json()
    
    if (validator) {
      const validation = validator(body)
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0]
        throw new Error(firstError)
      }
    }
    
    return body as T
  } catch (error) {
    if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
      throw error
    }
    throw new Error('Invalid request body')
  }
}

/**
 * Enhanced validation helper specifically for auth operations
 */
export function validateAuthInput<T>(
  body: T,
  validator: (data: T) => { valid: boolean; errors: Record<string, string> }
): { isValid: boolean; errors?: Record<string, string> } {
  const validation = validator(body)
  
  if (!validation.valid) {
    return {
      isValid: false,
      errors: validation.errors
    }
  }
  
  return { isValid: true }
}

/**
 * Secure user response helper - strips sensitive fields
 */
export function sanitizeUserResponse(user: {
  id: number | string
  email: string
  name: string
  role?: string
  createdAt?: Date | string
  [key: string]: unknown
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt?.toISOString()
  }
} 