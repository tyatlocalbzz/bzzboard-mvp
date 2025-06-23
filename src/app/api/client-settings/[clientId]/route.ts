import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { 
  getClientSettings, 
  upsertClientSettings, 
  deleteClientSettings,
  toClientStorageSettings 
} from '@/lib/db/client-settings'
import { getClientById } from '@/lib/db/clients'
import { ClientStorageSettings } from '@/lib/types/settings'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId: clientIdParam } = await params
    const clientId = parseInt(clientIdParam)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    console.log('📖 [ClientSettings] Loading settings for client:', clientId, 'user:', user.email)

    // Check if client exists and belongs to user
    const client = await getClientById(clientId)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get client settings
    const dbSettings = await getClientSettings(clientId, user.email)
    
    if (!dbSettings) {
      // Return default settings if none exist
      const defaultSettings: ClientStorageSettings = {
        clientId,
        clientName: client.name,
        storageProvider: 'google-drive',
        customNaming: false,
      }
      
      console.log('📖 [ClientSettings] No settings found, returning defaults')
      return NextResponse.json({ 
        success: true,
        clientSettings: defaultSettings 
      })
    }

    // Convert to ClientStorageSettings format
    const clientSettings = toClientStorageSettings({
      ...dbSettings,
      clientName: client.name
    })

    console.log('📖 [ClientSettings] Loaded settings:', clientSettings)

    return NextResponse.json({ 
      success: true,
      clientSettings 
    })
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error loading client settings:', error)
    return NextResponse.json(
      { error: 'Failed to load client settings' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId: clientIdParam } = await params
    const clientId = parseInt(clientIdParam)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    const settings: Partial<ClientStorageSettings> = await req.json()
    console.log('💾 [ClientSettings] Saving settings for client:', clientId, 'user:', user.email)
    console.log('💾 [ClientSettings] Settings data:', settings)

    // Check if client exists
    const client = await getClientById(clientId)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Update client settings
    const updatedSettings = await upsertClientSettings(clientId, user.email, settings)
    
    console.log('✅ [ClientSettings] Settings saved successfully')

    return NextResponse.json({ 
      success: true,
      message: 'Client settings saved successfully',
      clientSettings: toClientStorageSettings({
        ...updatedSettings,
        clientName: client.name
      })
    })
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error saving client settings:', error)
    return NextResponse.json(
      { error: 'Failed to save client settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId: clientIdParam } = await params
    const clientId = parseInt(clientIdParam)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    console.log('🗑️ [ClientSettings] Deleting settings for client:', clientId, 'user:', user.email)

    // Delete client settings
    const deleted = await deleteClientSettings(clientId, user.email)
    
    if (deleted) {
      console.log('✅ [ClientSettings] Settings deleted successfully')
      return NextResponse.json({ 
        success: true,
        message: 'Client settings deleted successfully'
      })
    } else {
      return NextResponse.json({ 
        error: 'Client settings not found' 
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error deleting client settings:', error)
    return NextResponse.json(
      { error: 'Failed to delete client settings' },
      { status: 500 }
    )
  }
} 