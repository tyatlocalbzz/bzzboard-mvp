import { NextResponse } from 'next/server'

/**
 * Debug endpoint to check OAuth configuration
 * Helps diagnose Google OAuth setup issues
 */
export async function GET() {
  try {
    const config = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      
      // Safe partial values (first few chars only)
      googleClientIdPreview: process.env.GOOGLE_CLIENT_ID ? 
        `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
      googleClientSecretPreview: process.env.GOOGLE_CLIENT_SECRET ? 
        `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 6)}...` : 'NOT SET',
      authSecretPreview: process.env.AUTH_SECRET ? 
        `${process.env.AUTH_SECRET.substring(0, 6)}...` : 'NOT SET',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
      
      // Environment info
      nodeEnv: process.env.NODE_ENV,
      expectedCallbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`
    }

    return NextResponse.json({
      success: true,
      config,
      recommendations: [
        !config.hasGoogleClientId && 'Add GOOGLE_CLIENT_ID to your .env.local file',
        !config.hasGoogleClientSecret && 'Add GOOGLE_CLIENT_SECRET to your .env.local file', 
        !config.hasAuthSecret && 'Add AUTH_SECRET to your .env.local file',
        !config.hasNextAuthUrl && 'Add NEXTAUTH_URL to your .env.local file',
        'Ensure your Google Cloud Console has the correct redirect URI configured',
        'Check that your OAuth consent screen is configured in Google Cloud Console'
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('❌ [Debug] OAuth config check failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check OAuth configuration'
    }, { status: 500 })
  }
} 