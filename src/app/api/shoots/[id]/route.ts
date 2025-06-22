import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getShootById, updateShootStatus, deleteShoot, getPostIdeasForShoot } from '@/lib/db/shoots'

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
      postIdeasCount: shoot.postIdeasCount
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

    // Delete the shoot
    const success = await deleteShoot(shootId)
    
    if (!success) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Shoot deleted successfully'
    })

  } catch (error) {
    console.error('Delete shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 