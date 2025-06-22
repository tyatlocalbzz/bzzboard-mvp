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
  { name: 'Twitter', icon: Twitter },
  { name: 'Pinterest', icon: null }
] as const

export const CONTENT_TYPE_OPTIONS = [
  { value: 'photo' as const, label: 'Photo' },
  { value: 'video' as const, label: 'Video' },
  { value: 'reel' as const, label: 'Reel' },
  { value: 'story' as const, label: 'Story' }
] as const

export type ContentType = typeof CONTENT_TYPE_OPTIONS[number]['value']
export type PlatformName = keyof typeof PLATFORM_ICONS 