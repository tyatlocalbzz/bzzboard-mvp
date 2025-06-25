import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { clearEventCache } from '@/lib/db/calendar'
import { ApiErrors, ApiSuccess, getValidatedBody } from '@/lib/api/api-helpers'

interface SyncRequestBody {
  forceFullSync?: boolean
  clearCache?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const body = await getValidatedBody<SyncRequestBody>(req)
    const { forceFullSync = false, clearCache = false } = body

    // Clear calendar cache if requested (for testing/cleanup)
    if (clearCache) {
      console.log(`🧹 [Calendar API] Clearing calendar cache for ${user.email}`)
      await clearEventCache(user.email)
      return ApiSuccess.ok({}, 'Calendar cache cleared successfully')
    }

    // Regular sync
    console.log(`🔄 [Calendar API] Manual sync requested by ${user.email}`)
    const calendarSync = new GoogleCalendarSync()
    const result = await calendarSync.syncCalendar(user.email, 'primary', forceFullSync)

    if (result.success) {
      return ApiSuccess.ok({
        syncedEvents: result.syncedEvents,
        deletedEvents: result.deletedEvents,
        conflicts: result.conflicts
      }, 'Calendar sync completed successfully')
    } else {
      return ApiErrors.internalError(result.error || 'Sync failed')
    }

  } catch (error) {
    console.error('❌ [Calendar API] Sync error:', error)
    return ApiErrors.internalError('Failed to sync calendar')
  }
} 