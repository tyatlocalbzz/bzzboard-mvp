import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getShootById, updateShootStatus, deleteShoot, getPostIdeasForShoot } from '@/lib/db/shoots'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const shootId = parseInt(id)
    if (isNaN(shootId)) {
      return NextResponse.json({ error: 'Invalid shoot ID' }, { status: 400 })
    }

    // Get shoot details
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    // Get post ideas for this shoot
    const postIdeasData = await getPostIdeasForShoot(shootId)

    // Transform post ideas to match frontend expectations
    const postIdeas = postIdeasData.map(postIdea => ({
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      caption: postIdea.caption,
      status: postIdea.status || 'planned', // Include status field
      shotList: postIdea.shotList || [], // Include shotList for frontend
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
      // Include Google Calendar fields for frontend
      googleCalendarEventId: shoot.googleCalendarEventId,
      googleCalendarSyncStatus: shoot.googleCalendarSyncStatus,
      googleCalendarError: shoot.googleCalendarError
    }

    return NextResponse.json({
      success: true,
      shoot: transformedShoot,
      postIdeas
    })

  } catch (error) {
    console.error('Get shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const shootId = parseInt(id)
    if (isNaN(shootId)) {
      return NextResponse.json({ error: 'Invalid shoot ID' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { status, action } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Prepare timestamps based on status
    const timestamps: { startedAt?: Date; completedAt?: Date } = {}
    
    if (status === 'active' && action === 'start') {
      timestamps.startedAt = new Date()
    } else if (status === 'completed' && action === 'complete') {
      timestamps.completedAt = new Date()
    }

    // Update shoot status
    const updatedShoot = await updateShootStatus(shootId, status, timestamps)
    
    if (!updatedShoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Shoot status changed to ${status}`,
      shoot: {
        id: updatedShoot.id,
        title: updatedShoot.title,
        status: updatedShoot.status,
        startedAt: updatedShoot.startedAt?.toISOString(),
        completedAt: updatedShoot.completedAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('Update shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const shootId = parseInt(id)
    if (isNaN(shootId)) {
      return NextResponse.json({ error: 'Invalid shoot ID' }, { status: 400 })
    }

    // Get shoot details first to check for Google Calendar integration
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    let calendarEventDeleted = false

    // Delete from Google Calendar if event exists
    if (shoot.googleCalendarEventId && session.user?.email) {
      try {
        const calendarSync = new GoogleCalendarSync()
        calendarEventDeleted = await calendarSync.deleteCalendarEvent(
          session.user.email,
          shoot.googleCalendarEventId
        )
        console.log('📅 [API] Calendar event deletion result:', calendarEventDeleted)
      } catch (calendarError) {
        console.error('⚠️ [API] Failed to delete calendar event:', calendarError)
        // Don't fail the entire operation if calendar deletion fails
      }
    }

    // Soft delete the shoot (pass user ID for audit trail)
    const userId = session.user?.id ? parseInt(session.user.id) : undefined
    const success = await deleteShoot(shootId, userId)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete shoot' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Shoot deleted successfully',
      calendarEventRemoved: calendarEventDeleted,
      // Include recovery info
      recoveryNote: 'This shoot can be restored from the admin panel within 30 days'
    })

  } catch (error) {
    console.error('❌ [API] Delete shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 