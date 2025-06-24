import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllShoots, getShootsByClient, createShoot, updateShoot, type ShootWithClient } from '@/lib/db/shoots'
import { getClientByName } from '@/lib/db/clients'
import { getCachedEvents, linkEventToShoot } from '@/lib/db/calendar'
import { getIntegration } from '@/lib/db/integrations'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { type CalendarEventCache } from '@/lib/db/schema'
import type { UnifiedEvent, UnifiedEventFilter, UnifiedEventsResponse } from '@/lib/types/shoots'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientName = searchParams.get('client')
    const filter = (searchParams.get('filter') as UnifiedEventFilter) || 'shoots'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let shoots: ShootWithClient[] = []
    let calendarEvents: CalendarEventCache[] = []

    // Fetch shoots if needed
    if (filter === 'shoots' || filter === 'all') {
      if (clientName && clientName !== 'All Clients') {
        const client = await getClientByName(clientName)
        if (client) {
          shoots = await getShootsByClient(client.id)
        }
      } else {
        shoots = await getAllShoots()
      }
    }

    // Fetch calendar events if needed
    if (filter === 'calendar' || filter === 'all') {
      try {
        // Get date range for calendar events
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const start = startDate ? new Date(startDate) : today
        const end = endDate ? new Date(endDate) : (() => {
          const future = new Date(today)
          future.setMonth(today.getMonth() + 3)
          return future
        })()

        const events = await getCachedEvents(user.email!, 'primary')
        
        // Filter events by date range and exclude shoot events if filter is 'calendar'
        calendarEvents = events.filter(event => {
          const eventStart = new Date(event.startTime)
          const inDateRange = eventStart >= start && eventStart <= end
          
          if (filter === 'calendar') {
            // Only show non-shoot calendar events
            return inDateRange && !event.shootId
          }
          
          return inDateRange
        })
      } catch (error) {
        console.error('Error fetching calendar events:', error)
        // Continue without calendar events if there's an error
      }
    }

    // Transform shoots to unified events
    const shootEvents: UnifiedEvent[] = shoots.map(shoot => ({
      type: 'shoot' as const,
      id: `shoot-${shoot.id}`,
      title: shoot.title,
      startTime: shoot.scheduledAt.toISOString(),
      endTime: new Date(shoot.scheduledAt.getTime() + shoot.duration * 60 * 1000).toISOString(),
      duration: shoot.duration,
      location: shoot.location || undefined,
      client: shoot.client?.name,
      shootStatus: shoot.status as 'scheduled' | 'active' | 'completed' | 'cancelled',
      postIdeasCount: shoot.postIdeasCount,
      shootId: shoot.id,
      notes: shoot.notes || undefined
    }))

    // Transform calendar events to unified events
    const calendarUnifiedEvents: UnifiedEvent[] = calendarEvents.map(event => ({
      type: 'calendar' as const,
      id: `calendar-${event.googleEventId}`,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      duration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)),
      location: event.location || undefined,
      description: event.description || undefined,
      status: event.status,
      attendees: event.attendees || [],
      isRecurring: event.isRecurring,
      conflictDetected: event.conflictDetected,
      syncStatus: event.syncStatus,
      isShootEvent: !!event.shootId,
      shootId: event.shootId || undefined,
      lastModified: event.lastModified.toISOString()
    }))

    // Combine and sort events by start time
    const allEvents = [...shootEvents, ...calendarUnifiedEvents]
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const response: UnifiedEventsResponse = {
      success: true,
      events: allEvents,
      totalCount: allEvents.length,
      filter,
      shootsCount: shootEvents.length,
      calendarEventsCount: calendarUnifiedEvents.length
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching unified events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, clientName, date, time, duration, location, notes, forceCreate } = body

    if (!title || !clientName || !date || !time || !duration || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client by name
    const client = await getClientByName(clientName)
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Combine date and time
    const scheduledAt = new Date(`${date}T${time}`)
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date or time format' },
        { status: 400 }
      )
    }

    // Calculate end time
    const endTime = new Date(scheduledAt.getTime() + parseInt(duration) * 60 * 1000)

    // Check for Google Calendar integration
    const calendarIntegration = await getIntegration(user.email, 'google-calendar')
    let googleCalendarEventId: string | null = null
    let calendarSyncStatus: 'pending' | 'synced' | 'error' = 'pending'
    let calendarError: string | null = null

    if (calendarIntegration?.connected) {
      try {
        console.log('🗓️ [ShootCreation] Creating Google Calendar event for shoot:', title)
        
        // Initialize calendar sync service
        const calendarSync = new GoogleCalendarSync()
        
        // Check for conflicts first (unless force creating)
        if (!forceCreate) {
          const conflictInfo = await calendarSync.checkConflictsForShoot(
            user.email,
            scheduledAt,
            endTime
          )

          console.log('🔍 [ShootCreation] Conflict check results:', {
            conflictCount: conflictInfo.conflictingEvents.length,
            conflicts: conflictInfo.conflictingEvents.map(e => ({
              title: e.title,
              start: e.startTime.toISOString(),
              end: e.endTime.toISOString()
            }))
          })

          if (conflictInfo.conflictingEvents.length > 0) {
            console.log('⚠️ [ShootCreation] Calendar conflicts detected:', conflictInfo.conflictingEvents.length)
            
            // Format conflict details for better user experience
            const conflictDetails = conflictInfo.conflictingEvents.map(event => ({
              title: event.title,
              startTime: event.startTime.toISOString(),
              endTime: event.endTime.toISOString()
            }))
            
            // Return conflict information WITHOUT creating the shoot
            return NextResponse.json({
              success: false,
              hasConflicts: true,
              conflicts: conflictDetails,
              message: `Cannot schedule shoot - conflicts detected with ${conflictDetails.length} existing event${conflictDetails.length > 1 ? 's' : ''}`,
              shootData: {
                title,
                clientName,
                date,
                time,
                duration: parseInt(duration),
                location,
                notes: notes || undefined
              }
            })
          }
        } else {
          console.log('🚀 [ShootCreation] Force creating shoot despite potential conflicts')
        }

        // No conflicts, create calendar event
        const calendarEvent = {
          title: `📸 ${title}`,
          description: `Content shoot for ${client.name}\n\n${notes || ''}`.trim(),
          startTime: scheduledAt,
          endTime: endTime,
          location: location,
          attendees: [] // Could be enhanced to include client email
        }

        googleCalendarEventId = await calendarSync.createEvent(user.email, calendarEvent)
        calendarSyncStatus = 'synced'
        
        console.log('✅ [ShootCreation] Google Calendar event created:', googleCalendarEventId)

      } catch (error) {
        console.error('❌ [ShootCreation] Failed to create calendar event:', error)
        calendarError = error instanceof Error ? error.message : 'Failed to create calendar event'
        calendarSyncStatus = 'error'
        
        // Don't fail shoot creation if calendar fails
        console.log('⚠️ [ShootCreation] Continuing with shoot creation despite calendar error')
      }
    } else {
      console.log('📅 [ShootCreation] Google Calendar not connected, skipping calendar event creation')
    }

    // Create shoot in database
    const shoot = await createShoot({
      title,
      clientId: client.id,
      scheduledAt,
      duration: parseInt(duration),
      location,
      notes: notes || undefined
    })

    // Update shoot with Google Calendar information if we have it
    if (googleCalendarEventId || calendarError) {
      await updateShoot(shoot.id, {
        googleCalendarEventId,
        googleCalendarSyncStatus: calendarSyncStatus,
        googleCalendarLastSync: new Date(),
        googleCalendarError: calendarError
      })

      // Link calendar event to shoot if successful
      if (googleCalendarEventId) {
        try {
          await linkEventToShoot(googleCalendarEventId, shoot.id, user.email)
          console.log('🔗 [ShootCreation] Linked calendar event to shoot')
        } catch (linkError) {
          console.error('❌ [ShootCreation] Failed to link calendar event to shoot:', linkError)
        }
      }
    }

    const response: {
      success: boolean
      shoot: ShootWithClient & {
        googleCalendarEventId?: string | null
        googleCalendarSyncStatus?: 'pending' | 'synced' | 'error'
        googleCalendarError?: string | null
      }
      message?: string
      warning?: string
      info?: string
    } = {
      success: true,
      shoot: {
        ...shoot,
        client: {
          id: client.id,
          name: client.name
        },
        postIdeasCount: 0,
        googleCalendarEventId,
        googleCalendarSyncStatus: calendarSyncStatus,
        googleCalendarError: calendarError
      }
    }

    // Add success message about calendar integration
    if (googleCalendarEventId) {
      response.message = 'Shoot created and added to your Google Calendar'
    } else if (calendarIntegration?.connected && calendarError) {
      response.warning = 'Shoot created but failed to add to Google Calendar'
    } else if (!calendarIntegration?.connected) {
      response.info = 'Shoot created. Connect Google Calendar to automatically add shoots to your calendar.'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error creating shoot:', error)
    return NextResponse.json(
      { error: 'Failed to create shoot' },
      { status: 500 }
    )
  }
} 