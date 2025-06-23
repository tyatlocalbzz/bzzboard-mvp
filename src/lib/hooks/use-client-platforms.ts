import { useMemo } from 'react'
import { PLATFORM_OPTIONS, PlatformOption } from '@/lib/constants/platforms'
import { useClient } from '@/contexts/client-context'
import { ClientData } from '@/lib/types/client'

export interface ClientPlatformOption extends PlatformOption {
  isConfigured: boolean
  handle?: string
}

/**
 * Custom hook that returns platform options filtered by client's configured social media handles
 * @param showOnlyConfigured - If true, only shows platforms with handles configured
 * @param includeUnconfigured - If true, shows unconfigured platforms with visual indicators
 */
export const useClientPlatforms = (
  showOnlyConfigured: boolean = true,
  includeUnconfigured: boolean = false
): ClientPlatformOption[] => {
  const { selectedClient } = useClient()

  return useMemo(() => {
    // If no client selected or "All Clients" selected, show all platforms
    if (!selectedClient || selectedClient.type === 'all') {
      return PLATFORM_OPTIONS.map(platform => ({
        ...platform,
        isConfigured: false
      }))
    }

    // Map platform names to social media keys
    const platformToSocialKey: Record<string, keyof NonNullable<ClientData['socialMedia']>> = {
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'LinkedIn': 'linkedin',
      'Twitter': 'twitter',
      'TikTok': 'tiktok',
      'YouTube': 'youtube'
    }

    const clientPlatforms: ClientPlatformOption[] = PLATFORM_OPTIONS.map(platform => {
      const socialKey = platformToSocialKey[platform.name]
      const handle = socialKey ? selectedClient.socialMedia?.[socialKey] : undefined
      const isConfigured = Boolean(handle?.trim())

      return {
        ...platform,
        isConfigured,
        handle: handle?.trim()
      }
    })

    // Filter based on configuration preferences
    if (showOnlyConfigured && !includeUnconfigured) {
      // Only show configured platforms
      return clientPlatforms.filter(platform => platform.isConfigured)
    } else if (includeUnconfigured) {
      // Show all platforms with configuration indicators
      return clientPlatforms
    } else {
      // Show all platforms (default behavior)
      return clientPlatforms
    }
  }, [selectedClient, showOnlyConfigured, includeUnconfigured])
}

/**
 * Hook that returns only configured platforms for the selected client
 */
export const useConfiguredPlatforms = (): ClientPlatformOption[] => {
  return useClientPlatforms(true, false)
}

/**
 * Hook that returns all platforms with configuration status
 */
export const useAllPlatformsWithStatus = (): ClientPlatformOption[] => {
  return useClientPlatforms(false, true)
} 