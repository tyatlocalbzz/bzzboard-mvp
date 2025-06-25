import { NextRequest } from 'next/server'
import { getAllShoots, getShootsByClient, createShoot, updateShoot, type ShootWithClient } from '@/lib/db/shoots'
import { getClientByName } from '@/lib/db/clients'
import { getCachedEvents, linkEventToShoot } from '@/lib/db/calendar'
import { getIntegration } from '@/lib/db/integrations'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { type CalendarEventCache } from '@/lib/db/schema'
import type { UnifiedEvent, UnifiedEventFilter } from '@/lib/types/shoots'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface CreateShootBody {
  title: string
  clientName: string
  date: string
  time: string
  duration: string
  location: string
  notes?: string
  forceCreate?: boolean
  forceCalendarCreate?: boolean
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

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
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const start = startDate ? new Date(startDate) : today
        const end = endDate ? new Date(endDate) : (() => {
          const future = new Date(today)
          future.setMonth(today.getMonth() + 3)
          return future
        })()

        const events = await getCachedEvents(user.email!, 'primary')
        
        // Filter events by date range
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
        console.error('❌ [Shoots API] Error fetching calendar events:', error)
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
      conflictDetails: event.conflictDetails || undefined,
      syncStatus: event.syncStatus,
      isShootEvent: !!event.shootId,
      shootId: event.shootId || undefined,
      lastModified: event.lastModified.toISOString()
    }))

    // Combine and sort events by start time
    const allEvents = [...shootEvents, ...calendarUnifiedEvents]
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const responseData = {
      events: allEvents,
      totalCount: allEvents.length,
      filter,
      shootsCount: shootEvents.length,
      calendarEventsCount: calendarUnifiedEvents.length
    }

    return ApiSuccess.ok(responseData)

  } catch (error) {
    console.error('❌ [Shoots API] Error fetching unified events:', error)
    return ApiErrors.internalError('Failed to fetch events')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    const body: CreateShootBody = await req.json()
    const { title, clientName, date, time, duration, location, notes, forceCreate, forceCalendarCreate } = body

    // Validation
    if (!title || !clientName || !date || !time || !duration || !location) {
      return ApiErrors.badRequest('Missing required fields: title, clientName, date, time, duration, and location are required')
    }

    // Get client by name
    const client = await getClientByName(clientName)
    if (!client) return ApiErrors.notFound('Client')

    // Validate and combine date and time
    const scheduledAt = new Date(`${date}T${time}`)
    if (isNaN(scheduledAt.getTime())) {
      return ApiErrors.badRequest('Invalid date or time format')
    }

    // Calculate end time
    const endTime = new Date(scheduledAt.getTime() + parseInt(duration) * 60 * 1000)

    // Check for Google Calendar integration and conflicts BEFORE creating shoot
    const calendarIntegration = await getIntegration(user.email, 'google-calendar')
    
    if (calendarIntegration?.connected && !forceCreate) {
      try {
        console.log('🔍 [Shoots API] Checking for conflicts before creating shoot:', title)
        
        const calendarSync = new GoogleCalendarSync()
        const conflictInfo = await calendarSync.checkConflictsForShoot(
          user.email,
          scheduledAt,
          endTime
        )

        if (conflictInfo.conflictingEvents.length > 0) {
          console.log('⚠️ [Shoots API] Calendar conflicts detected - NOT creating shoot yet')
          
          const conflictDetails = conflictInfo.conflictingEvents.map(event => ({
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString()
          }))
          
          // Return conflict information WITHOUT creating the shoot
          return ApiSuccess.ok({
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
      } catch (error) {
        console.error('❌ [Shoots API] Error checking conflicts:', error)
        // Continue with shoot creation if conflict check fails
      }
    }

    // No conflicts detected or forceCreate is true - proceed with shoot creation
    console.log('✅ [Shoots API] No conflicts detected or force creating - proceeding with shoot creation')

    let googleCalendarEventId: string | null = null
    let calendarSyncStatus: 'pending' | 'synced' | 'error' = 'pending'
    let calendarError: string | null = null

    // Create calendar event if integration is connected
    if (calendarIntegration?.connected) {
      try {
        console.log('🗓️ [Shoots API] Creating Google Calendar event for shoot:', title)
        
        const calendarSync = new GoogleCalendarSync()

        if (forceCreate && !forceCalendarCreate) {
          console.log('🚀 [Shoots API] Force creating shoot - calendar event will NOT be created due to conflicts')
          calendarSyncStatus = 'error'
          calendarError = 'Calendar event not created due to scheduling conflicts'
        } else {
          const calendarEvent = {
            title: `📸 ${title}`,
            description: `Content shoot for ${client.name}\n\n${notes || ''}`.trim(),
            startTime: scheduledAt,
            endTime: endTime,
            location: location,
            attendees: []
          }

          googleCalendarEventId = await calendarSync.createEvent(user.email, calendarEvent)
          calendarSyncStatus = 'synced'
          
          console.log('✅ [Shoots API] Google Calendar event created:', googleCalendarEventId)
        }

      } catch (error) {
        console.error('❌ [Shoots API] Failed to create calendar event:', error)
        calendarError = error instanceof Error ? error.message : 'Failed to create calendar event'
        calendarSyncStatus = 'error'
      }
    } else {
      console.log('📅 [Shoots API] Google Calendar not connected, skipping calendar event creation')
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
          console.log('🔗 [Shoots API] Linked calendar event to shoot')
        } catch (linkError) {
          console.error('❌ [Shoots API] Failed to link calendar event to shoot:', linkError)
        }
      }
    }

    const responseData = {
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

    // Determine success message based on calendar integration
    let message = 'Shoot created successfully'

    if (googleCalendarEventId) {
      if (forceCreate && forceCalendarCreate) {
        message = 'Shoot created and added to Google Calendar (despite conflicts)'
      } else {
        message = 'Shoot created and added to Google Calendar'
      }
    } else if (calendarError) {
      message = 'Shoot created but calendar sync failed'
    }

    return ApiSuccess.created(responseData, message)

  } catch (error) {
    console.error('❌ [Shoots API] Error creating shoot:', error)
    return ApiErrors.internalError('Failed to create shoot')
  }
} 