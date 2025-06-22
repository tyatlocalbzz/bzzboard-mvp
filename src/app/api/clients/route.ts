import { NextRequest, NextResponse } from 'next/server'
import { getSession, getCurrentUser } from '@/lib/auth/session'
import { getAllClients, createClient } from '@/lib/db/clients'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📖 [ClientsAPI] Loading all clients for user:', user.email)

    // Get all clients
    const clients = await getAllClients()

    console.log('📖 [ClientsAPI] Loaded', clients.length, 'clients')

    return NextResponse.json({ 
      success: true,
      clients 
    })
    
  } catch (error) {
    console.error('❌ [ClientsAPI] Error loading clients:', error)
    return NextResponse.json(
      { error: 'Failed to load clients' },
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
    const { name, email, phone, notes } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Create the client
    const newClient = await createClient({
      name,
      email,
      phone,
      notes
    })

    return NextResponse.json({
      success: true,
      message: 'Client created successfully',
      client: {
        id: newClient.id.toString(),
        name: newClient.name,
        type: 'client' as const,
        activeProjects: 0,
        email: newClient.email,
        phone: newClient.phone,
        notes: newClient.notes
      }
    })

  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 