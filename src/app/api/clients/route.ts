import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllClientsAsClientData, createClient } from '@/lib/db/clients'
import { clientValidation } from '@/lib/validation/client-validation'

export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all clients as ClientData format (with string IDs)
    const clients = await getAllClientsAsClientData()

    return NextResponse.json({ 
      success: true,
      clients 
    })
    
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Validate using shared validation library
    const validation = clientValidation.clientData({
      name,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      website
    })

    if (!validation.valid) {
      // Return the first error found
      const firstError = Object.values(validation.errors)[0]
      return NextResponse.json(
        { error: firstError },
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