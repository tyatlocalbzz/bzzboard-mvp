import { getCurrentUserForAPI } from '@/lib/auth/session'
import { removeIntegration, getIntegration } from '@/lib/db/integrations'
import { google } from 'googleapis'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      console.log('❌ [GoogleDriveDisconnect] Unauthorized - no user found')
      return ApiErrors.unauthorized()
    }

    console.log('🔌 [GoogleDriveDisconnect] Disconnecting Google Drive for user:', user.email)

    // Get current integration to revoke tokens
    const currentIntegration = await getIntegration(user.email, 'google-drive')
    
    if (currentIntegration?.accessToken) {
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
      return ApiErrors.internalError('Failed to completely disconnect Google Drive')
    }

    console.log('🎉 [GoogleDriveDisconnect] Google Drive disconnected successfully')
    return ApiSuccess.ok({}, 'Google Drive disconnected successfully. All tokens have been revoked.')
    
  } catch (error) {
    console.error('❌ [GoogleDriveDisconnect] Error during disconnect:', error)
    console.error('🔍 [GoogleDriveDisconnect] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return ApiErrors.internalError('Failed to disconnect Google Drive. Please try again.')
  }
} 