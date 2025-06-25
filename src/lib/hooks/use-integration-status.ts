import { useCallback } from 'react'
import { useApiData } from './use-api-data'

export interface IntegrationStatus {
  googleDrive: {
    connected: boolean
    settings?: {
      parentFolderId?: string
      parentFolderName?: string
      folderNamingPattern?: string
      autoCreateYearFolders?: boolean
    }
  }
  googleCalendar: {
    connected: boolean
    settings?: {
      primaryCalendarId?: string
      primaryCalendarName?: string
      conflictDetection?: boolean
      syncEnabled?: boolean
    }
  }
}

interface UseIntegrationStatusReturn {
  status: IntegrationStatus | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  isGoogleDriveConnected: boolean
  isGoogleCalendarConnected: boolean
}

/**
 * Reusable hook for integration status management
 * Eliminates duplicate API calls across IntegrationsManager, GoogleDriveSettings,
 * GoogleCalendarSettings, ClientStorageSettingsForm, StorageSetupStep, and ClientSettingsTab
 */
export const useIntegrationStatus = (): UseIntegrationStatusReturn => {
  // Transform function to handle API response
  const transform = useCallback((apiResponse: unknown) => {
    // The apiResponse is the full API response: { success: true, data: { integrations: {...} } }
    const response = apiResponse as { success: boolean; data?: { integrations?: IntegrationStatus } }
    
    if (response.success && response.data?.integrations) {
      return response.data.integrations
    }
    
    // Fallback for unexpected structure
    return {
      googleDrive: { connected: false },
      googleCalendar: { connected: false }
    }
  }, [])

  // Error callback for consistent error handling
  const onError = useCallback((error: string) => {
    console.error('❌ [useIntegrationStatus] Error fetching integration status:', error)
  }, [])

  // Use standardized API data hook
  const { data: status, isLoading, error, refresh } = useApiData<IntegrationStatus>({
    endpoint: '/api/integrations/status',
    transform,
    onError
  })

  // Computed values for convenience
  const isGoogleDriveConnected = status?.googleDrive?.connected || false
  const isGoogleCalendarConnected = status?.googleCalendar?.connected || false

  return {
    status,
    isLoading,
    error,
    refresh,
    isGoogleDriveConnected,
    isGoogleCalendarConnected
  }
} 