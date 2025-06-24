import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { removeIntegration, getIntegration } from '@/lib/db/integrations'
import { google } from 'googleapis'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveDisconnect] Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔌 [GoogleDriveDisconnect] Disconnecting Google Drive for user:', user.email)

    // Get current integration to revoke tokens
    const currentIntegration = await getIntegration(user.email, 'google-drive')
    
    if (currentIntegration && currentIntegration.accessToken) {
      console.log('🔑 [GoogleDriveDisconnect] Revoking Google OAuth tokens...')
      
      try {
        // Revoke the access token with Google
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ 
          access_token: currentIntegration.accessToken 
        })
        
        await oauth2Client.revokeCredentials()
        console.log('✅ [GoogleDriveDisconnect] Google OAuth tokens revoked successfully')
      } catch (revokeError) {
        console.warn('⚠️ [GoogleDriveDisconnect] Failed to revoke Google tokens (may already be invalid):', revokeError)
        // Continue with database cleanup even if token revocation fails
      }
    } else {
      console.log('ℹ️ [GoogleDriveDisconnect] No access token found, skipping token revocation')
    }

    // Remove integration from database
    console.log('🗑️ [GoogleDriveDisconnect] Removing integration from database...')
    await removeIntegration(user.email, 'google-drive')
    console.log('✅ [GoogleDriveDisconnect] Integration removed from database')

    // Verify removal
    const verifyRemoval = await getIntegration(user.email, 'google-drive')
    if (verifyRemoval) {
      console.error('❌ [GoogleDriveDisconnect] Integration still exists after removal attempt')
      return NextResponse.json({ 
        error: 'Failed to completely disconnect Google Drive' 
      }, { status: 500 })
    }

    console.log('🎉 [GoogleDriveDisconnect] Google Drive disconnected successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Google Drive disconnected successfully. All tokens have been revoked.'
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveDisconnect] Error during disconnect:', error)
    console.error('🔍 [GoogleDriveDisconnect] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to disconnect Google Drive. Please try again.' },
      { status: 500 }
    )
  }
} 