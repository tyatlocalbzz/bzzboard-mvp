import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllClients, createClient } from '@/lib/db/clients'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📖 [ClientsAPI] Loading all clients for user:', user.email)

    // Get all clients
    const dbClients = await getAllClients()

    console.log('📖 [ClientsAPI] Loaded', dbClients.length, 'clients from database')

    // Transform database clients to match ClientData interface
    const clients = dbClients.map(client => ({
      id: client.id.toString(), // Convert number to string
      name: client.name,
      type: 'client' as const, // Add required type field
      activeProjects: client.activeProjects,
      primaryContactName: client.primaryContactName,
      primaryContactEmail: client.primaryContactEmail,
      primaryContactPhone: client.primaryContactPhone,
      website: client.website,
      socialMedia: client.socialMedia,
      notes: client.notes
    }))

    console.log('📖 [ClientsAPI] Transformed clients:', clients.map(c => ({ id: c.id, name: c.name, type: c.type })))

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
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { 
      name, 
      primaryContactName, 
      primaryContactEmail, 
      primaryContactPhone,
      website,
      socialMedia,
      notes 
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Basic validation for email format if provided
    if (primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryContactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Basic validation for website URL if provided
    if (website && website.trim() && !website.startsWith('http')) {
      return NextResponse.json(
        { error: 'Website must start with http:// or https://' },
        { status: 400 }
      )
    }

    // Create the client
    const newClient = await createClient({
      name,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      website,
      socialMedia: socialMedia || {},
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
        primaryContactName: newClient.primaryContactName,
        primaryContactEmail: newClient.primaryContactEmail,
        primaryContactPhone: newClient.primaryContactPhone,
        website: newClient.website,
        socialMedia: newClient.socialMedia,
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