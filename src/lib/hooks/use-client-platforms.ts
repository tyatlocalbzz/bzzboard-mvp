import { useMemo } from 'react'
import { PLATFORM_OPTIONS, PlatformOption, getEffectivePlatforms } from '@/lib/constants/platforms'
import { useClient } from '@/contexts/client-context'
import { ClientData } from '@/lib/types/client'

export interface ClientPlatformOption extends PlatformOption {
  isConfigured: boolean
  handle?: string
  isAdminEnabled: boolean
}

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
    
    console.log('🔍 [Debug] Admin enabled platforms:', enabledPlatforms)
    return enabledPlatforms
  } catch (error) {
    console.error('Error getting admin enabled platforms:', error)
    // Fallback to all default platforms if there's an error
    const fallback = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X']
    console.log('🔍 [Debug] Using fallback platforms:', fallback)
    return fallback
  }
}

/**
 * Custom hook that returns platform options with admin and client filtering
 * @param filterByAdmin - If true, only shows admin-enabled platforms
 * @param filterByClient - If true, only shows platforms with client handles configured
 * @param includeUnconfigured - If true, shows unconfigured platforms with visual indicators
 * @param clientOverride - Optional client data to use instead of the global context client
 */
export const useClientPlatforms = (
  filterByAdmin: boolean = true,
  filterByClient: boolean = false,
  includeUnconfigured: boolean = false,
  clientOverride?: ClientData | null
): ClientPlatformOption[] => {
  const { selectedClient } = useClient()

  return useMemo(() => {
    // Use override client if provided, otherwise use context client
    const effectiveClient = clientOverride !== undefined ? clientOverride : selectedClient
    
    // Get admin-enabled platforms
    const adminEnabledPlatforms = getAdminEnabledPlatforms()
    
    console.log('🔍 [Debug] Effective client:', effectiveClient?.name, effectiveClient?.socialMedia)
    console.log('🔍 [Debug] Filter settings:', { filterByAdmin, filterByClient, includeUnconfigured })
    
    // Map platform names to social media keys
    const platformToSocialKey: Record<string, keyof NonNullable<ClientData['socialMedia']>> = {
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'LinkedIn': 'linkedin',
      'X': 'twitter', // X platform uses the twitter field in client data
      'TikTok': 'tiktok',
      'YouTube': 'youtube'
    }

    const clientPlatforms: ClientPlatformOption[] = PLATFORM_OPTIONS
      .filter(platform => {
        // Filter by admin-enabled platforms if requested
        if (filterByAdmin && !adminEnabledPlatforms.includes(platform.name)) {
          console.log('🔍 [Debug] Filtering out admin-disabled platform:', platform.name)
          return false
        }
        return true
      })
      .map(platform => {
        const socialKey = platformToSocialKey[platform.name]
        const handle = socialKey && effectiveClient?.socialMedia?.[socialKey] ? effectiveClient.socialMedia[socialKey] : undefined
        const isConfigured = Boolean(handle?.trim())
        const isAdminEnabled = adminEnabledPlatforms.includes(platform.name)

        console.log('🔍 [Debug] Platform:', platform.name, { socialKey, handle, isConfigured, isAdminEnabled })

        return {
          ...platform,
          isConfigured,
          handle: handle?.trim(),
          isAdminEnabled
        }
      })

    // Apply client-based filtering
    if (filterByClient && !includeUnconfigured) {
      // Only show configured platforms
      const configuredPlatforms = clientPlatforms.filter(platform => platform.isConfigured)
      console.log('🔍 [Debug] Configured platforms only:', configuredPlatforms.map(p => p.name))
      return configuredPlatforms
    } else if (filterByClient && includeUnconfigured) {
      // Show all admin-enabled platforms with configuration indicators
      console.log('🔍 [Debug] All admin-enabled platforms with status:', clientPlatforms.map(p => ({ name: p.name, configured: p.isConfigured })))
      return clientPlatforms
    } else {
      // Show all platforms (respecting admin filter if applied)
      console.log('🔍 [Debug] All platforms (respecting admin filter):', clientPlatforms.map(p => p.name))
      return clientPlatforms
    }
  }, [selectedClient, clientOverride, filterByAdmin, filterByClient, includeUnconfigured])
}

/**
 * Hook for client settings form - shows only admin-enabled platforms
 */
export const useAdminEnabledPlatforms = (): ClientPlatformOption[] => {
  return useClientPlatforms(true, false, true)
}

/**
 * Hook for post idea forms - shows only client-configured platforms
 */
export const useConfiguredPlatforms = (): ClientPlatformOption[] => {
  return useClientPlatforms(true, true, false)
}

/**
 * Hook for post idea forms with client override - shows only client-configured platforms
 * This is useful when creating posts in a shoot context where the shoot's client
 * should override the global client selector
 */
export const useConfiguredPlatformsWithOverride = (clientOverride?: ClientData | null): ClientPlatformOption[] => {
  return useClientPlatforms(true, true, false, clientOverride)
}

/**
 * Hook that returns all platforms with configuration status (for forms that need to show all)
 */
export const useAllPlatformsWithStatus = (): ClientPlatformOption[] => {
  return useClientPlatforms(true, false, true)
}

/**
 * Hook that returns all platforms with configuration status and client override
 */
export const useAllPlatformsWithStatusAndOverride = (clientOverride?: ClientData | null): ClientPlatformOption[] => {
  return useClientPlatforms(true, false, true, clientOverride)
}

/**
 * Legacy hook - maintained for backward compatibility
 * @deprecated Use more specific hooks like useAdminEnabledPlatforms or useConfiguredPlatforms
 */
export const useClientPlatforms_Legacy = (
  showOnlyConfigured: boolean = true,
  includeUnconfigured: boolean = false
): ClientPlatformOption[] => {
  return useClientPlatforms(true, showOnlyConfigured, includeUnconfigured)
} 