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
  getSyncEndDate
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
      
      // Handle specific error cases
      if (error instanceof CalendarError) {
        if (error.code === 'SYNC_TOKEN_EXPIRED') {
          // Retry with full sync if sync token expired
          console.log('🔄 [CalendarSync] Sync token expired, retrying with full sync')
          return await this.syncCalendar(userEmail, calendarId, true)
        }
        
        if (error.code === 'UNAUTHORIZED' || error.statusCode === 401) {
          // Try to refresh token and retry once
          console.log('🔄 [CalendarSync] Authentication failed, attempting token refresh')
          try {
            await this.refreshAccessToken(userEmail)
            console.log('✅ [CalendarSync] Token refreshed, retrying sync')
            return await this.syncCalendar(userEmail, calendarId, forceFullSync)
          } catch (refreshError) {
            console.error('❌ [CalendarSync] Token refresh failed:', refreshError)
            return {
              success: false,
              syncedEvents: 0,
              deletedEvents: 0,
              conflicts: 0,
              error: 'Calendar authentication expired. Please reconnect your Google Calendar.'
            }
          }
        }
      }

      // Handle Google API errors with invalid_grant
      const apiError = error as { message?: string; code?: number }
      if (apiError.message?.includes('invalid_grant') || apiError.code === 400) {
        console.log('🔄 [CalendarSync] Invalid grant error, attempting token refresh')
        try {
          await this.refreshAccessToken(userEmail)
          console.log('✅ [CalendarSync] Token refreshed after invalid_grant, retrying sync')
          return await this.syncCalendar(userEmail, calendarId, forceFullSync)
        } catch (refreshError) {
          console.error('❌ [CalendarSync] Token refresh failed after invalid_grant:', refreshError)
          return {
            success: false,
            syncedEvents: 0,
            deletedEvents: 0,
            conflicts: 0,
            error: 'Calendar authentication expired. Please reconnect your Google Calendar.'
          }
        }
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

    // Determine sync time range (fixed to 2 weeks)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const syncEndDate = getSyncEndDate()
    
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
            console.log(`🗑️ [CalendarSync] Processing deleted event: ${googleEvent.summary} (${googleEvent.id})`)
            await this.handleExternallyDeletedEvent(userEmail, googleEvent.id, calendarId)
            deletedEvents++
          } else {
            // Handle updated/new events - only process events with valid data
            if (googleEvent.summary && googleEvent.start && googleEvent.end) {
              // Apply filtering based on user settings
              const shouldIncludeEvent = this.shouldIncludeEvent()
              
              if (shouldIncludeEvent) {
                const eventData = this.convertGoogleEventToCache(googleEvent, userEmail, calendarId)
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
   * Check if an event should be included (simplified - include all events)
   */
  private shouldIncludeEvent(): boolean {
    // Simplified: include all events from selected calendars
    return true
  }

  /**
   * Convert Google Calendar event to our cache format
   * DRY: Centralized conversion logic
   * Note: This method should only be called after validating googleEvent.id exists
   */
  private convertGoogleEventToCache(googleEvent: calendar_v3.Schema$Event, userEmail: string, calendarId: string) {
    const baseEvent = this.convertGoogleEvent(googleEvent)
    
    // Following Google Calendar API best practices: validate required fields
    if (!googleEvent.id) {
      throw new CalendarError('Cannot convert event without ID', 'INVALID_EVENT')
    }
    
    // Simplified: no auto-detection of shoot events
    const shootId: number | null = null

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
   * DRY: Centralized event update with 404 handling
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

      // Get current event - this will throw 404 if event doesn't exist
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
      // Handle case where event was deleted from Google Calendar
      const apiError = error as { code?: number }
      if (apiError.code === 404) {
        console.log('ℹ️ [CalendarSync] Calendar event not found during update - may have been deleted externally:', eventId)
        
        // Remove from local cache since it doesn't exist in Google Calendar
        await deleteCachedEvent(userEmail, eventId, calendarId)
        
        // Don't throw error - this is a recoverable situation
        return
      }
      
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

  /**
   * Delete a calendar event when shoot is deleted
   * DRY: Centralized calendar event deletion
   */
  async deleteCalendarEvent(
    userEmail: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      await this.retryWithBackoff(async () => {
        return await this.calendar.events.delete({
          calendarId,
          eventId,
          sendUpdates: 'all' // Notify attendees of cancellation
        })
      })

      // Remove from local cache
      await deleteCachedEvent(userEmail, eventId, calendarId)

      console.log('✅ [CalendarSync] Calendar event deleted:', eventId)
      return true

    } catch (error) {
      // Don't throw error if event doesn't exist (already deleted)
      const apiError = error as { code?: number }
      if (apiError.code === 404) {
        console.log('ℹ️ [CalendarSync] Calendar event already deleted:', eventId)
        return true
      }
      
      console.error('❌ [CalendarSync] Failed to delete calendar event:', error)
      return false
    }
  }

  /**
   * Handle externally deleted calendar event
   * Called when we detect a calendar event was deleted outside our app
   */
  async handleExternallyDeletedEvent(
    userEmail: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      console.log(`🔍 [CalendarSync] Handling externally deleted event: ${eventId}`)
      
      // Remove from local cache
      await deleteCachedEvent(userEmail, eventId, calendarId)
      
      // Find and update associated shoot
      const { getShootByCalendarEventId, clearCalendarSync } = await import('@/lib/db/shoots')
      const shoot = await getShootByCalendarEventId(eventId)
      
      if (shoot) {
        console.log(`📸 [CalendarSync] Found associated shoot: ${shoot.title} (ID: ${shoot.id})`)
        await clearCalendarSync(shoot.id)
        console.log(`✅ [CalendarSync] Cleared calendar sync data for shoot: ${shoot.id}`)
      } else {
        console.log(`ℹ️ [CalendarSync] No associated shoot found for deleted event: ${eventId}`)
      }
      
    } catch (error) {
      console.error('❌ [CalendarSync] Error handling externally deleted event:', error)
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Verify if a calendar event still exists in Google Calendar
   * Used to detect externally deleted events
   */
  async verifyEventExists(
    userEmail: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      this.validateConfig()
      await this.initializeAuth(userEmail)

      // Try to get the event - this will throw 404 if it doesn't exist
      await this.calendar.events.get({
        calendarId,
        eventId
      })

      return true
    } catch (error) {
      const apiError = error as { code?: number }
      if (apiError.code === 404) {
        // Event doesn't exist
        return false
      }
      
      // Other errors (auth, network, etc.) - assume event exists to be safe
      console.error(`❌ [CalendarSync] Error verifying event ${eventId}:`, error)
      return true
    }
  }
} 