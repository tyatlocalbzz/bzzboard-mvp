import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDeletedShoots, restoreShoot } from '@/lib/db/shoots'

export async function GET() {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Get deleted shoots
    const deletedShoots = await getDeletedShoots()

    // Transform for frontend
    const transformedShoots = deletedShoots.map(shoot => ({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client?.name || 'Unknown Client',
      scheduledAt: shoot.scheduledAt.toISOString(),
      duration: shoot.duration,
      location: shoot.location || '',
      status: shoot.status,
      deletedAt: shoot.deletedAt?.toISOString(),
      deletedBy: shoot.deletedBy,
      postIdeasCount: shoot.postIdeasCount
    }))

    return NextResponse.json({
      success: true,
      deletedShoots: transformedShoots
    })

  } catch (error) {
    console.error('❌ [API] Get deleted shoots error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const { shootId, action } = await request.json()

    if (!shootId || !action) {
      return NextResponse.json({ error: 'Shoot ID and action are required' }, { status: 400 })
    }

    if (action === 'restore') {
      const success = await restoreShoot(shootId)
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to restore shoot' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Shoot restored successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('❌ [API] Restore shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 