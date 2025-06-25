import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllClientSettings, toClientStorageSettings } from '@/lib/db/client-settings'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    console.log('📖 [ClientSettings] Loading all client settings for user:', user.email)

    // Get all client settings for the user
    const dbSettings = await getAllClientSettings(user.email)
    
    // Convert to ClientStorageSettings format
    const clientSettings = dbSettings.map(toClientStorageSettings)

    console.log('📖 [ClientSettings] Loaded settings for', clientSettings.length, 'clients')

    return ApiSuccess.ok({
      clientSettings 
    })
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error loading client settings:', error)
    return ApiErrors.internalError('Failed to load client settings')
  }
} 