/**
 * Email debugging utilities
 * Helps diagnose email configuration and sending issues
 */

export const debugEmailConfiguration = () => {
  console.log('🔧 [Email Debug] Environment Configuration:')
  console.log({
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 
      `Present (${process.env.RESEND_API_KEY.length} chars, starts with: ${process.env.RESEND_API_KEY.substring(0, 8)}...)` : 
      'MISSING',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Not set (will use default)',
    RESEND_REPLY_TO_EMAIL: process.env.RESEND_REPLY_TO_EMAIL || 'Not set',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set (will use localhost)',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not set'
  })
}

export const testResendConnection = async () => {
  try {
    console.log('🧪 [Email Debug] Testing Resend connection...')
    
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ [Email Debug] RESEND_API_KEY is not set')
      return false
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Try to get domain list to test API connectivity
    const result = await resend.domains.list()
    
    if (result.error) {
      console.error('❌ [Email Debug] Resend API error:', result.error)
      return false
    }
    
    console.log('✅ [Email Debug] Resend connection successful:', {
      apiConnectionWorking: true,
      resultReceived: !!result.data
    })
    
    return true
  } catch (error) {
    console.error('❌ [Email Debug] Exception testing Resend connection:', error)
    return false
  }
}

export const validateEmailAddress = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid = emailRegex.test(email)
  console.log(`📧 [Email Debug] Email validation for "${email}":`, isValid ? '✅ Valid' : '❌ Invalid')
  return isValid
} 