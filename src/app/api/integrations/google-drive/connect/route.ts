import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { google } from 'googleapis'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔗 [GoogleDriveConnect] Starting connection for user:', user.email)

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.' 
      }, { status: 500 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/google-drive/callback`
    )

    // Define the scopes we're requesting
    const requestedScopes = [
      // Use read-only scope to browse existing folders
      'https://www.googleapis.com/auth/drive.readonly',
      // File creation scope for uploading content
      'https://www.googleapis.com/auth/drive.file',
      // User email for identification
      'https://www.googleapis.com/auth/userinfo.email'
    ]

    console.log('🔑 [GoogleDriveConnect] Requesting scopes:', requestedScopes)

    // Generate the authorization URL with necessary scopes for folder browsing
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh tokens
      scope: requestedScopes,
      state: user.email, // Pass user email in state for callback
      prompt: 'consent', // Force consent screen to get refresh token and new permissions
      include_granted_scopes: false // Don't include previously granted scopes
    })

    console.log('🌐 [GoogleDriveConnect] Generated auth URL with scopes')
    console.log('🔗 [GoogleDriveConnect] Auth URL (partial):', authUrl.substring(0, 100) + '...')

    return NextResponse.json({ 
      success: true,
      authUrl 
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveConnect] Connection error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google Drive connection' },
      { status: 500 }
    )
  }
} 