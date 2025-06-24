import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { clearEventCache } from '@/lib/db/calendar'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { forceFullSync = false, clearCache = false } = body

    // Clear calendar cache if requested (for testing/cleanup)
    if (clearCache) {
      console.log(`🧹 [Calendar API] Clearing calendar cache for ${user.email}`)
      await clearEventCache(user.email)
      return NextResponse.json({
        success: true,
        message: 'Calendar cache cleared successfully'
      })
    }

    // Regular sync
    console.log(`🔄 [Calendar API] Manual sync requested by ${user.email}`)
    const calendarSync = new GoogleCalendarSync()
    const result = await calendarSync.syncCalendar(user.email, 'primary', forceFullSync)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Calendar sync completed successfully',
        result: {
          syncedEvents: result.syncedEvents,
          deletedEvents: result.deletedEvents,
          conflicts: result.conflicts
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Sync failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [Calendar API] Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    )
  }
} 