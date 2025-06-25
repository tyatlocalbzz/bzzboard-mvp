// Admin-related types for system settings management

export interface AdminPlatform {
  id: number
  name: string
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminContentType {
  id: number
  name: string
  value: string
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminSystemSetting {
  id: number
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  createdAt: string
  updatedAt: string
}

// API request/response types
export interface CreatePlatformRequest {
  name: string
}

export interface CreateContentTypeRequest {
  name: string
  value: string
}

export interface UpdateSystemSettingRequest {
  key: string
  value: string
  type?: 'string' | 'number' | 'boolean' | 'json'
  description?: string
}

export interface AdminSettingsResponse {
  success: boolean
  platforms: AdminPlatform[]
  contentTypes: AdminContentType[]
  settings: AdminSystemSetting[]
  error?: string
}

// Common timezone options for admin settings
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' }
] as const

export type TimezoneValue = typeof TIMEZONE_OPTIONS[number]['value'] 