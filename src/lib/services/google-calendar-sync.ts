import { GoogleCalendarBase, CalendarError, CalendarEventBase } from './google-calendar-base'
import type { calendar_v3 } from 'googleapis'
import { 
  getSyncToken, 
  upsertSyncToken, 
  deleteSyncToken,
  getCachedEvents,
  upsertCachedEvent,
  deleteCachedEvent,
  clearEventCache,
  checkSchedulingConflicts
} from '@/lib/db/calendar'
import { getIntegration } from '@/lib/db/integrations'
import { 
  GoogleCalendarSettings, 
  DEFAULT_GOOGLE_CALENDAR_SETTINGS, 
  getSyncEndDate, 
  isShootEvent, 
  isWithinWorkingHours 
} from '@/lib/types/calendar'

export interface SyncResult {
  success: boolean
  syncedEvents: number
  deletedEvents: number
  conflicts: number
  nextSyncToken?: string
  error?: string
}

export interface ConflictInfo {
  shootTime: { start: Date; end: Date }
  conflictingEvents: Array<{
    id: string
    title: string
    startTime: Date
    endTime: Date
  }>
}

/**
 * Google Calendar Sync Service
 * Handles bi-directional synchronization between Google Calendar and local cache
 * DRY: Extends base service, reuses common functionality
 */
export class GoogleCalendarSync extends GoogleCalendarBase {
  
  /**
   * Perform incremental sync for a user's calendar
   * DRY: Centralized sync logic used by webhooks and manual sync
   */
  async syncCalendar(
    userEmail: string, 
    calendarId: string = 'primary',
    forceFullSync: boolean = false
  ): Promise<SyncResult> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      console.log(`🔄 [CalendarSync] Starting sync for ${userEmail}`)

      let syncToken: string | undefined
      let isFullSync = forceFullSync

      // Get stored sync token for incremental sync
      if (!forceFullSync) {
        const storedToken = await getSyncToken(userEmail, calendarId)
        syncToken = storedToken?.syncToken
        
        if (!syncToken) {
          console.log('📝 [CalendarSync] No sync token found, performing full sync')
          isFullSync = true
        }
      }

      // Perform sync operation with retry logic
      const syncResult = await this.retryWithBackoff(async () => {
        return await this.performSync(userEmail, calendarId, syncToken, isFullSync)
      })

