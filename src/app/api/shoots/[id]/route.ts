import { NextRequest } from 'next/server'
import { updateShootStatus, updateShoot, deleteShoot, getPostIdeasWithFilesForShoot, getMiscFilesForShoot } from '@/lib/db/shoots'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { ApiErrors, ApiSuccess, getValidatedParams, getValidatedBody, validateId } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getShootById } from '@/lib/db/shoots'
import type { ShootUpdateBody } from '@/lib/types/shoots'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    // Parameter validation
    const params = await getValidatedParams(context.params)
    const shootId = validateId(params.id, 'Shoot')

    console.log('🔍 [ShootAPI] GET request for shoot:', shootId)

    // Get shoot data
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return ApiErrors.notFound('Shoot')
    }

    console.log('📊 [ShootAPI] Found shoot:', {
      id: shoot.id,
      title: shoot.title,
      status: shoot.status
    })

    // Get post ideas with uploaded files
    const postIdeasWithFiles = await getPostIdeasWithFilesForShoot(shootId)
    console.log('📋 [ShootAPI] Found post ideas with files:', {
      count: postIdeasWithFiles.length,
      withFiles: postIdeasWithFiles.filter(p => p.uploadedFiles.length > 0).length
    })

    // Get misc files
    const miscFiles = await getMiscFilesForShoot(shootId)
    console.log('📂 [ShootAPI] Found misc files:', miscFiles.length)

    // Transform post ideas to match ExtendedPostIdeaWithFiles interface
    const enhancedPostIdeas = postIdeasWithFiles.map(postIdea => {
      const uploadedFiles = postIdea.uploadedFiles || []
      
      // Create drive folder info if files exist
      const driveFolder = uploadedFiles.length > 0 && uploadedFiles[0].driveFolderId ? {
        id: uploadedFiles[0].driveFolderId,
        webViewLink: `https://drive.google.com/drive/folders/${uploadedFiles[0].driveFolderId}`,
        path: `/Client/${postIdea.title}/raw-files`
      } : undefined

      return {
        id: postIdea.id,
        title: postIdea.title,
        platforms: postIdea.platforms,
        contentType: postIdea.contentType as 'photo' | 'video' | 'reel' | 'story',
        caption: postIdea.caption,
        shotList: postIdea.shotList || [],
        notes: postIdea.notes,
        status: postIdea.status as 'planned' | 'shot' | 'uploaded',
        completed: postIdea.completed || false,
         uploadedFiles: uploadedFiles.map((file: { 
          id: number; 
          fileName: string; 
          fileSize: number; 
          mimeType: string; 
          driveFileWebViewLink?: string; 
          driveFileDownloadLink?: string; 
          driveFileId?: string; 
          uploadedAt?: string | Date;
          postIdeaId?: number;
          shootId?: number;
          driveFolderId?: string;
        }) => ({
          ...file,
          webViewLink: file.driveFileWebViewLink || '',
          webContentLink: file.driveFileDownloadLink || '',
          driveFileId: file.driveFileId || '',
          uploadedAt: typeof file.uploadedAt === 'string' 
            ? file.uploadedAt 
            : file.uploadedAt?.toISOString() || new Date().toISOString()
        })),
        driveFolder,
        fileCount: uploadedFiles.length
      }
    })

    // Transform misc files
    const transformedMiscFiles = miscFiles.map(file => ({
      ...file,
      webViewLink: file.driveFileWebViewLink || '',
      webContentLink: file.driveFileDownloadLink || '',
      driveFileId: file.driveFileId || '',
      uploadedAt: typeof file.uploadedAt === 'string' 
        ? file.uploadedAt 
        : file.uploadedAt?.toISOString() || new Date().toISOString()
    }))

    console.log('✅ [ShootAPI] Returning enhanced shoot data with files')

    return ApiSuccess.ok({
      shoot,
      postIdeas: enhancedPostIdeas,
      miscFiles: transformedMiscFiles
    }, 'Shoot data retrieved successfully')

  } catch (error) {
    console.error('❌ [ShootAPI] Error in GET:', error)
    return ApiErrors.internalError('Failed to fetch shoot data')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

    const { id } = await getValidatedParams(params)
    const shootId = validateId(id, 'shoot')

    const body = await getValidatedBody<ShootUpdateBody>(request)
    const { status, action, title, duration, location, notes, scheduledAt } = body

    // Handle status updates
    if (status) {
      const timestamps: { startedAt?: Date; completedAt?: Date } = {}
      
      if (status === 'active' && action === 'start') {
        timestamps.startedAt = new Date()
      } else if (status === 'completed' && action === 'complete') {
        timestamps.completedAt = new Date()
      }

      const updatedShoot = await updateShootStatus(shootId, status, timestamps)
      if (!updatedShoot) return ApiErrors.notFound('Shoot')

      return ApiSuccess.ok({
        shoot: {
          id: updatedShoot.id,
          title: updatedShoot.title,
          status: updatedShoot.status,
          startedAt: updatedShoot.startedAt?.toISOString(),
          completedAt: updatedShoot.completedAt?.toISOString()
        }
      }, `Shoot status changed to ${status}`)
    }

    // Handle shoot details updates
    if (title || duration || location !== undefined || notes !== undefined || scheduledAt) {
      const updateData: {
        title?: string
        duration?: number
        location?: string
        notes?: string
        scheduledAt?: Date
      } = {}
      
      if (title) updateData.title = title
      if (duration) updateData.duration = duration
      if (location !== undefined) updateData.location = location
      if (notes !== undefined) updateData.notes = notes
      if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt)

      const updatedShoot = await updateShoot(shootId, updateData)
      if (!updatedShoot) return ApiErrors.notFound('Shoot')

      return ApiSuccess.ok({
        shoot: {
          id: updatedShoot.id,
          title: updatedShoot.title,
          duration: updatedShoot.duration,
          location: updatedShoot.location,
          notes: updatedShoot.notes,
          scheduledAt: updatedShoot.scheduledAt.toISOString(),
          status: updatedShoot.status
        }
      }, 'Shoot updated successfully')
    }

    return ApiErrors.badRequest('No valid update fields provided')

  } catch (error) {
    console.error('❌ [Shoots API] Update shoot error:', error)
    return ApiErrors.internalError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

    const { id } = await getValidatedParams(params)
    const shootId = validateId(id, 'shoot')

    // Check if shoot exists before deletion
    const shoot = await getShootById(shootId)
    if (!shoot) return ApiErrors.notFound('Shoot')

    // Handle Google Calendar cleanup if needed
    if (shoot.googleCalendarEventId) {
      try {
        const calendarSync = new GoogleCalendarSync()
        await calendarSync.deleteCalendarEvent(user.email!, shoot.googleCalendarEventId)
        console.log('✅ [Shoots API] Calendar event cleaned up during shoot deletion')
      } catch (calendarError) {
        console.warn('⚠️ [Shoots API] Failed to cleanup calendar event:', calendarError)
        // Continue with shoot deletion even if calendar cleanup fails
      }
    }

    // Delete the shoot
    const deleted = await deleteShoot(shootId)
    if (!deleted) return ApiErrors.internalError('Failed to delete shoot')

    return ApiSuccess.ok(null, 'Shoot deleted successfully')

  } catch (error) {
    console.error('❌ [Shoots API] Delete shoot error:', error)
    return ApiErrors.internalError()
  }
} 