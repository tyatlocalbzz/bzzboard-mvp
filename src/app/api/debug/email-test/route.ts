import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { debugEmailConfiguration, testResendConnection, validateEmailAddress } from '@/lib/services/email-debug'
import { sendInvitationEmail } from '@/lib/services/email-service'

// GET /api/debug/email-test - Test email configuration (admin only)
export async function GET() {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    console.log('🧪 [Email Test] Starting email configuration test...')

    // Test email configuration
    debugEmailConfiguration()
    
    // Test Resend connection
    const connectionTest = await testResendConnection()
    
    return ApiSuccess.ok({
      message: 'Email configuration test completed',
      connectionTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [Email Test] Error:', error)
    return ApiErrors.internalError('Email test failed')
  }
}

// POST /api/debug/email-test - Send test email (admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()
    if (user.role !== 'admin') return ApiErrors.forbidden()

    console.log('📧 [Email Test] Starting test email send...')

    const body = await request.json()
    const testEmail = body.email || user.email

    // Validate email
    if (!validateEmailAddress(testEmail)) {
      return ApiErrors.badRequest('Invalid email address')
    }

    // Debug configuration
    debugEmailConfiguration()
    
    // Test connection
    const connectionTest = await testResendConnection()
    if (!connectionTest) {
      return ApiErrors.internalError('Resend connection failed')
    }

    // Send test email
    const emailResult = await sendInvitationEmail({
      email: testEmail,
      name: 'Test User',
      tempPassword: 'test-password-123',
      invitedBy: user.email
    })

    return ApiSuccess.ok({
      message: 'Test email send completed',
      emailResult,
      testEmail,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [Email Test] Error:', error)
    return ApiErrors.internalError('Test email send failed')
  }
} 