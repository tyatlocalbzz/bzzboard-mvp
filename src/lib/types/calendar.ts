// Calendar event types for UI components
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string // ISO string
  endTime: string // ISO string
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  attendees: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  isRecurring: boolean
  conflictDetected: boolean
  conflictDetails?: Array<{
    eventId: string
    title: string
    startTime: string
    endTime: string
  }>
  syncStatus: 'synced' | 'pending' | 'error'
  shootId?: number
  isShootEvent: boolean
  duration: number // in minutes
  lastModified: string // ISO string
}

export interface CalendarEventsResponse {
  success: boolean
  events: CalendarEvent[]
  totalCount: number
  filter: 'all' | 'shoots'
  dateRange?: {
    startDate: string
    endDate: string
  } | null
}

export type CalendarViewType = 'list' | 'weekly' | 'daily'

export interface CalendarFilters {
  viewType: CalendarViewType
  filter: 'all' | 'shoots'
  selectedDate: Date
}

// Helper types for calendar views
export interface DayEvents {
  date: string // YYYY-MM-DD format
  events: CalendarEvent[]
}

export interface WeekEvents {
  weekStart: string // YYYY-MM-DD format
  days: DayEvents[]
}

// Google Calendar Configuration Settings (Simplified)
export interface GoogleCalendarSettings {
  // Calendar Selection - the only setting users need
  selectedCalendars: string[]
}

// Default settings (simplified)
export const DEFAULT_GOOGLE_CALENDAR_SETTINGS: GoogleCalendarSettings = {
  selectedCalendars: ['primary']
}

// Settings validation (simplified)
export const validateGoogleCalendarSettings = (settings: Partial<GoogleCalendarSettings>): string[] => {
  const errors: string[] = []
  
  if (settings.selectedCalendars && !Array.isArray(settings.selectedCalendars)) {
    errors.push('Selected calendars must be an array')
  }
  
  if (settings.selectedCalendars && settings.selectedCalendars.length === 0) {
    errors.push('At least one calendar must be selected')
  }
  
  return errors
}

// Helper function to get sync end date (fixed to 2 weeks)
export const getSyncEndDate = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 14) // Fixed 2-week sync range
  
  return endDate
} 