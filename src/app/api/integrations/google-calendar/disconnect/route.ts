import { getCurrentUserForAPI } from '@/lib/auth/session'
import { removeIntegration } from '@/lib/db/integrations'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    // Remove integration from database
    await removeIntegration(user.email, 'google-calendar')

    // Log integration disconnect for security audit
    console.log(`✅ [Integrations] Google Calendar disconnected by user: ${user.email}`)

    return ApiSuccess.ok({}, 'Google Calendar disconnected successfully')
    
  } catch (error) {
    console.error('❌ [Integrations] Google Calendar disconnect error:', error)
    return ApiErrors.internalError('Failed to disconnect Google Calendar')
  }
} 