import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { upsertIntegration } from '@/lib/db/integrations'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User email
    const error = searchParams.get('error')

    if (error || !code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/integrations?error=${error || 'invalid_request'}`
      )
    }

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/integrations?error=oauth_not_configured`
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/google-calendar/callback`
    )

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info to verify the connected email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    if (!userInfo.data.email) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/integrations?error=no_email`
      )
    }

    // Save integration to database
    await upsertIntegration(state, 'google-calendar', {
      connected: true,
      email: userInfo.data.email,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      lastSync: new Date().toISOString()
    })

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/integrations?success=google-calendar`
    )
    
  } catch (error) {
    console.error('❌ [Calendar API] OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/integrations?error=callback_failed`
    )
  }
} 