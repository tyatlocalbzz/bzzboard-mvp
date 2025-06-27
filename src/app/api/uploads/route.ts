import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { uploadedFiles, shoots, postIdeas, clients, clientSettings } from '@/lib/db/schema'
import { getIntegration } from '@/lib/db/integrations'
import { UnifiedGoogleDriveService } from '@/lib/services/google-drive-unified'
import { eq, and } from 'drizzle-orm'
import { GoogleDriveSettings } from '@/lib/types/settings'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'



export async function POST(request: NextRequest) {
  try {
    console.log('📤 [Uploads API] Starting file upload request...')
    
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      console.log('❌ [Uploads API] Authentication failed')
      return ApiErrors.unauthorized()
    }
    console.log('✅ [Uploads API] Authentication successful:', user.email)

    // Parse and validate form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const postIdeaId = formData.get('postIdeaId') as string
    const shootId = formData.get('shootId') as string
    // const notes = formData.get('notes') as string // Not currently used in upload record

    // Validation
    if (!file) return ApiErrors.badRequest('No file provided')
    if (!shootId) return ApiErrors.badRequest('Shoot ID is required')
    // Note: postIdeaId is optional for misc files

    console.log('📊 [Uploads API] Upload request:', {
      fileName: file.name,
      fileSize: file.size,
      postIdeaId,
      shootId
    })

    // Get shoot and related data
    let shootData, postIdea = null
    
    if (postIdeaId) {
      // For files with post idea assignment
      const result = await db
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

      if (result.length === 0) {
        return ApiErrors.notFound('Shoot or post idea')
      }
      shootData = result[0]
      postIdea = result[0].postIdea
    } else {
      // For misc files without post idea
      const result = await db
        .select({
          shoot: shoots,
          client: clients
        })
        .from(shoots)
        .innerJoin(clients, eq(shoots.clientId, clients.id))
        .where(eq(shoots.id, parseInt(shootId)))
        .limit(1)

      if (result.length === 0) {
        return ApiErrors.notFound('Shoot')
      }
      shootData = { ...result[0], postIdea: null }
    }

    const { shoot, client } = shootData

    // Get client storage settings
    const settings = await db
      .select()
      .from(clientSettings)
      .where(and(
        eq(clientSettings.clientId, client.id),
        eq(clientSettings.userEmail, user.email)
      ))
      .limit(1)

    const clientSetting = settings[0] || null

    // Check Google Drive integration
    const integration = await getIntegration(user.email, 'google-drive')
    if (!integration?.connected || !integration.accessToken) {
      return ApiErrors.badRequest('Google Drive integration not connected. Please connect Google Drive in settings.')
    }

    // Create Google Drive service
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
    console.log('🏥 [Uploads API] Performing Google Drive health check...')
    const isHealthy = await driveService.healthCheck()
    if (!isHealthy) {
      console.log('❌ [Uploads API] Google Drive health check failed')
      return ApiErrors.internalError('Google Drive connection failed. Please reconnect in settings.')
    }
    console.log('✅ [Uploads API] Google Drive health check passed')

    // Create folder structure
    console.log('🗂️ [Uploads API] Creating folder structure...')
    console.log('📋 [Uploads API] Folder creation parameters:', {
      clientName: client.name,
      shootTitle: shoot.title,
      postIdeaTitle: postIdea?.title || 'misc-files',
      shootDate: new Date(shoot.scheduledAt).toISOString().split('T')[0]
    })
    
    const shootDate = new Date(shoot.scheduledAt).toISOString().split('T')[0]
    
    const shootFolder = await driveService.createShootFolder(
      client.name,
      shoot.title,
      shootDate
    )
    console.log('✅ [Uploads API] Shoot folder created:', shootFolder)

    let targetFolder
    if (postIdea) {
      // Create post idea specific folder
      const postIdeaFolder = await driveService.createPostIdeaFolder(
        postIdea.title,
        shootFolder.id
      )
      console.log('✅ [Uploads API] Post idea folder created:', postIdeaFolder)
      
      targetFolder = await driveService.findOrCreateFolder('raw-files', postIdeaFolder.id)
    } else {
      // Create misc files folder directly in shoot folder
      targetFolder = await driveService.findOrCreateFolder('misc-files', shootFolder.id)
      console.log('✅ [Uploads API] Misc files folder created')
    }
    const folderPath = await driveService.getFolderPath(targetFolder.id)

    // Upload file
    console.log('🚀 [Uploads API] Uploading file to Google Drive...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const driveFile = await driveService.uploadFile(
      buffer,
      file.name,
      targetFolder.id,
      file.type
    )

    // Save upload record to database
    const uploadRecord = await db.insert(uploadedFiles).values({
      shootId: parseInt(shootId),
      postIdeaId: postIdeaId ? parseInt(postIdeaId) : null,
      fileName: file.name,
      fileSize: file.size,
      filePath: folderPath,
      mimeType: file.type,
      googleDriveId: driveFile.id,
      // Add the new drive link fields
      driveFolderId: targetFolder.id,
      driveFileWebViewLink: driveFile.webViewLink,
      driveFileDownloadLink: driveFile.webContentLink
    }).returning()

    // ✨ AUTOMATIC STATUS UPDATE: When file is uploaded for a post idea, update status to 'uploaded'
    if (postIdeaId) {
      try {
        const { updatePostStatusOnFileUpload } = await import('@/lib/db/post-ideas')
        const statusResult = await updatePostStatusOnFileUpload(parseInt(postIdeaId))
        if (statusResult.updated) {
          console.log('📤 [Uploads API] Auto-updated post status to uploaded:', {
            postIdeaId: parseInt(postIdeaId),
            previousStatus: statusResult.previousStatus
          })
        } else {
          console.log('ℹ️ [Uploads API] Post status not updated:', {
            postIdeaId: parseInt(postIdeaId),
            currentStatus: statusResult.previousStatus,
            reason: 'Post not in "shot" status or already uploaded'
          })
        }
      } catch (error) {
        console.error('❌ [Uploads API] Failed to auto-update post status:', error)
        // Don't fail the upload if status update fails
      }
    }

    console.log('✅ [Uploads API] Upload completed successfully!')

    return ApiSuccess.created({
      uploadId: uploadRecord[0].id,
      fileName: file.name,
      fileSize: file.size,
      googleDriveFileId: driveFile.id,
      folderPath: folderPath,
      webViewLink: driveFile.webViewLink,
      shoot: {
        id: shoot.id,
        title: shoot.title
      },
      postIdea: postIdea ? {
        id: postIdea.id,
        title: postIdea.title
      } : null
    }, 'File uploaded successfully')

  } catch (error) {
    console.error('❌ [Uploads API] Upload process failed:', error)
    
    // Handle specific Google Drive errors
    if (error instanceof Error) {
      if (error.message.includes('Google Drive')) {
        return ApiErrors.internalError('Google Drive upload failed. Please check your connection and try again.')
      }
      if (error.message.includes('folder')) {
        return ApiErrors.internalError('Failed to create folder structure. Please check permissions.')
      }
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return ApiErrors.unauthorized()
      }
    }
    
    return ApiErrors.internalError('Upload failed')
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    const { searchParams } = new URL(request.url)
    const shootId = searchParams.get('shootId')
    const postIdeaId = searchParams.get('postIdeaId')

    // Build query conditions
    const conditions = []
    if (shootId) conditions.push(eq(uploadedFiles.shootId, parseInt(shootId)))
    if (postIdeaId) conditions.push(eq(uploadedFiles.postIdeaId, parseInt(postIdeaId)))

    // Fetch uploads with related data
    const uploads = await db
      .select({
        upload: uploadedFiles,
        shoot: shoots,
        postIdea: postIdeas,
        client: clients
      })
      .from(uploadedFiles)
      .leftJoin(shoots, eq(uploadedFiles.shootId, shoots.id))
      .leftJoin(postIdeas, eq(uploadedFiles.postIdeaId, postIdeas.id))
      .leftJoin(clients, eq(shoots.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(uploadedFiles.uploadedAt)

    const transformedUploads = uploads.map(row => ({
      id: row.upload.id,
      fileName: row.upload.fileName,
      fileSize: row.upload.fileSize,
      filePath: row.upload.filePath,
      mimeType: row.upload.mimeType,
      googleDriveFileId: row.upload.googleDriveId,
      uploadedAt: row.upload.uploadedAt?.toISOString(),
      shoot: row.shoot ? {
        id: row.shoot.id,
        title: row.shoot.title
      } : null,
      postIdea: row.postIdea ? {
        id: row.postIdea.id,
        title: row.postIdea.title
      } : null,
      client: row.client ? {
        id: row.client.id,
        name: row.client.name
      } : null
    }))

    return ApiSuccess.ok({
      uploads: transformedUploads,
      totalCount: transformedUploads.length
    })

  } catch (error) {
    console.error('❌ [Uploads API] Error fetching uploads:', error)
    return ApiErrors.internalError('Failed to fetch uploads')
  }
} 