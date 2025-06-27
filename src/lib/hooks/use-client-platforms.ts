import { useMemo } from 'react'
import { PLATFORM_OPTIONS, PlatformOption, getEffectivePlatforms } from '@/lib/constants/platforms'

/**
 * Get admin-enabled platforms from localStorage and defaults
 */
const getAdminEnabledPlatforms = (): string[] => {
  try {
    // Get effective platforms (includes admin settings)
    const effectivePlatforms = getEffectivePlatforms([])
    
    // Filter to only enabled platforms and extract names
    const enabledPlatforms = effectivePlatforms
      .filter(platform => platform.enabled)
      .map(platform => platform.name)
    
    return enabledPlatforms
  } catch (error) {
    console.error('Error getting admin enabled platforms:', error)
    // Fallback to all default platforms if there's an error
    return ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X']
  }
}

/**
 * Simplified platform hook - only shows admin-enabled platforms
 * No client configuration logic, no complex filtering
 */
export const useAdminEnabledPlatforms = (): PlatformOption[] => {
  return useMemo(() => {
    const adminEnabledPlatforms = getAdminEnabledPlatforms()
    
    // Return only admin-enabled platforms
    return PLATFORM_OPTIONS.filter(platform => 
      adminEnabledPlatforms.includes(platform.name)
    )
  }, [])
}

// Legacy hooks - all now use the same simplified logic
export const useConfiguredPlatforms = (): PlatformOption[] => {
  return useAdminEnabledPlatforms()
}

export const useConfiguredPlatformsWithOverride = (): PlatformOption[] => {
  return useAdminEnabledPlatforms()
}

export const useAllPlatformsWithStatus = (): PlatformOption[] => {
  return useAdminEnabledPlatforms()
}

export const useAllPlatformsWithStatusAndOverride = (): PlatformOption[] => {
  return useAdminEnabledPlatforms()
}

export const useClientPlatforms = (): PlatformOption[] => {
  return useAdminEnabledPlatforms()
} 