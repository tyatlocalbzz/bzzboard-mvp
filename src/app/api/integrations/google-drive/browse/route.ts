import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getIntegration } from '@/lib/db/integrations'
import { UnifiedGoogleDriveService } from '@/lib/services/google-drive-unified'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveBrowse] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const parentFolderId = searchParams.get('parentId') || undefined

    console.log('📂 [GoogleDriveBrowse] Browsing folders for user:', user.email)
    console.log('📂 [GoogleDriveBrowse] Parent ID:', parentFolderId || 'root')

    // Get Google Drive integration
    const integration = await getIntegration(user.email, 'google-drive')
    
    console.log('🔍 [GoogleDriveBrowse] Integration check:', {
      exists: !!integration,
      connected: integration?.connected,
      hasAccessToken: !!integration?.accessToken,
      hasRefreshToken: !!integration?.refreshToken,
      email: integration?.email
    })

    if (!integration) {
      console.log('❌ [GoogleDriveBrowse] No Google Drive integration found')
      return NextResponse.json(
        { error: 'Google Drive integration not found. Please connect Google Drive first.' },
        { status: 400 }
      )
    }

    if (!integration.connected) {
      console.log('❌ [GoogleDriveBrowse] Google Drive not connected')
      return NextResponse.json(
        { error: 'Google Drive not connected. Please connect Google Drive first.' },
        { status: 400 }
      )
    }

    if (!integration.accessToken) {
      console.log('❌ [GoogleDriveBrowse] No access token found')
      return NextResponse.json(
        { error: 'Google Drive access token missing. Please reconnect Google Drive.' },
        { status: 400 }
      )
    }

    console.log('🔐 [GoogleDriveBrowse] Creating Google Drive service for user:', integration.email)

    // Create Google Drive service instance with improved error handling
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
        return NextResponse.json(
          { error: 'Google Drive authentication expired. Please reconnect.' },
          { status: 401 }
        )
      }
    }

    console.log('🚀 [GoogleDriveBrowse] Attempting to browse folders...')

    // Browse folders with improved error handling
    const folders = await driveService.browseFolders(parentFolderId)
    
    console.log('📊 [GoogleDriveBrowse] Successfully found folders:', {
      count: folders.length,
      parentId: parentFolderId || 'root',
      folders: folders.map((f) => ({ id: f.id, name: f.name, path: f.path }))
    })

    return NextResponse.json({ 
      folders,
      parentId: parentFolderId || 'root',
      success: true
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
        return NextResponse.json(
          { error: 'Google Drive authentication expired. Please reconnect in the Integrations tab.' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        console.log('🚫 [GoogleDriveBrowse] Permission error')
        return NextResponse.json(
          { error: 'Insufficient permissions to access Google Drive. Please check your integration settings.' },
          { status: 403 }
        )
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.log('⏰ [GoogleDriveBrowse] Rate limit error')
        return NextResponse.json(
          { error: 'Google Drive rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
    }
    
    // Return mock data for development with clear indication
    console.log('🔄 [GoogleDriveBrowse] Returning mock data for development')
    
    return NextResponse.json({
      folders: [
        {
          id: 'mock-folder-1',
          name: 'Business Content',
          webViewLink: '',
          path: '/My Drive/Business Content'
        },
        {
          id: 'mock-folder-2',
          name: 'Client Work',
          webViewLink: '',
          path: '/My Drive/Client Work'
        },
        {
          id: 'mock-folder-3',
          name: 'Photography Projects',
          webViewLink: '',
          path: '/My Drive/Photography Projects'
        },
        {
          id: 'mock-folder-4',
          name: '2024 Content',
          webViewLink: '',
          path: '/My Drive/2024 Content'
        }
      ],
      parentId: 'root',
      mock: true,
      message: 'Using mock data due to API error'
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      console.log('❌ [GoogleDriveCreateFolder] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { folderName, parentId } = body

    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    console.log('📁 [GoogleDriveCreateFolder] Creating folder for user:', user.email)
    console.log('📋 [GoogleDriveCreateFolder] Parameters:', { folderName, parentId })

    // Get Google Drive integration
    const integration = await getIntegration(user.email, 'google-drive')
    
    if (!integration || !integration.connected || !integration.accessToken) {
      return NextResponse.json(
        { error: 'Google Drive not connected. Please connect Google Drive first.' },
        { status: 400 }
      )
    }

    console.log('🔐 [GoogleDriveCreateFolder] Creating Google Drive service')

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
        return NextResponse.json(
          { error: 'Google Drive authentication expired. Please reconnect.' },
          { status: 401 }
        )
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

    return NextResponse.json({ 
      folder: newFolder,
      success: true,
      message: `Folder "${folderName}" created successfully`
    })
    
  } catch (error) {
    console.error('❌ [GoogleDriveCreateFolder] Error creating folder:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        )
      }
      
      if (error.message.includes('Folder name cannot be empty')) {
        return NextResponse.json(
          { error: 'Please enter a valid folder name' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Google Drive authentication expired. Please reconnect.' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create folders in this location.' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create folder. Please try again.' },
      { status: 500 }
    )
  }
} 