import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getIntegration } from '@/lib/db/integrations'
import { UnifiedGoogleDriveService } from '@/lib/services/google-drive-unified'
import { 
  ApiErrors, 
  ApiSuccess
} from '@/lib/api/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveBrowse] Unauthorized - no user')
      return ApiErrors.unauthorized()
    }

    const { searchParams } = new URL(req.url)
    const parentFolderId = searchParams.get('parentId') || undefined

    console.log('📂 [GoogleDriveBrowse] Browsing folders for user:', user.email)
    console.log('📂 [GoogleDriveBrowse] Parent ID:', parentFolderId || 'root')

    // Get Google Drive integration
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration) {
      console.log('❌ [GoogleDriveBrowse] No Google Drive integration found')
      return ApiErrors.badRequest('Google Drive integration not found. Please connect Google Drive first.')
    }

    if (!integration.connected) {
      console.log('❌ [GoogleDriveBrowse] Google Drive not connected')
      return ApiErrors.badRequest('Google Drive not connected. Please connect Google Drive first.')
    }

    if (!integration.accessToken) {
      console.log('❌ [GoogleDriveBrowse] No access token found')
      return ApiErrors.badRequest('Google Drive access token missing. Please reconnect Google Drive.')
    }

    console.log('🔍 [GoogleDriveBrowse] Integration check:', {
      exists: !!integration,
      connected: integration.connected,
      hasAccessToken: !!integration.accessToken,
      hasRefreshToken: !!integration.refreshToken,
      email: integration.email,
      scope: integration.data?.scope || 'not stored'
    })

    // Check if we have the required scopes
    const scopes = integration.data?.scope as string || ''
    const hasReadOnlyScope = scopes.includes('drive.readonly')
    const hasFileScope = scopes.includes('drive.file')
    
    console.log('🔑 [GoogleDriveBrowse] Scope analysis:', {
      hasReadOnlyScope,
      hasFileScope,
      fullScope: scopes || undefined
    })
    
    if (!hasReadOnlyScope && !hasFileScope) {
      console.log('⚠️ [GoogleDriveBrowse] WARNING: Missing drive.readonly scope - may not be able to browse existing folders')
    }

    console.log('🔐 [GoogleDriveBrowse] Creating Google Drive service for user:', user.email)

    // Create Google Drive service instance
    const driveService = new UnifiedGoogleDriveService(
      integration.accessToken as string,
      integration.refreshToken as string | undefined,
      {
        parentFolderId: integration.data?.parentFolderId as string | undefined,
        parentFolderName: integration.data?.parentFolderName as string | undefined,
        parentFolderPath: integration.data?.parentFolderPath as string | undefined,
        autoCreateYearFolders: (integration.data?.autoCreateYearFolders as boolean) || false,
        folderNamingPattern: (integration.data?.folderNamingPattern as 'client-only' | 'year-client' | 'custom') || 'client-only',
        customNamingTemplate: integration.data?.customNamingTemplate as string | undefined
      }
    )

    // Perform health check first
    console.log('🏥 [GoogleDriveBrowse] Performing health check...')
    const healthCheck = await driveService.healthCheck()
    if (!healthCheck) {
      console.log('❌ [GoogleDriveBrowse] Health check failed - attempting token refresh')
      const refreshed = await driveService.refreshTokenIfNeeded()
      if (!refreshed) {
        return ApiErrors.unauthorized()
      }
    }

    console.log('🚀 [GoogleDriveBrowse] Attempting to browse folders...')

    // Browse folders with improved error handling
    const folders = await driveService.browseFolders(parentFolderId)
    
    console.log('�� [GoogleDriveBrowse] Successfully found folders:', {
      count: folders.length,
      parentId: parentFolderId || 'root',
      folders: folders.map((f) => ({ id: f.id, name: f.name, path: f.path }))
    })

    return ApiSuccess.ok({ 
      folders,
      parentId: parentFolderId || 'root'
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveBrowse] Error browsing folders:', error)
    console.error('🔍 [GoogleDriveBrowse] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Check if it's an authentication error
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.log('🔄 [GoogleDriveBrowse] Authentication error - token may be expired')
        return ApiErrors.unauthorized()
      }
      
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        console.log('🚫 [GoogleDriveBrowse] Permission error')
        return ApiErrors.forbidden()
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.log('⏰ [GoogleDriveBrowse] Rate limit error')
        return ApiErrors.rateLimit()
      }
    }
    
    // Return error instead of mock data
    console.log('❌ [GoogleDriveBrowse] API error - returning error response')
    
    return ApiErrors.internalError('Failed to browse Google Drive folders. Please check your connection and try again.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveCreateFolder] Unauthorized - no user')
      return ApiErrors.unauthorized()
    }

    const body = await req.json()
    const { folderName, parentId } = body

    if (!folderName || typeof folderName !== 'string') {
      return ApiErrors.badRequest('Folder name is required')
    }

    console.log('📁 [GoogleDriveCreateFolder] Creating folder for user:', user.email)
    console.log('📋 [GoogleDriveCreateFolder] Parameters:', { folderName, parentId })

    // Get Google Drive integration
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration || !integration.connected || !integration.accessToken) {
      return ApiErrors.badRequest('Google Drive not connected. Please connect Google Drive first.')
    }

    console.log('�� [GoogleDriveCreateFolder] Creating Google Drive service')

    // Create Google Drive service instance
    const driveService = new UnifiedGoogleDriveService(
      integration.accessToken as string,
      integration.refreshToken as string | undefined,
      {
        parentFolderId: integration.data?.parentFolderId as string | undefined,
        parentFolderName: integration.data?.parentFolderName as string | undefined,
        parentFolderPath: integration.data?.parentFolderPath as string | undefined,
        autoCreateYearFolders: (integration.data?.autoCreateYearFolders as boolean) || false,
        folderNamingPattern: (integration.data?.folderNamingPattern as 'client-only' | 'year-client' | 'custom') || 'client-only',
        customNamingTemplate: integration.data?.customNamingTemplate as string | undefined
      }
    )

    // Perform health check
    console.log('🏥 [GoogleDriveCreateFolder] Performing health check...')
    const healthCheck = await driveService.healthCheck()
    if (!healthCheck) {
      console.log('❌ [GoogleDriveCreateFolder] Health check failed - attempting token refresh')
      const refreshed = await driveService.refreshTokenIfNeeded()
      if (!refreshed) {
        return ApiErrors.unauthorized()
      }
    }

    console.log('🚀 [GoogleDriveCreateFolder] Creating folder...')

    // Create the folder
    const newFolder = await driveService.createFolder(folderName, parentId)
    
    console.log('✅ [GoogleDriveCreateFolder] Folder created successfully:', {
      id: newFolder.id,
      name: newFolder.name,
      path: newFolder.path
    })

    return ApiSuccess.created({ 
      folder: newFolder
    }, `Folder "${folderName}" created successfully`)
    
  } catch (error) {
    console.error('❌ [GoogleDriveCreateFolder] Error creating folder:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return ApiErrors.conflict(error.message)
      }
      
      if (error.message.includes('Folder name cannot be empty')) {
        return ApiErrors.badRequest('Please enter a valid folder name')
      }
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return ApiErrors.unauthorized()
      }
      
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return ApiErrors.forbidden()
      }
    }
    
    return ApiErrors.internalError('Failed to create folder. Please try again.')
  }
} 