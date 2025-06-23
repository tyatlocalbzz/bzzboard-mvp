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

    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/google-drive/callback`
    console.log('🔗 [GoogleDriveConnect] OAuth redirect URI:', redirectUri)
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    // Generate the authorization URL with minimal required scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh tokens
      scope: [
        // Use minimal scope - only files created by the app
        'https://www.googleapis.com/auth/drive.file',
        // User email for identification
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: user.email, // Pass user email in state for callback
      prompt: 'consent', // Force consent screen to get refresh token
      include_granted_scopes: true // Allow incremental authorization
    })

    console.log('✅ [GoogleDriveConnect] Authorization URL generated successfully')
    console.log('🔐 [GoogleDriveConnect] Using minimal scopes for security')

    return NextResponse.json({ 
      success: true,
      authUrl,
      scopes: [
        'drive.file', // Files created by the app only
        'userinfo.email' // User identification
      ]
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveConnect] Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google Drive connection' },
      { status: 500 }
    )
  }
} 