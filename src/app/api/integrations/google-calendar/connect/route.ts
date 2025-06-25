import { getCurrentUserForAPI } from '@/lib/auth/session'
import { google } from 'googleapis'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return ApiErrors.internalError('Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.')
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

    return ApiSuccess.ok({ authUrl })
    
  } catch (error) {
    console.error('❌ [Integrations] Google Calendar connect error:', error)
    return ApiErrors.internalError('Failed to initiate Google Calendar connection')
  }
} 