import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { google } from 'googleapis'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.' 
      }, { status: 500 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/google-calendar/callback`
    )

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: user.email, // Pass user email in state for callback
      prompt: 'consent' // Force consent screen to get refresh token
    })

    return NextResponse.json({ 
      success: true,
      authUrl 
    })
    
  } catch (error) {
    console.error('Google Calendar connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar connection' },
      { status: 500 }
    )
  }
} 