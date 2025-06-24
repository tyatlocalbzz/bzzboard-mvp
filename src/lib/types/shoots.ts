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

export interface Shoot {
  id: number
  title: string
  client: string
  scheduledAt: string
  duration: number // in minutes
  location: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  startedAt?: string
  notes?: string
  postIdeasCount?: number
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