/**
 * Enhanced Google Calendar Service
 * Implements Google Calendar API best practices for robust 2-way sync
 * Captures all essential event data for future expandability
 */

import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { db } from '@/lib/db'
import { shoots } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Enhanced event data interface matching Google Calendar API
export interface EnhancedCalendarEvent {
  // Basic event info
  id: string
  summary: string
  description?: string
  location?: string
  
  // Timing
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  
  // Essential sync fields
  htmlLink: string
  etag: string
  updated: string
  sequence: number
  iCalUID: string
  
  // Status and visibility
  status: 'confirmed' | 'tentative' | 'cancelled'
  transparency?: 'opaque' | 'transparent'
  visibility?: 'default' | 'public' | 'private' | 'confidential'
  
  // People
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    optional?: boolean
    organizer?: boolean
    self?: boolean
    resource?: boolean
  }>
  organizer?: {
    email: string
    displayName?: string
    self?: boolean
  }
  creator?: {
    email: string
    displayName?: string
    self?: boolean
  }
  
  // Recurrence
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: {
    dateTime: string
    timeZone?: string
  }
  
  // Conference and communication
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
      pin?: string
    }>
    conferenceSolution?: {
      key: { type: string }
      name: string
      iconUri?: string
    }
    conferenceId?: string
    signature?: string
    notes?: string
  }
  reminders?: {
    useDefault?: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  hangoutLink?: string
  
  // Permissions
  guestsCanModify?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanSeeOtherGuests?: boolean
  
  // Visual and location
  colorId?: string
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
}

export class EnhancedGoogleCalendarService {
  private calendar: ReturnType<typeof google.calendar>
  
  constructor(private oauth2Client: OAuth2Client) {
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  }

