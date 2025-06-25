import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { upsertIntegration, getIntegration } from '@/lib/db/integrations'
import { GoogleDriveSettings } from '@/lib/types/settings'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody
} from '@/lib/api/api-helpers'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    console.log('📖 [GoogleDriveSettings] Loading settings for user:', user.email)

    // Get current integration data
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration) {
      console.log('📖 [GoogleDriveSettings] No integration found, returning defaults')
      return ApiSuccess.ok({
        settings: {
          folderNamingPattern: 'client-only',
          autoCreateYearFolders: false
        }
      })
    }

    // Extract settings from integration data
    const settings: GoogleDriveSettings = {
      parentFolderId: integration.data?.parentFolderId as string,
      parentFolderName: integration.data?.parentFolderName as string,
      parentFolderPath: integration.data?.parentFolderPath as string,
      autoCreateYearFolders: integration.data?.autoCreateYearFolders as boolean || false,
      folderNamingPattern: integration.data?.folderNamingPattern as 'client-only' | 'year-client' | 'custom' || 'client-only',
      customNamingTemplate: integration.data?.customNamingTemplate as string
    }

    console.log('📖 [GoogleDriveSettings] Loaded settings:', settings)

    return ApiSuccess.ok({ settings })
    
  } catch (error) {
    console.error('❌ [GoogleDriveSettings] Error loading settings:', error)
    return ApiErrors.internalError('Failed to load Google Drive settings')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const settings = await getValidatedBody<GoogleDriveSettings>(req)
    console.log('💾 [GoogleDriveSettings] Saving settings for user:', user.email)
    console.log('💾 [GoogleDriveSettings] Settings data:', settings)

    // Get current integration data
    const currentIntegration = await getIntegration(user.email, 'google-drive')
    
    if (!currentIntegration?.connected) {
      return ApiErrors.badRequest('Google Drive must be connected before configuring settings')
    }

    // Merge new settings with existing settings to avoid overwriting
    const existingSettings = currentIntegration.data || {}
    const mergedSettings = {
      ...existingSettings,
      ...settings,
      settingsUpdated: new Date().toISOString()
    }

    console.log('🔄 [GoogleDriveSettings] Merging settings:', {
      existing: existingSettings,
      new: settings,
      merged: mergedSettings
    })

    // Update integration with merged settings
    await upsertIntegration(user.email, 'google-drive', {
      connected: currentIntegration.connected,
      email: currentIntegration.email,
      accessToken: currentIntegration.accessToken,
      refreshToken: currentIntegration.refreshToken,
      lastSync: currentIntegration.lastSync,
      ...mergedSettings
    })

    console.log('✅ [GoogleDriveSettings] Settings saved successfully by user:', user.email)

    return ApiSuccess.ok({}, 'Google Drive settings saved successfully')
    
  } catch (error) {
    console.error('❌ [GoogleDriveSettings] Error saving settings:', error)
    return ApiErrors.internalError('Failed to save Google Drive settings')
  }
} 