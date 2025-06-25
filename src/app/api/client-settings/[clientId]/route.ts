import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { 
  getClientSettings, 
  upsertClientSettings, 
  deleteClientSettings,
  toClientStorageSettings 
} from '@/lib/db/client-settings'
import { getClientById } from '@/lib/db/clients'
import { ClientStorageSettings } from '@/lib/types/settings'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { clientId: clientIdParam } = await getValidatedParams(params)
    const clientId = validateId(clientIdParam, 'Client')

    console.log('📖 [ClientSettings] Loading settings for client:', clientId, 'user:', user.email)

    // Check if client exists and belongs to user
    const client = await getClientById(clientId)
    if (!client) {
      return ApiErrors.notFound('Client')
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
      return ApiSuccess.ok({ clientSettings: defaultSettings })
    }

    // Convert to ClientStorageSettings format
    const clientSettings = toClientStorageSettings({
      ...dbSettings,
      clientName: client.name
    })

    console.log('📖 [ClientSettings] Loaded settings:', clientSettings)

    return ApiSuccess.ok({ clientSettings })
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error loading client settings:', error)
    return ApiErrors.internalError('Failed to load client settings')
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { clientId: clientIdParam } = await getValidatedParams(params)
    const clientId = validateId(clientIdParam, 'Client')

    const settings = await getValidatedBody<Partial<ClientStorageSettings>>(req)
    console.log('💾 [ClientSettings] Saving settings for client:', clientId, 'user:', user.email)
    console.log('💾 [ClientSettings] Settings data:', settings)

    // Check if client exists
    const client = await getClientById(clientId)
    if (!client) {
      return ApiErrors.notFound('Client')
    }

    // Update client settings
    const updatedSettings = await upsertClientSettings(clientId, user.email, settings)
    
    console.log('✅ [ClientSettings] Settings saved successfully')

    const clientSettings = toClientStorageSettings({
      ...updatedSettings,
      clientName: client.name
    })

    return ApiSuccess.ok({ 
      clientSettings 
    }, 'Client settings saved successfully')
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error saving client settings:', error)
    return ApiErrors.internalError('Failed to save client settings')
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { clientId: clientIdParam } = await getValidatedParams(params)
    const clientId = validateId(clientIdParam, 'Client')

    console.log('🗑️ [ClientSettings] Deleting settings for client:', clientId, 'user:', user.email)

    // Delete client settings
    const deleted = await deleteClientSettings(clientId, user.email)
    
    if (deleted) {
      console.log('✅ [ClientSettings] Settings deleted successfully')
      return ApiSuccess.ok({}, 'Client settings deleted successfully')
    } else {
      return ApiErrors.notFound('Client settings')
    }
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error deleting client settings:', error)
    return ApiErrors.internalError('Failed to delete client settings')
  }
} 