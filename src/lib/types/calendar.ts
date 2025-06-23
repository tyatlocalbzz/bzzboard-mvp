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

// Google Calendar Configuration Settings
export interface GoogleCalendarSettings {
  // Calendar Selection
  selectedCalendars: string[]
  
  // Sync Time Range (based on user preference: 5 days to 2 weeks ahead)
  syncTimeRange: '5-days' | '1-week' | '2-weeks'
  
  // Event Type Filtering
  eventTypeFilter: 'all' | 'business-hours-only' | 'shoots-only'
  excludeAllDayEvents: boolean
  
  // Shoot Event Detection
  shootKeywords: string[] // Default: ["shoot"]
  autoTagShootEvents: boolean
  requireShootConfirmation: boolean
  
  // Working Hours & Availability
  workingHours: {
    enabled: boolean
    start: string // "09:00"
    end: string   // "18:00"
    timezone: string
    days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[]
  }
  
  // Conflict Detection Settings
  conflictBuffer: number // minutes before/after shoots
  allowOverlappingEvents: boolean
  conflictNotifications: 'none' | 'warning' | 'block'
  
  // Event Creation Preferences
  defaultShootDuration: number // minutes (default: 120)
  defaultEventVisibility: 'private' | 'public' | 'default'
  autoInviteClients: boolean
  includeLocationInTitle: boolean
}

// Default settings following user requirements
export const DEFAULT_GOOGLE_CALENDAR_SETTINGS: GoogleCalendarSettings = {
  selectedCalendars: ['primary'],
  syncTimeRange: '2-weeks', // User books 5 days to 2 weeks ahead
  eventTypeFilter: 'all',
  excludeAllDayEvents: false,
  shootKeywords: ['shoot'], // User specified: "Shoots should have the word shoot in them"
  autoTagShootEvents: true,
  requireShootConfirmation: false,
  workingHours: {
    enabled: false,
    start: '09:00',
    end: '18:00',
    timezone: 'America/New_York', // Will be detected from user's primary calendar
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  conflictBuffer: 15, // 15 minutes buffer (included but not priority)
  allowOverlappingEvents: false,
  conflictNotifications: 'warning',
  defaultShootDuration: 120, // 2 hours default
  defaultEventVisibility: 'default',
  autoInviteClients: false, // User said "Clients just need to get confirmations"
  includeLocationInTitle: false
}

// Settings validation and helper functions
export const validateGoogleCalendarSettings = (settings: Partial<GoogleCalendarSettings>): string[] => {
  const errors: string[] = []
  
  if (settings.syncTimeRange && !['5-days', '1-week', '2-weeks'].includes(settings.syncTimeRange)) {
    errors.push('Invalid sync time range')
  }
  
  if (settings.shootKeywords && settings.shootKeywords.length === 0) {
    errors.push('At least one shoot keyword is required')
  }
  
  if (settings.conflictBuffer && (settings.conflictBuffer < 0 || settings.conflictBuffer > 480)) {
    errors.push('Conflict buffer must be between 0 and 480 minutes')
  }
  
  if (settings.defaultShootDuration && (settings.defaultShootDuration < 15 || settings.defaultShootDuration > 720)) {
    errors.push('Default shoot duration must be between 15 minutes and 12 hours')
  }
  
  return errors
}

// Helper function to get sync end date based on time range
export const getSyncEndDate = (syncTimeRange: GoogleCalendarSettings['syncTimeRange']): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const endDate = new Date(today)
  
  switch (syncTimeRange) {
    case '5-days':
      endDate.setDate(endDate.getDate() + 5)
      break
    case '1-week':
      endDate.setDate(endDate.getDate() + 7)
      break
    case '2-weeks':
      endDate.setDate(endDate.getDate() + 14)
      break
  }
  
  return endDate
}

// Helper function to detect if an event is a shoot based on keywords
export const isShootEvent = (title: string, keywords: string[]): boolean => {
  if (!title || keywords.length === 0) return false
  
  const lowerTitle = title.toLowerCase()
  return keywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()))
}

// Helper function to check if event is within working hours
export const isWithinWorkingHours = (
  eventStart: Date, 
  eventEnd: Date, 
  workingHours: GoogleCalendarSettings['workingHours']
): boolean => {
  if (!workingHours.enabled) return true
  
  const dayName = eventStart.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as GoogleCalendarSettings['workingHours']['days'][number]
  if (!workingHours.days.includes(dayName)) return false
  
  const startTime = eventStart.toTimeString().slice(0, 5) // "HH:MM"
  const endTime = eventEnd.toTimeString().slice(0, 5)
  
  return startTime >= workingHours.start && endTime <= workingHours.end
} 