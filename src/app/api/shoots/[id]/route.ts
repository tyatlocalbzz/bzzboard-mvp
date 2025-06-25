import { NextRequest } from 'next/server'
import { updateShootStatus, updateShoot, deleteShoot, getPostIdeasForShoot } from '@/lib/db/shoots'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { ApiErrors, ApiSuccess, getValidatedParams, getValidatedBody, validateId } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getShootById } from '@/lib/db/shoots'

interface ShootUpdateBody {
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
  action?: 'start' | 'complete'
  title?: string
  duration?: number
  location?: string
  notes?: string
  scheduledAt?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

    const { id } = await getValidatedParams(params)
    const shootId = validateId(id, 'shoot')

    // Get shoot details
    const shoot = await getShootById(shootId)
    if (!shoot) return ApiErrors.notFound('Shoot')

    // Get post ideas for this shoot
    const postIdeasData = await getPostIdeasForShoot(shootId)

    // Transform post ideas to match frontend expectations
    const postIdeas = postIdeasData.map(postIdea => ({
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      caption: postIdea.caption,
      status: postIdea.status || 'planned',
      shotList: postIdea.shotList || [],
      notes: postIdea.notes,
      completed: postIdea.completed || false,
      shots: (postIdea.shotList || []).map((shotText: string, index: number) => ({
        id: index + 1,
        text: shotText,
        completed: postIdea.completed || false,
        postIdeaId: postIdea.id
      }))
    }))

    // Transform shoot data to match frontend expectations
    const transformedShoot = {
      id: shoot.id,
      title: shoot.title,
      client: shoot.client?.name || 'Unknown Client',
      scheduledAt: shoot.scheduledAt.toISOString(),
      duration: shoot.duration,
      location: shoot.location || '',
      status: shoot.status,
      startedAt: shoot.startedAt?.toISOString(),
      notes: shoot.notes,
      postIdeasCount: shoot.postIdeasCount,
      googleCalendarEventId: shoot.googleCalendarEventId,
      googleCalendarSyncStatus: shoot.googleCalendarSyncStatus,
      googleCalendarError: shoot.googleCalendarError
    }

    return ApiSuccess.ok({
      shoot: transformedShoot,
      postIdeas
    })

  } catch (error) {
    console.error('❌ [Shoots API] Get shoot error:', error)
    return ApiErrors.internalError()
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
        // Log the specific error type for better debugging
        if (calendarError instanceof Error && calendarError.message.includes('not connected')) {
          console.warn('⚠️ [Shoots API] Skipping calendar cleanup - Google Calendar not connected')
        } else {
          console.warn('⚠️ [Shoots API] Failed to cleanup calendar event:', calendarError)
        }
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