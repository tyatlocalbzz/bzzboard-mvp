import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { upsertIntegration, getIntegration } from '@/lib/db/integrations'
import { GoogleDriveSettings } from '@/lib/types/settings'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📖 [GoogleDriveSettings] Loading settings for user:', user.email)

    // Get current integration data
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration) {
      console.log('📖 [GoogleDriveSettings] No integration found, returning defaults')
      return NextResponse.json({
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

    return NextResponse.json({ settings })
    
  } catch (error) {
    console.error('❌ [GoogleDriveSettings] Error loading settings:', error)
    return NextResponse.json(
      { error: 'Failed to load Google Drive settings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings: GoogleDriveSettings = await req.json()
    console.log('💾 [GoogleDriveSettings] Saving settings for user:', user.email)
    console.log('💾 [GoogleDriveSettings] Settings data:', settings)

    // Get current integration data
    const currentIntegration = await getIntegration(user.email, 'google-drive')
    
    if (!currentIntegration || !currentIntegration.connected) {
      return NextResponse.json(
        { error: 'Google Drive must be connected before configuring settings' },
        { status: 400 }
      )
    }

    // Update integration with new settings
    await upsertIntegration(user.email, 'google-drive', {
      connected: currentIntegration.connected,
      email: currentIntegration.email,
      accessToken: currentIntegration.accessToken,
      refreshToken: currentIntegration.refreshToken,
      lastSync: currentIntegration.lastSync,
      parentFolderId: settings.parentFolderId,
      parentFolderName: settings.parentFolderName,
      parentFolderPath: settings.parentFolderPath,
      autoCreateYearFolders: settings.autoCreateYearFolders,
      folderNamingPattern: settings.folderNamingPattern,
      customNamingTemplate: settings.customNamingTemplate,
      settingsUpdated: new Date().toISOString()
    })

    console.log('✅ [GoogleDriveSettings] Settings saved successfully')

    return NextResponse.json({ 
      success: true,
      message: 'Google Drive settings saved successfully'
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveSettings] Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save Google Drive settings' },
      { status: 500 }
    )
  }
} 