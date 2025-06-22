import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAllShoots, getShootsByClient, createShoot } from '@/lib/db/shoots'
import { getClientByName } from '@/lib/db/clients'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('client')

    let shoots
    if (clientName && clientName !== 'All Clients') {
      // Get client ID first
      const client = await getClientByName(clientName)
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      shoots = await getShootsByClient(client.id)
    } else {
      shoots = await getAllShoots()
    }

    // Transform data to match frontend expectations
    const transformedShoots = shoots.map(shoot => ({
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
    }))

    return NextResponse.json({
      success: true,
      shoots: transformedShoots
    })

  } catch (error) {
    console.error('Get shoots error:', error)
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

    // Parse request body
    const body = await request.json()
    const { title, clientName, date, time, duration, location, notes } = body

    // Validate required fields
    if (!title || !clientName || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, clientName, date, time' },
        { status: 400 }
      )
    }

    // Get client by name
    const client = await getClientByName(clientName)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Combine date and time into a proper DateTime
    const scheduledAt = new Date(`${date}T${time}:00`)
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Invalid date or time format' }, { status: 400 })
    }

    // Create the shoot
    const newShoot = await createShoot({
      title,
      clientId: client.id,
      scheduledAt,
      duration: parseInt(duration) || 60,
      location,
      notes
    })

    return NextResponse.json({
      success: true,
      message: 'Shoot scheduled successfully',
      shoot: {
        id: newShoot.id,
        title: newShoot.title,
        client: client.name,
        scheduledAt: newShoot.scheduledAt.toISOString(),
        duration: newShoot.duration,
        location: newShoot.location,
        status: newShoot.status,
        notes: newShoot.notes
      }
    })

  } catch (error) {
    console.error('Create shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 