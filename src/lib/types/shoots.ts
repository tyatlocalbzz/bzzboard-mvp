// Centralized types for shoot-related functionality
// This eliminates type duplication across multiple files

export interface Shot {
  id: number
  text: string
  completed: boolean
  postIdeaId: number
  notes?: string
}

export interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  shots: Shot[]
  caption?: string
}

// Extended PostIdea interface for API responses and hook usage
// Consolidates type definitions from multiple files to eliminate duplication
export interface ExtendedPostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
}

// Consolidated shoot status type
export type ShootStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

// Google Calendar attendee type (shared across multiple interfaces)
export interface GoogleCalendarAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  optional?: boolean
  organizer?: boolean
  self?: boolean
  resource?: boolean
}

// Google Calendar organizer/creator type
export interface GoogleCalendarPerson {
  email: string
  displayName?: string
  self?: boolean
}

// Google Calendar conference data type
export interface GoogleCalendarConferenceData {
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

// Google Calendar reminders type
export interface GoogleCalendarReminders {
  useDefault?: boolean
  overrides?: Array<{
    method: 'email' | 'popup'
    minutes: number
  }>
}

// Client information type for shoots
export interface ShootClient {
  id: number
  name: string
}

// Base Shoot interface - represents frontend view
export interface Shoot {
  id: number
  title: string
  client: string | ShootClient // Flexible - can be string or object
  scheduledAt: string | Date // Flexible - can be string or Date
  duration: number // in minutes
  location: string | null
  status: ShootStatus
  startedAt?: string | Date | null
  completedAt?: string | Date | null
  notes?: string | null
  postIdeasCount?: number
  
  // Enhanced Google Calendar integration fields
  googleCalendarEventId?: string | null
  googleCalendarSyncStatus?: 'pending' | 'synced' | 'error' | null
  googleCalendarLastSync?: string | Date | null
  googleCalendarError?: string | null
  googleCalendarHtmlLink?: string
  googleCalendarEtag?: string
  googleCalendarUpdated?: string
  googleCalendarSequence?: number
  googleCalendarICalUID?: string
  googleCalendarTimeZone?: string
  googleCalendarStatus?: string
  googleCalendarTransparency?: string
  googleCalendarVisibility?: string
  googleCalendarAttendees?: GoogleCalendarAttendee[]
  googleCalendarOrganizer?: GoogleCalendarPerson
  googleCalendarCreator?: GoogleCalendarPerson
  googleCalendarRecurrence?: string[]
  googleCalendarRecurringEventId?: string
  googleCalendarOriginalStartTime?: string
  googleCalendarConferenceData?: GoogleCalendarConferenceData
  googleCalendarReminders?: GoogleCalendarReminders
  googleCalendarHangoutLink?: string
  googleCalendarGuestsCanModify?: boolean
  googleCalendarGuestsCanInviteOthers?: boolean
  googleCalendarGuestsCanSeeOtherGuests?: boolean
  googleCalendarColorId?: string
  googleCalendarLocationEnhanced?: {
    displayName?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  
  // Soft delete fields (optional - mainly for admin/database operations)
  deletedAt?: Date | null
  deletedBy?: number | null
  createdAt?: Date
  updatedAt?: Date
}

// Database-specific shoot type (matches database schema exactly)
export interface ShootWithClient extends Omit<Shoot, 'client' | 'scheduledAt' | 'startedAt' | 'completedAt' | 'googleCalendarLastSync' | 'deletedAt' | 'deletedBy' | 'createdAt' | 'updatedAt'> {
  clientId: number
  client: ShootClient | null
  scheduledAt: Date
  startedAt: Date | null
  completedAt: Date | null
  googleCalendarLastSync: Date | null
  deletedAt: Date | null
  deletedBy: number | null
  createdAt: Date
  updatedAt: Date
}

// API input type for creating shoots
export interface CreateShootInput {
  title: string
  clientId: number
  scheduledAt: Date
  duration: number
  location?: string
  notes?: string
}

export interface ActiveShootData {
  shoot: Shoot
  postIdeas: PostIdea[]
}

export interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string
}

// Context types
export interface ActiveShoot {
  id: number
  title: string
  client: string
  startedAt: string
}

// API response types
export interface ShootWithPostIdeas extends Shoot {
  postIdeas: PostIdea[]
}

// Upload-related types
export interface UploadedFile {
  id: number
  fileName: string
  fileSize: number
  mimeType: string
  webViewLink: string
  webContentLink?: string
  driveFileId: string
  uploadedAt: string
  postIdeaId?: number
  shootId?: number
}

export interface UploadProgress {
  uploadedBytes: number
  totalBytes: number
  percentage: number
  status: 'uploading' | 'completed' | 'failed' | 'paused'
}

export interface UploadRequest {
  file: File
  postIdeaId?: number
  shootId?: number
  notes?: string
}

export interface DriveFolder {
  id: string
  name: string
  webViewLink: string
  shareLink?: string
}

// Unified Event Types for Enhanced Shoots Page
export interface CalendarEventAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
}

export interface UnifiedEvent {
  type: 'shoot' | 'calendar'
  id: string
  title: string
  startTime: string // ISO string
  endTime: string // ISO string
  duration: number // in minutes
  location?: string
  
  // Shoot-specific fields
  client?: string
  shootStatus?: 'scheduled' | 'active' | 'completed' | 'cancelled'
  postIdeasCount?: number
  shootId?: number
  
  // Calendar-specific fields
  description?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  attendees?: CalendarEventAttendee[]
  isRecurring?: boolean
  conflictDetected?: boolean
  conflictDetails?: Array<{
    eventId: string
    title: string
    startTime: string
    endTime: string
  }>
  syncStatus?: 'synced' | 'pending' | 'error'
  isShootEvent?: boolean
  lastModified?: string
  
  // Common fields
  notes?: string
}

export type UnifiedEventFilter = 'shoots' | 'calendar' | 'all'

export interface UnifiedEventsResponse {
  success: boolean
  events: UnifiedEvent[]
  totalCount: number
  filter: UnifiedEventFilter
  shootsCount: number
  calendarEventsCount: number
}

// API Request/Response Types (Centralized from API routes)
export interface CreateShootBody {
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

export interface ShootUpdateBody {
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
  action?: 'start' | 'complete'
  title?: string
  duration?: number
  location?: string
  notes?: string
  scheduledAt?: string
}

export interface AssignToShootBody {
  shootId: string | number
}

export interface RestoreShootBody {
  shootId: number
  action: string
}

// API Response Types
export interface ShootApiResponse {
  success: boolean
  message?: string
  data?: {
    shoot?: Shoot
    postIdeas?: ExtendedPostIdea[]
  }
  hasConflicts?: boolean
  conflicts?: Array<{
    title: string
    startTime: string
    endTime: string
  }>
  recoveryNote?: string
} 