      console.log(`✅ [CalendarSync] Sync completed for ${userEmail}:`, syncResult)
      return syncResult

    } catch (error) {
      console.error('❌ [CalendarSync] Sync failed:', error)
      
      if (error instanceof CalendarError && error.code === 'SYNC_TOKEN_EXPIRED') {
        // Retry with full sync if sync token expired
        console.log('🔄 [CalendarSync] Sync token expired, retrying with full sync')
        return await this.syncCalendar(userEmail, calendarId, true)
      }

      return {
        success: false,
        syncedEvents: 0,
        deletedEvents: 0,
        conflicts: 0,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      }
    }
  }

  /**
   * Perform the actual sync operation
   * DRY: Core sync logic separated for reusability
   */
  private async performSync(
    userEmail: string,
    calendarId: string,
    syncToken?: string,
    isFullSync: boolean = false
  ): Promise<SyncResult> {
    let syncedEvents = 0
    let deletedEvents = 0
    let conflicts = 0
    let nextPageToken: string | undefined
    let nextSyncToken: string | undefined

    // Clear cache if full sync
    if (isFullSync) {
      await clearEventCache(userEmail, calendarId)
      await deleteSyncToken(userEmail, calendarId)
    }

    // Get user's calendar settings
    const integration = await getIntegration(userEmail, 'google-calendar')
    const settings: GoogleCalendarSettings = {
      ...DEFAULT_GOOGLE_CALENDAR_SETTINGS,
      ...(integration?.data as Partial<GoogleCalendarSettings> || {})
    }

    console.log('🔧 [CalendarSync] Using settings:', settings)

    // Determine sync time range based on user settings
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const syncEndDate = getSyncEndDate(settings.syncTimeRange)
    
    console.log(`📅 [CalendarSync] Syncing events from ${today.toISOString()} to ${syncEndDate.toISOString()}`)
    
    // Sync events from Google Calendar
    do {
      const response = await this.calendar.events.list({
        calendarId,
        syncToken: isFullSync ? undefined : syncToken,
        pageToken: nextPageToken,
        maxResults: 250,
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime',
        timeMin: today.toISOString(), // Start from today
        timeMax: syncEndDate.toISOString() // Respect user's sync time range
      })

      const events = response.data.items || []
      nextPageToken = response.data.nextPageToken || undefined
      nextSyncToken = response.data.nextSyncToken || undefined

      // Process each event
      for (const googleEvent of events) {
        try {
          // Skip events without valid ID (Google Calendar API best practice)
          if (!googleEvent.id) {
            console.warn('⚠️ [CalendarSync] Skipping event without ID:', googleEvent.summary)
            continue
          }

          if (googleEvent.status === 'cancelled') {
            // Handle deleted events
            await deleteCachedEvent(userEmail, googleEvent.id, calendarId)
            deletedEvents++
          } else {
            // Handle updated/new events - only process events with valid data
            if (googleEvent.summary && googleEvent.start && googleEvent.end) {
              // Apply filtering based on user settings
              const shouldIncludeEvent = this.shouldIncludeEvent(googleEvent, settings)
              
              if (shouldIncludeEvent) {
                const eventData = this.convertGoogleEventToCache(googleEvent, userEmail, calendarId, settings)
                await upsertCachedEvent(eventData)
                syncedEvents++
              } else {
                console.log('🔍 [CalendarSync] Filtered out event:', googleEvent.summary)
              }
            } else {
              console.warn('⚠️ [CalendarSync] Skipping event with incomplete data:', googleEvent.id)
            }
          }
        } catch (eventError) {
          console.error('❌ [CalendarSync] Error processing event:', eventError)
          // Continue with other events
        }
      }

    } while (nextPageToken)

    // Store new sync token
    if (nextSyncToken) {
      await upsertSyncToken(userEmail, calendarId, nextSyncToken)
    }

    // Check for conflicts with our shoots
    conflicts = await this.detectConflicts(userEmail, calendarId)

    return {
      success: true,
      syncedEvents,
      deletedEvents,
      conflicts,
      nextSyncToken
    }
  }

  /**
   * Check for conflicts between calendar events and our shoots
   * DRY: Centralized conflict detection
   */
  private async detectConflicts(
    userEmail: string,
    calendarId: string = 'primary'
  ): Promise<number> {
    try {
      // Get all cached events
      const events = await getCachedEvents(userEmail, calendarId)
      let conflictCount = 0

      // Check each event for conflicts (simplified logic)
      for (const event of events) {
        const conflicts = await checkSchedulingConflicts(
          userEmail,
          new Date(event.startTime),
          new Date(event.endTime),
          event.googleEventId,
          calendarId
        )

        if (conflicts.length > 0) {
          // Mark event as having conflict
          await upsertCachedEvent({
            ...event,
            conflictDetected: true,
            syncStatus: 'error'
          })
          conflictCount++
        }
      }

      return conflictCount
    } catch (error) {
      console.error('❌ [CalendarSync] Error detecting conflicts:', error)
      return 0
    }
  }

  /**
   * Check if an event should be included based on user settings
   * DRY: Centralized filtering logic
   */
  private shouldIncludeEvent(googleEvent: calendar_v3.Schema$Event, settings: GoogleCalendarSettings): boolean {
    // Skip all-day events if user preference is set
    if (settings.excludeAllDayEvents && googleEvent.start?.date) {
      return false
    }

    // Apply working hours filter if enabled
    if (settings.eventTypeFilter === 'business-hours-only' && settings.workingHours.enabled) {
      if (googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
        const startTime = new Date(googleEvent.start.dateTime)
        const endTime = new Date(googleEvent.end.dateTime)
        
        if (!isWithinWorkingHours(startTime, endTime, settings.workingHours)) {
          return false
        }
      }
    }

    // Apply shoots-only filter if enabled
    if (settings.eventTypeFilter === 'shoots-only') {
      if (!googleEvent.summary || !isShootEvent(googleEvent.summary, settings.shootKeywords)) {
        return false
      }
    }

    return true
  }

  /**
   * Convert Google Calendar event to our cache format
   * DRY: Centralized conversion logic
   * Note: This method should only be called after validating googleEvent.id exists
   */
  private convertGoogleEventToCache(googleEvent: calendar_v3.Schema$Event, userEmail: string, calendarId: string, settings?: GoogleCalendarSettings) {
    const baseEvent = this.convertGoogleEvent(googleEvent)
    
    // Following Google Calendar API best practices: validate required fields
    if (!googleEvent.id) {
      throw new CalendarError('Cannot convert event without ID', 'INVALID_EVENT')
    }
    
    // Auto-detect shoot events if settings are provided and enabled
    const shootId: number | null = null
    if (settings?.autoTagShootEvents && baseEvent.title) {
      const isShoot = isShootEvent(baseEvent.title, settings.shootKeywords)
      if (isShoot) {
        console.log('🎯 [CalendarSync] Detected shoot event:', baseEvent.title)
        // Note: In a full implementation, you'd link to an actual shoot record
        // For now, we'll just mark it as a shoot event with a placeholder
      }
    }

    return {
      userEmail,
      calendarId,
      googleEventId: googleEvent.id, // Now guaranteed to be string
      shootId,
      title: baseEvent.title,
      description: baseEvent.description,
      startTime: baseEvent.startTime,
      endTime: baseEvent.endTime,
      location: baseEvent.location,
      status: googleEvent.status === 'confirmed' ? 'confirmed' as const : 
              googleEvent.status === 'tentative' ? 'tentative' as const : 
              'cancelled' as const,
      attendees: baseEvent.attendees || [],
      isRecurring: baseEvent.isRecurring || false,
      recurringEventId: googleEvent.recurringEventId || undefined,
      etag: googleEvent.etag || undefined,
      lastModified: new Date(googleEvent.updated || new Date().toISOString()),
      syncStatus: 'synced' as const,
      conflictDetected: false
    }
  }

  /**
   * Create a new calendar event
   * DRY: Centralized event creation
   */
  async createEvent(
    userEmail: string,
    event: CalendarEventBase,
    calendarId: string = 'primary'
  ): Promise<string> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      const googleEvent = this.convertToGoogleEvent(event)
      
      const response = await this.retryWithBackoff(async () => {
        return await this.calendar.events.insert({
          calendarId,
          requestBody: googleEvent,
          sendUpdates: 'all' // Send notifications to attendees
        })
      })

      const createdEvent = response.data
      if (!createdEvent.id) {
        throw new CalendarError('Event created but no ID returned', 'CREATE_ERROR')
      }

      // Update local cache
      const cacheData = this.convertGoogleEventToCache(createdEvent, userEmail, calendarId)
      await upsertCachedEvent(cacheData)

      console.log('✅ [CalendarSync] Event created:', createdEvent.id)
      return createdEvent.id

    } catch (error) {
      this.handleCalendarError(error, 'create event')
    }
  }

  /**
   * Update an existing calendar event
   * DRY: Centralized event update
   */
  async updateEvent(
    userEmail: string,
    eventId: string,
    updates: Partial<CalendarEventBase>,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      // Get current event
      const currentEvent = await this.calendar.events.get({
        calendarId,
        eventId
      })

      // Merge updates
      const updatedEvent = {
        ...currentEvent.data,
        ...this.convertToGoogleEvent(updates as CalendarEventBase)
      }

      const response = await this.retryWithBackoff(async () => {
        return await this.calendar.events.update({
          calendarId,
          eventId,
          requestBody: updatedEvent,
          sendUpdates: 'all'
        })
      })

      // Update local cache
      const cacheData = this.convertGoogleEventToCache(response.data, userEmail, calendarId)
      await upsertCachedEvent(cacheData)

      console.log('✅ [CalendarSync] Event updated:', eventId)

    } catch (error) {
      this.handleCalendarError(error, 'update event')
    }
  }

  /**
   * Delete a calendar event
   * DRY: Centralized event deletion
   */
  async deleteEvent(
    userEmail: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      await this.retryWithBackoff(async () => {
        return await this.calendar.events.delete({
          calendarId,
          eventId,
          sendUpdates: 'all'
        })
      })

      // Remove from local cache
      await deleteCachedEvent(userEmail, eventId, calendarId)

      console.log('✅ [CalendarSync] Event deleted:', eventId)

    } catch (error) {
      this.handleCalendarError(error, 'delete event')
    }
  }

  /**
   * Check for scheduling conflicts before creating/updating events
   * DRY: Centralized conflict checking
   */
  async checkConflictsForShoot(
    userEmail: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
    calendarId: string = 'primary'
  ): Promise<ConflictInfo> {
    try {
      const conflicts = await checkSchedulingConflicts(
        userEmail,
        startTime,
        endTime,
        excludeEventId,
        calendarId
      )

      return {
        shootTime: { start: startTime, end: endTime },
        conflictingEvents: conflicts.map(event => ({
          id: event.googleEventId,
          title: event.title,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime)
        }))
      }
    } catch (error) {
      console.error('❌ [CalendarSync] Error checking conflicts:', error)
      return {
        shootTime: { start: startTime, end: endTime },
        conflictingEvents: []
      }
    }
  }
} 