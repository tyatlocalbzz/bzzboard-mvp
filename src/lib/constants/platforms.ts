// Centralized platform and content type constants
// This eliminates duplication across multiple components

import { Instagram, Facebook, Linkedin, Youtube, Twitter } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PlatformOption {
  name: string
  icon: LucideIcon | null
}

export const PLATFORM_ICONS = {
  Instagram,
  Facebook,
  LinkedIn: Linkedin,
  YouTube: Youtube,
  Twitter,
  TikTok: null,
  Pinterest: null
} as const

export const PLATFORM_OPTIONS: PlatformOption[] = [
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
  { name: 'LinkedIn', icon: Linkedin },
  { name: 'TikTok', icon: null },
  { name: 'YouTube', icon: Youtube },
  { name: 'X', icon: Twitter }
] as const

export const CONTENT_TYPE_OPTIONS = [
  { value: 'photo' as const, label: 'Photo' },
  { value: 'video' as const, label: 'Video' },
  { value: 'reel' as const, label: 'Reel' },
  { value: 'story' as const, label: 'Story' }
] as const

export type ContentType = typeof CONTENT_TYPE_OPTIONS[number]['value']
export type PlatformName = keyof typeof PLATFORM_ICONS 

// Hard-coded default platforms and content types
// These are always available and cannot be deleted

export interface DefaultPlatform {
  id: string
  name: string
  enabled: boolean
  isDefault: true
}

export interface DefaultContentType {
  id: string
  name: string
  value: string
  enabled: boolean
  isDefault: true
}

// Default platforms - always available
export const DEFAULT_PLATFORMS: DefaultPlatform[] = [
  { id: 'instagram', name: 'Instagram', enabled: true, isDefault: true },
  { id: 'facebook', name: 'Facebook', enabled: true, isDefault: true },
  { id: 'linkedin', name: 'LinkedIn', enabled: true, isDefault: true },
  { id: 'tiktok', name: 'TikTok', enabled: true, isDefault: true },
  { id: 'youtube', name: 'YouTube', enabled: true, isDefault: true },
  { id: 'x', name: 'X', enabled: true, isDefault: true }
]

// Default content types - always available
export const DEFAULT_CONTENT_TYPES: DefaultContentType[] = [
  { id: 'photo', name: 'Photo Post', value: 'photo', enabled: true, isDefault: true },
  { id: 'carousel', name: 'Carousel', value: 'carousel', enabled: true, isDefault: true },
  { id: 'reel', name: 'Reel', value: 'reel', enabled: true, isDefault: true },
  { id: 'video', name: 'Video', value: 'video', enabled: true, isDefault: true },
  { id: 'story', name: 'Story', value: 'story', enabled: true, isDefault: true }
]

// Platform settings stored in localStorage for user preferences
const PLATFORM_SETTINGS_KEY = 'bzzboard_platform_settings'
const CONTENT_TYPE_SETTINGS_KEY = 'bzzboard_content_type_settings'

export interface PlatformSettings {
  [platformId: string]: {
    enabled: boolean
  }
}

export interface ContentTypeSettings {
  [contentTypeId: string]: {
    enabled: boolean
  }
}

// Get platform settings from localStorage
export const getPlatformSettings = (): PlatformSettings => {
  if (typeof window === 'undefined') return {}
  
  try {
    const settings = localStorage.getItem(PLATFORM_SETTINGS_KEY)
    return settings ? JSON.parse(settings) : {}
  } catch {
    return {}
  }
}

// Save platform settings to localStorage
export const savePlatformSettings = (settings: PlatformSettings): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save platform settings:', error)
  }
}

// Get content type settings from localStorage
export const getContentTypeSettings = (): ContentTypeSettings => {
  if (typeof window === 'undefined') return {}
  
  try {
    const settings = localStorage.getItem(CONTENT_TYPE_SETTINGS_KEY)
    return settings ? JSON.parse(settings) : {}
  } catch {
    return {}
  }
}

// Save content type settings to localStorage
export const saveContentTypeSettings = (settings: ContentTypeSettings): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CONTENT_TYPE_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save content type settings:', error)
  }
}

// Update individual platform setting
export const updatePlatformSetting = (platformId: string, enabled: boolean): void => {
  const settings = getPlatformSettings()
  settings[platformId] = { enabled }
  savePlatformSettings(settings)
}

// Update individual content type setting
export const updateContentTypeSetting = (contentTypeId: string, enabled: boolean): void => {
  const settings = getContentTypeSettings()
  settings[contentTypeId] = { enabled }
  saveContentTypeSettings(settings)
}

// Get effective platforms (defaults + custom, with user settings applied)
export const getEffectivePlatforms = (customPlatforms: { id: number; name: string; enabled: boolean; isDefault: boolean }[] = []): (DefaultPlatform | { id: number; name: string; enabled: boolean; isDefault: boolean })[] => {
  const platformSettings = getPlatformSettings()
  
  // Apply user settings to defaults
  const effectiveDefaults = DEFAULT_PLATFORMS.map(platform => ({
    ...platform,
    enabled: platformSettings[platform.id]?.enabled ?? platform.enabled
  }))
  
  // Add custom platforms from database
  const effectiveCustom = customPlatforms.map(platform => ({
    ...platform,
    isDefault: false
  }))
  
  return [...effectiveDefaults, ...effectiveCustom]
}

// Get effective content types (defaults + custom, with user settings applied)
export const getEffectiveContentTypes = (customContentTypes: { id: number; name: string; value: string; enabled: boolean; isDefault: boolean }[] = []): (DefaultContentType | { id: number; name: string; value: string; enabled: boolean; isDefault: boolean })[] => {
  const contentTypeSettings = getContentTypeSettings()
  
  // Apply user settings to defaults
  const effectiveDefaults = DEFAULT_CONTENT_TYPES.map(contentType => ({
    ...contentType,
    enabled: contentTypeSettings[contentType.id]?.enabled ?? contentType.enabled
  }))
  
  // Add custom content types from database
  const effectiveCustom = customContentTypes.map(contentType => ({
    ...contentType,
    isDefault: false
  }))
  
  return [...effectiveDefaults, ...effectiveCustom]
} 