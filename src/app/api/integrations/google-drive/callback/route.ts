import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { upsertIntegration } from '@/lib/db/integrations'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User email
    const error = searchParams.get('error')

    console.log('🔄 [GoogleDriveCallback] Processing OAuth callback for user:', state)
    console.log('🔍 [GoogleDriveCallback] Callback parameters:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error || 'none' 
    })

    // Ensure NEXTAUTH_URL is set for redirects
    const baseUrl = process.env.NEXTAUTH_URL
    if (!baseUrl) {
      console.error('❌ [GoogleDriveCallback] NEXTAUTH_URL environment variable is required')
      return new NextResponse('OAuth configuration error', { status: 500 })
    }

    if (error || !code || !state) {
      console.log('❌ [GoogleDriveCallback] Invalid callback parameters')
      return NextResponse.redirect(
        `${baseUrl}/account/integrations?error=${error || 'invalid_request'}`
      )
    }

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('❌ [GoogleDriveCallback] OAuth credentials not configured')
      return NextResponse.redirect(
        `${baseUrl}/account/integrations?error=oauth_not_configured`
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/integrations/google-drive/callback`
    )

    console.log('🔑 [GoogleDriveCallback] Exchanging authorization code for tokens...')

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    console.log('✅ [GoogleDriveCallback] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      scope: tokens.scope || 'not provided',
      expiryDate: tokens.expiry_date
    })

    // Get user info to verify the connected email
    console.log('👤 [GoogleDriveCallback] Getting user info...')
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    if (!userInfo.data.email) {
      console.log('❌ [GoogleDriveCallback] No email in user info')
      return NextResponse.redirect(
        `${baseUrl}/account/integrations?error=no_email`
      )
    }

    console.log('👤 [GoogleDriveCallback] User info retrieved:', {
      email: userInfo.data.email,
      name: userInfo.data.name
    })

    // Save integration to database
    console.log('💾 [GoogleDriveCallback] Saving integration to database...')
    await upsertIntegration(state, 'google-drive', {
      connected: true,
      email: userInfo.data.email,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined, // Store the granted scope
      lastSync: new Date().toISOString()
    })

    console.log('✅ [GoogleDriveCallback] Integration saved successfully')

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${baseUrl}/account/integrations?success=google-drive`
    )
    
  } catch (error) {
    console.error('❌ [GoogleDriveCallback] Callback error:', error)
    const baseUrl = process.env.NEXTAUTH_URL
    if (baseUrl) {
      return NextResponse.redirect(
        `${baseUrl}/account/integrations?error=callback_failed`
      )
    } else {
      return new NextResponse('OAuth configuration error', { status: 500 })
    }
  }
} 