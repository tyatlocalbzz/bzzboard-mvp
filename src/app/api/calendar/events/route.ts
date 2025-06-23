import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getCachedEvents } from '@/lib/db/calendar'
import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calendarEventsCache } from '@/lib/db/schema'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const filter = searchParams.get('filter') || 'all' // 'all' | 'shoots'
    const calendarId = searchParams.get('calendarId') || 'primary'

    console.log(`📅 [Calendar API] Fetching events for ${user.email}, filter: ${filter}`)

    let events

    // Always filter events from today forward
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    // If date range is specified, use custom query for better performance
    if (startDate && endDate) {
      const start = new Date(Math.max(new Date(startDate).getTime(), today.getTime()))
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }

      const query = db
        .select()
        .from(calendarEventsCache)
        .where(
          and(
            eq(calendarEventsCache.userEmail, user.email),
            eq(calendarEventsCache.calendarId, calendarId),
            gte(calendarEventsCache.startTime, start),
            lte(calendarEventsCache.endTime, end)
          )
        )

      events = await query.orderBy(calendarEventsCache.startTime)
      
      // Filter for content shoots only if requested (post-query filtering)
      if (filter === 'shoots') {
        events = events.filter(event => event.shootId !== null)
      }
    } else {
      // Use the existing function for all events, then filter from today forward
      events = await getCachedEvents(user.email, calendarId)
      
      // Filter to only include events from today forward
      events = events.filter(event => new Date(event.startTime) >= today)
      
      // Filter for shoots if requested
      if (filter === 'shoots') {
        events = events.filter(event => event.shootId !== null)
      }
    }

    // Transform events for UI consumption
    const transformedEvents = events.map(event => ({
      id: event.googleEventId,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      status: event.status,
      attendees: event.attendees || [],
      isRecurring: event.isRecurring,
      conflictDetected: event.conflictDetected,
      syncStatus: event.syncStatus,
      shootId: event.shootId,
      isShootEvent: event.shootId !== null,
      duration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)), // minutes
      lastModified: event.lastModified.toISOString()
    }))

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      totalCount: transformedEvents.length,
      filter,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    })

  } catch (error) {
    console.error('❌ [Calendar API] Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
} 