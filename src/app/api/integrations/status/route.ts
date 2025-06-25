import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getUserIntegrations } from '@/lib/db/integrations'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    console.log('🔍 [IntegrationsStatus] Current user:', { email: user?.email })
    
    if (!user?.email) {
      console.log('❌ [IntegrationsStatus] No user email found')
      return ApiErrors.unauthorized()
    }

    // Get user integrations from database
    console.log('📋 [IntegrationsStatus] Fetching integrations for user:', user.email)
    const integrations = await getUserIntegrations(user.email)
    console.log('📊 [IntegrationsStatus] Raw integrations from database:', {
      googleDrive: integrations.googleDrive,
      googleCalendar: integrations.googleCalendar
    })

    const responseData = { 
      integrations: {
        googleDrive: {
          connected: integrations.googleDrive?.connected || false,
          email: integrations.googleDrive?.email,
          lastSync: integrations.googleDrive?.lastSync,
          error: integrations.googleDrive?.error
        },
        googleCalendar: {
          connected: integrations.googleCalendar?.connected || false,
          email: integrations.googleCalendar?.email,
          lastSync: integrations.googleCalendar?.lastSync,
          error: integrations.googleCalendar?.error
        }
      }
    }

    console.log('📤 [IntegrationsStatus] Sending response:', responseData)
    return ApiSuccess.ok(responseData)
    
  } catch (error) {
    console.error('❌ [Integrations] Status fetch error:', error)
    return ApiErrors.internalError('Failed to fetch integration status')
  }
} 