  /**
   * Create a new calendar event with comprehensive data capture
   */
  async createEvent(
    calendarId: string,
    eventData: {
      title: string
      description?: string
      location?: string
      startTime: Date
      endTime: Date
      timeZone?: string
      attendees?: Array<{ email: string; displayName?: string }>
      reminders?: {
        useDefault?: boolean
        overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>
      }
      conferenceData?: calendar_v3.Schema$ConferenceData
      colorId?: string
      guestsCanModify?: boolean
      guestsCanInviteOthers?: boolean
      guestsCanSeeOtherGuests?: boolean
    }
  ): Promise<EnhancedCalendarEvent> {
    try {
      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: eventData.timeZone || 'America/New_York',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: eventData.timeZone || 'America/New_York',
        },
        attendees: eventData.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
        })),
        reminders: eventData.reminders || {
          useDefault: true,
        },
        conferenceData: eventData.conferenceData,
        colorId: eventData.colorId,
        guestsCanModify: eventData.guestsCanModify || false,
        guestsCanInviteOthers: eventData.guestsCanInviteOthers || false,
        guestsCanSeeOtherGuests: eventData.guestsCanSeeOtherGuests !== false, // Default to true
      }

      console.log('📅 [GoogleCalendar] Creating event:', {
        title: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        attendeeCount: event.attendees?.length || 0
      })

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: eventData.conferenceData ? 1 : 0,
        sendNotifications: true,
      })

      const createdEvent = response.data
      console.log('✅ [GoogleCalendar] Event created successfully:', {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        etag: createdEvent.etag
      })

      return this.mapToEnhancedEvent(createdEvent)
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error creating event:', error)
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    eventData: Partial<{
      title: string
      description?: string
      location?: string
      startTime: Date
      endTime: Date
      timeZone?: string
      attendees?: Array<{ email: string; displayName?: string }>
      status?: 'confirmed' | 'tentative' | 'cancelled'
    }>,
    etag?: string
  ): Promise<EnhancedCalendarEvent> {
    try {
      const updatePayload: Record<string, unknown> = {}
      
      if (eventData.title) updatePayload.summary = eventData.title
      if (eventData.description !== undefined) updatePayload.description = eventData.description
      if (eventData.location !== undefined) updatePayload.location = eventData.location
      if (eventData.status) updatePayload.status = eventData.status
      
      if (eventData.startTime && eventData.endTime) {
        updatePayload.start = {
          dateTime: eventData.startTime.toISOString(),
          timeZone: eventData.timeZone || 'America/New_York',
        }
        updatePayload.end = {
          dateTime: eventData.endTime.toISOString(),
          timeZone: eventData.timeZone || 'America/New_York',
        }
      }
      
      if (eventData.attendees) {
        updatePayload.attendees = eventData.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
        }))
      }

      const requestOptions: calendar_v3.Params$Resource$Events$Update & { headers?: Record<string, string> } = {
        calendarId,
        eventId,
        requestBody: updatePayload,
        sendNotifications: true,
      }

      // Add etag for optimistic concurrency control
      if (etag) {
        requestOptions.headers = {
          'If-Match': etag
        }
      }

      console.log('🔄 [GoogleCalendar] Updating event:', {
        eventId,
        changes: Object.keys(updatePayload),
        etag: etag ? 'provided' : 'none'
      })

      const response = await this.calendar.events.update(requestOptions)
      const updatedEvent = response.data

      console.log('✅ [GoogleCalendar] Event updated successfully:', {
        id: updatedEvent.id,
        sequence: updatedEvent.sequence,
        updated: updatedEvent.updated
      })

      return this.mapToEnhancedEvent(updatedEvent)
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error updating event:', error)
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a single event with full details
   */
  async getEvent(calendarId: string, eventId: string): Promise<EnhancedCalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      })

      return this.mapToEnhancedEvent(response.data)
    } catch (error: unknown) {
      const apiError = error as { code?: number; message?: string }
      if (apiError.code === 404) {
        console.warn('⚠️ [GoogleCalendar] Event not found:', eventId)
        return null
      }
      console.error('❌ [GoogleCalendar] Error fetching event:', error)
      throw new Error(`Failed to fetch calendar event: ${apiError.message || 'Unknown error'}`)
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string, etag?: string): Promise<void> {
    try {
      const requestOptions: calendar_v3.Params$Resource$Events$Delete & { headers?: Record<string, string> } = {
        calendarId,
        eventId,
        sendNotifications: true,
      }

      // Add etag for optimistic concurrency control
      if (etag) {
        requestOptions.headers = {
          'If-Match': etag
        }
      }

      await this.calendar.events.delete(requestOptions)
      console.log('🗑️ [GoogleCalendar] Event deleted successfully:', eventId)
    } catch (error: unknown) {
      const apiError = error as { code?: number; message?: string }
      if (apiError.code === 404) {
        console.warn('⚠️ [GoogleCalendar] Event already deleted:', eventId)
        return // Not an error if already deleted
      }
      console.error('❌ [GoogleCalendar] Error deleting event:', error)
      throw new Error(`Failed to delete calendar event: ${apiError.message || 'Unknown error'}`)
    }
  }

  /**
   * List events with incremental sync support
   */
  async listEvents(
    calendarId: string,
    options?: {
      timeMin?: Date
      timeMax?: Date
      syncToken?: string
      maxResults?: number
    }
  ): Promise<{
    events: EnhancedCalendarEvent[]
    nextSyncToken?: string
    nextPageToken?: string
  }> {
    try {
      const requestOptions: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: options?.maxResults || 250,
      }

      if (options?.timeMin) {
        requestOptions.timeMin = options.timeMin.toISOString()
      }
      if (options?.timeMax) {
        requestOptions.timeMax = options.timeMax.toISOString()
      }
      if (options?.syncToken) {
        requestOptions.syncToken = options.syncToken
      }

      const response = await this.calendar.events.list(requestOptions)
      
      const events = (response.data.items || []).map((event: calendar_v3.Schema$Event) => 
        this.mapToEnhancedEvent(event)
      )

      return {
        events,
        nextSyncToken: response.data.nextSyncToken || undefined,
        nextPageToken: response.data.nextPageToken || undefined,
      }
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error listing events:', error)
      throw new Error(`Failed to list calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Map Google Calendar API response to our enhanced event format
   */
  private mapToEnhancedEvent(googleEvent: calendar_v3.Schema$Event): EnhancedCalendarEvent {
    return {
      // Basic info
      id: googleEvent.id || '',
      summary: googleEvent.summary || '',
      description: googleEvent.description || undefined,
      location: googleEvent.location || undefined,
      
      // Timing
      start: {
        dateTime: googleEvent.start?.dateTime || googleEvent.start?.date || '',
        timeZone: googleEvent.start?.timeZone || undefined,
      },
      end: {
        dateTime: googleEvent.end?.dateTime || googleEvent.end?.date || '',
        timeZone: googleEvent.end?.timeZone || undefined,
      },
      
      // Essential sync fields
      htmlLink: googleEvent.htmlLink || '',
      etag: googleEvent.etag || '',
      updated: googleEvent.updated || '',
      sequence: googleEvent.sequence || 0,
      iCalUID: googleEvent.iCalUID || '',
      
      // Status and visibility
      status: (googleEvent.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
      transparency: googleEvent.transparency as 'opaque' | 'transparent' | undefined,
      visibility: googleEvent.visibility as 'default' | 'public' | 'private' | 'confidential' | undefined,
      
      // People - handle null values properly
      attendees: googleEvent.attendees?.filter(attendee => attendee.email).map(attendee => ({
        email: attendee.email!,
        displayName: attendee.displayName || undefined,
        responseStatus: attendee.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined,
        optional: attendee.optional || undefined,
        organizer: attendee.organizer || undefined,
        self: attendee.self || undefined,
        resource: attendee.resource || undefined,
      })),
      organizer: googleEvent.organizer ? {
        email: googleEvent.organizer.email || '',
        displayName: googleEvent.organizer.displayName || undefined,
        self: googleEvent.organizer.self || undefined,
      } : undefined,
      creator: googleEvent.creator ? {
        email: googleEvent.creator.email || '',
        displayName: googleEvent.creator.displayName || undefined,
        self: googleEvent.creator.self || undefined,
      } : undefined,
      
      // Recurrence - handle null values
      recurrence: googleEvent.recurrence || undefined,
      recurringEventId: googleEvent.recurringEventId || undefined,
      originalStartTime: googleEvent.originalStartTime ? {
        dateTime: googleEvent.originalStartTime.dateTime || googleEvent.originalStartTime.date || '',
        timeZone: googleEvent.originalStartTime.timeZone || undefined,
      } : undefined,
      
      // Conference and communication - handle complex nested null values
      conferenceData: googleEvent.conferenceData ? {
        entryPoints: googleEvent.conferenceData.entryPoints?.filter(ep => ep.entryPointType && ep.uri).map(ep => ({
          entryPointType: ep.entryPointType!,
          uri: ep.uri!,
          label: ep.label || undefined,
          pin: ep.pin || undefined,
        })),
        conferenceSolution: googleEvent.conferenceData.conferenceSolution ? {
          key: { type: googleEvent.conferenceData.conferenceSolution.key?.type || '' },
          name: googleEvent.conferenceData.conferenceSolution.name || '',
          iconUri: googleEvent.conferenceData.conferenceSolution.iconUri || undefined,
        } : undefined,
        conferenceId: googleEvent.conferenceData.conferenceId || undefined,
        signature: googleEvent.conferenceData.signature || undefined,
        notes: googleEvent.conferenceData.notes || undefined,
      } : undefined,
      reminders: googleEvent.reminders ? {
        useDefault: googleEvent.reminders.useDefault || undefined,
        overrides: googleEvent.reminders.overrides?.map(override => ({
          method: override.method as 'email' | 'popup',
          minutes: override.minutes || 0,
        })),
      } : undefined,
      hangoutLink: googleEvent.hangoutLink || undefined,
      
      // Permissions - handle null values
      guestsCanModify: googleEvent.guestsCanModify || undefined,
      guestsCanInviteOthers: googleEvent.guestsCanInviteOthers || undefined,
      guestsCanSeeOtherGuests: googleEvent.guestsCanSeeOtherGuests || undefined,
      
      // Visual
      colorId: googleEvent.colorId || undefined,
      extendedProperties: googleEvent.extendedProperties || undefined,
    }
  }

  /**
   * Save enhanced event data to database
   */
  async saveEventToDatabase(shootId: number, event: EnhancedCalendarEvent): Promise<void> {
    try {
      await db.update(shoots)
        .set({
          // Basic sync fields
          googleCalendarEventId: event.id,
          googleCalendarSyncStatus: 'synced',
          googleCalendarLastSync: new Date(),
          googleCalendarError: null,
          
          // Enhanced sync fields
          googleCalendarHtmlLink: event.htmlLink,
          googleCalendarEtag: event.etag,
          googleCalendarUpdated: new Date(event.updated),
          googleCalendarSequence: event.sequence,
          googleCalendarICalUID: event.iCalUID,
          
          // Status and timezone
          googleCalendarTimeZone: event.start.timeZone,
          googleCalendarStatus: event.status,
          googleCalendarTransparency: event.transparency,
          googleCalendarVisibility: event.visibility,
          
          // People
          googleCalendarAttendees: event.attendees,
          googleCalendarOrganizer: event.organizer,
          googleCalendarCreator: event.creator,
          
          // Recurrence
          googleCalendarRecurrence: event.recurrence,
          googleCalendarRecurringEventId: event.recurringEventId,
          googleCalendarOriginalStartTime: event.originalStartTime ? new Date(event.originalStartTime.dateTime) : null,
          
          // Conference and reminders
          googleCalendarConferenceData: event.conferenceData,
          googleCalendarReminders: event.reminders,
          googleCalendarHangoutLink: event.hangoutLink,
          
          // Permissions
          googleCalendarGuestsCanModify: event.guestsCanModify || false,
          googleCalendarGuestsCanInviteOthers: event.guestsCanInviteOthers || false,
          googleCalendarGuestsCanSeeOtherGuests: event.guestsCanSeeOtherGuests !== false,
          
          // Visual
          googleCalendarColorId: event.colorId,
          
          updatedAt: new Date(),
        })
        .where(eq(shoots.id, shootId))

      console.log('💾 [GoogleCalendar] Enhanced event data saved to database:', {
        shootId,
        eventId: event.id,
        sequence: event.sequence
      })
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error saving event to database:', error)
      throw new Error(`Failed to save event to database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} 