import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { upsertIntegration } from '@/lib/db/integrations'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User email
    const error = searchParams.get('error')

    console.log('🔄 [GoogleDriveCallback] Processing OAuth callback')
    console.log('📋 [GoogleDriveCallback] Parameters:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error || 'none' 
    })

    if (error) {
      console.error('❌ [GoogleDriveCallback] OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=${error}`
      )
    }

    if (!code || !state) {
      console.error('❌ [GoogleDriveCallback] Missing required parameters')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=invalid_request`
      )
    }

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ [GoogleDriveCallback] OAuth credentials not configured')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=oauth_not_configured`
      )
    }

    console.log('🔐 [GoogleDriveCallback] Initializing OAuth client')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/google-drive/callback`
    )

    console.log('🔑 [GoogleDriveCallback] Exchanging authorization code for tokens')
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      console.error('❌ [GoogleDriveCallback] No access token received')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=no_access_token`
      )
    }

    oauth2Client.setCredentials(tokens)

    console.log('👤 [GoogleDriveCallback] Fetching user information')
    // Get user info to verify the connected email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    if (!userInfo.data.email) {
      console.error('❌ [GoogleDriveCallback] No email in user info')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=no_email`
      )
    }

    console.log('✅ [GoogleDriveCallback] User verified:', userInfo.data.email)
    console.log('💾 [GoogleDriveCallback] Saving integration to database')

    // Save integration to database with both access and refresh tokens
    await upsertIntegration(state, 'google-drive', {
      connected: true,
      email: userInfo.data.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      lastSync: new Date().toISOString(),
      // Store additional metadata separately
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
      scope: tokens.scope,
      tokenType: tokens.token_type
    })

    console.log('🎉 [GoogleDriveCallback] Integration saved successfully')

    // Redirect back to settings page with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&success=google-drive`
    )
    
  } catch (error) {
    console.error('❌ [GoogleDriveCallback] Callback processing error:', error)
    console.error('🔍 [GoogleDriveCallback] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=integrations&error=callback_failed`
    )
  }
} 