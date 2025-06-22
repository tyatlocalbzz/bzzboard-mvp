import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { uploadedFiles, shoots, postIdeas, clients, clientSettings } from '@/lib/db/schema'
import { getIntegration } from '@/lib/db/integrations'
import { UnifiedGoogleDriveService } from '@/lib/services/google-drive-unified'
import { eq, and } from 'drizzle-orm'
import { GoogleDriveSettings } from '@/lib/types/settings'

export async function POST(request: NextRequest) {
  console.log('📤 [Upload API] Starting file upload request...')
  
  try {
    // Check authentication
    console.log('🔐 [Upload API] Checking authentication...')
    const session = await getSession()
    if (!session?.user?.email) {
      console.log('❌ [Upload API] Authentication failed - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ [Upload API] Authentication successful:', { 
      userId: session.user?.id, 
      userEmail: session.user?.email 
    })

    // Parse form data
    console.log('📋 [Upload API] Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const postIdeaId = formData.get('postIdeaId') as string
    const shootId = formData.get('shootId') as string
    const notes = formData.get('notes') as string

    console.log('📊 [Upload API] Form data parsed:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      postIdeaId,
      shootId,
      notes: notes ? `${notes.length} characters` : 'none'
    })

    // Validation
    if (!file) {
      console.log('❌ [Upload API] Validation failed - no file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!shootId) {
      console.log('❌ [Upload API] Validation failed - shootId is required')
      return NextResponse.json({ error: 'shootId is required' }, { status: 400 })
    }

    if (!postIdeaId) {
      console.log('❌ [Upload API] Validation failed - postIdeaId is required')
      return NextResponse.json({ error: 'postIdeaId is required for file uploads' }, { status: 400 })
    }

    console.log('✅ [Upload API] Validation passed')

    // Get shoot and client information
    console.log('📋 [Upload API] Fetching shoot and client information...')
    const shootData = await db
      .select({
        shoot: shoots,
        client: clients,
        postIdea: postIdeas
      })
      .from(shoots)
      .innerJoin(clients, eq(shoots.clientId, clients.id))
      .innerJoin(postIdeas, eq(postIdeas.id, parseInt(postIdeaId)))
      .where(eq(shoots.id, parseInt(shootId)))
      .limit(1)

    if (shootData.length === 0) {
      console.log('❌ [Upload API] Shoot or post idea not found')
      return NextResponse.json({ error: 'Shoot or post idea not found' }, { status: 404 })
    }

    const { shoot, client, postIdea } = shootData[0]
    console.log('📊 [Upload API] Shoot data:', {
      shootId: shoot.id,
      shootTitle: shoot.title,
      clientId: client.id,
      clientName: client.name,
      postIdeaId: postIdea.id,
      postIdeaTitle: postIdea.title
    })

    // Get client settings for folder configuration
    console.log('🔧 [Upload API] Fetching client settings...')
    const settings = await db
      .select()
      .from(clientSettings)
      .where(and(
        eq(clientSettings.clientId, client.id),
        eq(clientSettings.userEmail, session.user.email)
      ))
      .limit(1)

    const clientSetting = settings[0] || null
    console.log('⚙️ [Upload API] Client settings:', {
      hasSettings: !!clientSetting,
      storageProvider: clientSetting?.storageProvider,
      storageFolderId: clientSetting?.storageFolderId,
      storageFolderPath: clientSetting?.storageFolderPath
    })

    // Check Google Drive integration
    console.log('🔍 [Upload API] Checking Google Drive integration...')
    const integration = await getIntegration(session.user.email, 'google-drive')
    if (!integration || !integration.connected || !integration.accessToken) {
      console.log('❌ [Upload API] Google Drive not connected')
      return NextResponse.json({ 
        error: 'Google Drive integration not connected. Please connect Google Drive in settings.' 
      }, { status: 400 })
    }
    console.log('✅ [Upload API] Google Drive integration found')

    // Create Google Drive service with proper parameters
    console.log('🔐 [Upload API] Creating Google Drive service...')
    const driveSettings: GoogleDriveSettings | undefined = clientSetting ? {
      parentFolderId: clientSetting.storageFolderId || undefined,
      parentFolderPath: clientSetting.storageFolderPath || undefined,
      folderNamingPattern: 'client-only',
      autoCreateYearFolders: false
    } : undefined

    const driveService = new UnifiedGoogleDriveService(
      integration.accessToken,
      integration.refreshToken || undefined,
      driveSettings
    )

    // Health check
    console.log('🏥 [Upload API] Performing Google Drive health check...')
    const isHealthy = await driveService.healthCheck()
    if (!isHealthy) {
      console.log('❌ [Upload API] Google Drive health check failed')
      return NextResponse.json({ 
        error: 'Google Drive connection failed. Please reconnect in settings.' 
      }, { status: 500 })
    }
    console.log('✅ [Upload API] Google Drive health check passed')

    // Create folder structure
    console.log('🗂️ [Upload API] Creating folder structure...')
    const shootDate = new Date(shoot.scheduledAt).toISOString().split('T')[0]
    
    // Create shoot folder
    const shootFolder = await driveService.createShootFolder(
      client.name,
      shoot.title,
      shootDate
    )
    console.log('📁 [Upload API] Shoot folder created:', {
      id: shootFolder.id,
      name: shootFolder.name,
      webViewLink: shootFolder.webViewLink
    })

    // Create post idea folder (always since we require postIdeaId)
    console.log('🎯 [Upload API] Creating post idea folder...')
    const postIdeaFolder = await driveService.createPostIdeaFolder(
      postIdea.title,
      shootFolder.id
    )
    
    // Get the raw-files subfolder ID - the createPostIdeaFolder should return the post idea folder, 
    // and we need to get the raw-files subfolder within it
    const rawFilesFolder = await driveService.findOrCreateFolder('raw-files', postIdeaFolder.id)
    const targetFolderId = rawFilesFolder.id
    const folderPath = await driveService.getFolderPath(rawFilesFolder.id)
    
    console.log('📁 [Upload API] Post idea folder structure created:', {
      postIdeaFolderId: postIdeaFolder.id,
      rawFilesFolderId: rawFilesFolder.id,
      folderPath
    })

    // Convert File to Buffer for upload
    console.log('📦 [Upload API] Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('✅ [Upload API] File converted to buffer:', {
      bufferSize: buffer.length,
      originalSize: file.size
    })

    // Upload file to Google Drive
    console.log('🚀 [Upload API] Uploading file to Google Drive...')
    const driveFile = await driveService.uploadFile(
      buffer,
      file.name,
      targetFolderId,
      file.type
    )
    console.log('✅ [Upload API] File uploaded to Google Drive:', {
      driveFileId: driveFile.id,
      fileName: driveFile.name,
      size: driveFile.size,
      webViewLink: driveFile.webViewLink
    })

    // Create notes file if notes provided
    if (notes && notes.trim()) {
      console.log('📝 [Upload API] Creating notes file...')
      const notesFileName = `${file.name.split('.')[0]}_notes.txt`
      await driveService.createNotesFile(
        notes.trim(),
        notesFileName,
        targetFolderId
      )
      console.log('✅ [Upload API] Notes file created')
    }

    // Save file metadata to database
    console.log('💾 [Upload API] Saving file metadata to database...')
    const uploadData = {
      postIdeaId: parseInt(postIdeaId), // Always provided now
      shootId: parseInt(shootId),
      fileName: file.name,
      filePath: driveFile.webViewLink,
      fileSize: file.size,
      mimeType: file.type,
      googleDriveId: driveFile.id,
    }

    const [savedFile] = await db.insert(uploadedFiles).values(uploadData).returning()
    console.log('✅ [Upload API] File metadata saved to database:', {
      id: savedFile.id,
      fileName: savedFile.fileName,
      filePath: savedFile.filePath
    })

    // Prepare response
    const response = {
      success: true,
      file: {
        id: savedFile.id,
        fileName: savedFile.fileName,
        fileSize: savedFile.fileSize,
        mimeType: savedFile.mimeType,
        driveFileId: savedFile.googleDriveId,
        webViewLink: savedFile.filePath,
        uploadedAt: savedFile.uploadedAt.toISOString()
      },
      uploadDestination: {
        type: 'post-idea',
        postIdeaId: parseInt(postIdeaId),
        shootId: parseInt(shootId),
        hasNotes: !!(notes && notes.trim())
      },
      folderStructure: {
        shootFolder: shootFolder.name,
        targetFolder: `${postIdea.title}/raw-files`,
        fullPath: folderPath
      }
    }

    console.log('🎉 [Upload API] Upload completed successfully!')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [Upload API] Upload process failed:', error)
    console.error('🔍 [Upload API] Error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Google Drive')) {
        return NextResponse.json(
          { error: 'Google Drive upload failed. Please check your connection and try again.' },
          { status: 500 }
        )
      }
      if (error.message.includes('folder')) {
        return NextResponse.json(
          { error: 'Failed to create folder structure. Please check permissions.' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const shootId = searchParams.get('shootId')
    const postIdeaId = searchParams.get('postIdeaId')

    console.log('📋 [Upload API] Fetching uploads:', { shootId, postIdeaId })

    // Build query conditions
    const conditions = []
    if (shootId) {
      conditions.push(eq(uploadedFiles.shootId, parseInt(shootId)))
    }
    if (postIdeaId) {
      conditions.push(eq(uploadedFiles.postIdeaId, parseInt(postIdeaId)))
    }

    // Query database for uploaded files
    const files = await db
      .select()
      .from(uploadedFiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(uploadedFiles.uploadedAt)

    console.log('📊 [Upload API] Found uploaded files:', {
      count: files.length,
      shootId,
      postIdeaId
    })

    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        webViewLink: file.filePath,
        driveFileId: file.googleDriveId,
        uploadedAt: file.uploadedAt.toISOString(),
        postIdeaId: file.postIdeaId,
        shootId: file.shootId
      }))
    })

  } catch (error) {
    console.error('❌ [Upload API] Get uploads failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 