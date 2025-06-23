import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startTime, endTime, excludeEventId } = await req.json()

    // Validate input
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Start time and end time are required' },
        { status: 400 }
      )
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    console.log(`🔍 [Calendar Conflicts] Checking conflicts for ${user.email}`)

    // Use DRY calendar service for conflict checking
    const calendarSync = new GoogleCalendarSync()
    const conflictInfo = await calendarSync.checkConflictsForShoot(
      user.email,
      start,
      end,
      excludeEventId
    )

    const hasConflicts = conflictInfo.conflictingEvents.length > 0

    return NextResponse.json({
      success: true,
      hasConflicts,
      conflictCount: conflictInfo.conflictingEvents.length,
      shootTime: {
        start: conflictInfo.shootTime.start.toISOString(),
        end: conflictInfo.shootTime.end.toISOString()
      },
      conflicts: conflictInfo.conflictingEvents.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        duration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)) // minutes
      }))
    })

  } catch (error) {
    console.error('❌ [Calendar Conflicts] Error checking conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to check calendar conflicts' },
      { status: 500 }
    )
  }
} 