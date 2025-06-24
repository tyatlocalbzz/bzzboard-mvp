import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getClientByIdAsClientData, updateClient, deleteClient } from '@/lib/db/clients'
import { clientValidation } from '@/lib/validation/client-validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('📖 [ClientAPI] GET request for client:', id)
    
    const user = await getCurrentUserForAPI()
    console.log('📖 [ClientAPI] Current user:', user?.email || 'none')
    
    if (!user || !user.email) {
      console.log('❌ [ClientAPI] Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = parseInt(id)
    if (isNaN(clientId)) {
      console.log('❌ [ClientAPI] Invalid client ID:', id)
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    console.log('🔍 [ClientAPI] Looking up client:', clientId)
    const client = await getClientByIdAsClientData(clientId)
    
    if (!client) {
      console.log('❌ [ClientAPI] Client not found:', clientId)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log('✅ [ClientAPI] Client found:', client.name)
    return NextResponse.json({
      success: true,
      client
    })

  } catch (error) {
    console.error('❌ [ClientAPI] Get client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = parseInt(id)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

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

    const updatedClient = await updateClient(clientId, {
      name,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      website,
      socialMedia: socialMedia || {},
      notes
    })

    if (!updatedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
      client: {
        id: updatedClient.id.toString(),
        name: updatedClient.name,
        type: 'client' as const,
        primaryContactName: updatedClient.primaryContactName,
        primaryContactEmail: updatedClient.primaryContactEmail,
        primaryContactPhone: updatedClient.primaryContactPhone,
        website: updatedClient.website,
        socialMedia: updatedClient.socialMedia,
        notes: updatedClient.notes
      }
    })

  } catch (error) {
    console.error('Update client error:', error)
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
    const { id } = await params
    
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = parseInt(id)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    const result = await deleteClient(clientId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 