import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getIntegration } from '@/lib/db/integrations'
import { UnifiedGoogleDriveService } from '@/lib/services/google-drive-unified'
import { 
  ApiErrors, 
  ApiSuccess,
  getValidatedBody
} from '@/lib/api/api-helpers'

interface CreateFolderRequestBody {
  clientName: string
  shootTitle: string
  shootDate: string
}

export async function POST(req: NextRequest) {
  console.log('🚀 [GoogleDriveFolders] POST request received')
  
  try {
    // Authentication check
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveFolders] Unauthorized - no user')
      return ApiErrors.unauthorized()
    }

    console.log('✅ [GoogleDriveFolders] User authenticated:', user.email)

    // Parse and validate request body
    const body = await getValidatedBody<CreateFolderRequestBody>(req, (data) => {
      const errors: Record<string, string> = {}
      
      if (!data || typeof data !== 'object') {
        errors.body = 'Request body must be an object'
        return { valid: false, errors }
      }
      
      const { clientName, shootTitle, shootDate } = data as CreateFolderRequestBody
      
      if (!clientName || typeof clientName !== 'string') {
        errors.clientName = 'Client name is required and must be a string'
      }
      
      if (!shootTitle || typeof shootTitle !== 'string') {
        errors.shootTitle = 'Shoot title is required and must be a string'
      }
      
      if (!shootDate || typeof shootDate !== 'string') {
        errors.shootDate = 'Shoot date is required and must be a string'
      }
      
      return { valid: Object.keys(errors).length === 0, errors }
    })
    
    console.log('📦 [GoogleDriveFolders] Request body validated:', body)
    const { clientName, shootTitle, shootDate } = body

    console.log('✅ [GoogleDriveFolders] Request validation passed')
    console.log('📋 [GoogleDriveFolders] Parameters:', { 
      clientName, 
      shootTitle, 
      shootDate,
      userEmail: user.email
    })

    // Get Google Drive integration
    console.log('🔍 [GoogleDriveFolders] Looking up Google Drive integration...')
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration) {
      console.log('❌ [GoogleDriveFolders] No Google Drive integration found for user:', user.email)
      return ApiErrors.badRequest('Google Drive integration not found. Please connect Google Drive first.')
    }

    console.log('✅ [GoogleDriveFolders] Integration found:', {
      email: integration.email,
      connected: integration.connected,
      hasAccessToken: !!integration.accessToken,
      hasRefreshToken: !!integration.refreshToken,
      lastSync: integration.lastSync
    })

    if (!integration.connected) {
      console.log('❌ [GoogleDriveFolders] Google Drive not connected')
      return ApiErrors.badRequest('Google Drive not connected. Please connect Google Drive first.')
    }

    if (!integration.accessToken) {
      console.log('❌ [GoogleDriveFolders] No access token found')
      return ApiErrors.badRequest('Google Drive access token missing. Please reconnect Google Drive.')
    }

    // Log integration settings
    console.log('⚙️ [GoogleDriveFolders] Integration settings:', {
      parentFolderId: integration.data?.parentFolderId || 'not set',
      parentFolderName: integration.data?.parentFolderName || 'not set',
      parentFolderPath: integration.data?.parentFolderPath || 'not set',
      autoCreateYearFolders: integration.data?.autoCreateYearFolders || false,
      folderNamingPattern: integration.data?.folderNamingPattern || 'client-only',
      customNamingTemplate: integration.data?.customNamingTemplate || 'not set'
    })

    // Create Google Drive service instance
    console.log('🔧 [GoogleDriveFolders] Creating Google Drive service instance...')
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

    console.log('✅ [GoogleDriveFolders] Google Drive service created')

    // Perform health check
    console.log('🏥 [GoogleDriveFolders] Performing health check...')
    const healthCheck = await driveService.healthCheck()
    if (!healthCheck) {
      console.log('❌ [GoogleDriveFolders] Health check failed - attempting token refresh')
      try {
        const refreshed = await driveService.refreshTokenIfNeeded()
        if (!refreshed) {
          console.log('❌ [GoogleDriveFolders] Token refresh failed')
          return ApiErrors.badRequest('Google Drive connection expired. Please reconnect Google Drive in Settings > Integrations.')
        }
        console.log('✅ [GoogleDriveFolders] Token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ [GoogleDriveFolders] Token refresh error:', refreshError)
        
        // Check if it's an invalid refresh token error
        if (refreshError instanceof Error && 
            (refreshError.message.includes('invalid_request') || 
             refreshError.message.includes('invalid_grant') ||
             refreshError.message.includes('refresh_token'))) {
          console.log('🔄 [GoogleDriveFolders] Invalid refresh token - user needs to reconnect')
          return ApiErrors.badRequest('Google Drive connection expired. Please reconnect Google Drive in Settings > Integrations.')
        }
        
        return ApiErrors.unauthorized()
      }
    } else {
      console.log('✅ [GoogleDriveFolders] Health check passed')
    }

    // Create shoot folder
    console.log('🗂️ [GoogleDriveFolders] Creating shoot folder structure...')
    console.log('📋 [GoogleDriveFolders] Folder creation parameters:', {
      clientName,
      shootTitle,
      shootDate
    })

    const folder = await driveService.createShootFolder(clientName, shootTitle, shootDate)
    
    console.log('✅ [GoogleDriveFolders] Shoot folder created successfully:', {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
      path: folder.path
    })

    // Return success response
    const response = ApiSuccess.created({ folder }, 'Shoot folder created successfully')
    console.log('📤 [GoogleDriveFolders] Sending success response:', response)
    
    return response
    
  } catch (error) {
    console.error('❌ [GoogleDriveFolders] Error creating shoot folder:', error)
    console.error('🔍 [GoogleDriveFolders] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    // Handle specific Google Drive errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.log('🔄 [GoogleDriveFolders] Authentication error - token may be expired')
        return ApiErrors.unauthorized()
      }
      
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        console.log('🚫 [GoogleDriveFolders] Permission error')
        return ApiErrors.forbidden()
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.log('⏰ [GoogleDriveFolders] Rate limit error')
        return ApiErrors.rateLimit()
      }

      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        console.log('📁 [GoogleDriveFolders] Folder already exists - this is typically fine')
        return ApiErrors.badRequest('Folder already exists')
      }
    }
    
    // Generic error response
    console.log('❌ [GoogleDriveFolders] Returning generic error response')
    return ApiErrors.internalError('Failed to create Google Drive folder. Please check your connection and try again.')
  }
} 