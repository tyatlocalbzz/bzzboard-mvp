'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApiMutation } from './use-api-data'
import type { AdminSystemSetting } from '@/lib/types/admin'
import { 
  DEFAULT_PLATFORMS, 
  DEFAULT_CONTENT_TYPES,
  getEffectivePlatforms,
  getEffectiveContentTypes,
  updatePlatformSetting,
  updateContentTypeSetting
} from '@/lib/constants/platforms'

interface SystemSettingsData {
  platforms: (typeof DEFAULT_PLATFORMS[0] | { id: number; name: string; enabled: boolean; isDefault: boolean })[]
  contentTypes: (typeof DEFAULT_CONTENT_TYPES[0] | { id: number; name: string; value: string; enabled: boolean; isDefault: boolean })[]
  settings: AdminSystemSetting[]
}

interface UseSystemSettingsReturn {
  data: SystemSettingsData | null
  loading: boolean
  error: string | null
  isRefreshing: boolean
  refresh: () => Promise<void>
  
  // Platform operations
  createPlatform: (name: string) => Promise<void>
  updatePlatformStatus: (id: string | number, enabled: boolean) => Promise<void>
  deletePlatform: (id: number) => Promise<void>
  
  // Content type operations
  createContentType: (name: string, value: string) => Promise<void>
  updateContentTypeStatus: (id: string | number, enabled: boolean) => Promise<void>
  deleteContentType: (id: number) => Promise<void>
  
  // Settings operations
  updateSetting: (key: string, value: string, type?: string, description?: string) => Promise<void>
}

export const useSystemSettings = (): UseSystemSettingsReturn => {
  const [data, setData] = useState<SystemSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isFetchingRef = useRef(false)

  // Centralized data fetcher with debouncing to prevent rapid re-fetches
  const fetchData = useCallback(async (isInitialLoad = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('🔧 [useSystemSettings] Fetch already in progress, skipping...')
      return
    }

    try {
      isFetchingRef.current = true
      
      // Don't show loading spinner for refreshes, only for initial load
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now()
      const [platformsRes, contentTypesRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/platforms?_t=${timestamp}`),
        fetch(`/api/admin/content-types?_t=${timestamp}`),
        fetch(`/api/admin/settings?_t=${timestamp}`)
      ])

      if (!platformsRes.ok || !contentTypesRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch system settings')
      }

      const [platformsData, contentTypesData, settingsData] = await Promise.all([
        platformsRes.json(),
        contentTypesRes.json(),
        settingsRes.json()
      ])

      // Handle standardized API response format: { success: true, data: { ... } }
      const platforms = platformsData.success ? platformsData.data.platforms : platformsData.platforms
      const contentTypes = contentTypesData.success ? contentTypesData.data.contentTypes : contentTypesData.contentTypes
      const settings = settingsData.success ? settingsData.data.settings : settingsData.settings

      // Combine hard-coded defaults with custom items from database
      const effectivePlatforms = getEffectivePlatforms(platforms || [])
      const effectiveContentTypes = getEffectiveContentTypes(contentTypes || [])

      setData({
        platforms: effectivePlatforms,
        contentTypes: effectiveContentTypes,
        settings: settings || []
      })
      
      // Debug logging for settings
      console.log('🔧 [useSystemSettings] Data updated:', {
        settingsCount: settings?.length || 0,
        timezoneFromAPI: settings?.find((s: { key: string; value: string }) => s.key === 'default_timezone'),
        rawResponse: settingsData,
        processedSettings: settings
      })
    } catch (err) {
      console.error('Error fetching system settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings')
      setData(null)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setIsRefreshing(false)
      }
      isFetchingRef.current = false
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchData(true) // Mark as initial load
  }, [fetchData])

  // Mutation hooks for different operations
  const createPlatformMutation = useApiMutation<void, { name: string }>('/api/admin/platforms', 'POST')
  const updatePlatformMutation = useApiMutation<void, { id: number; enabled: boolean }>('/api/admin/platforms', 'PATCH')
  const deletePlatformMutation = useApiMutation<void, { id: number }>((variables) => `/api/admin/platforms?id=${variables.id}`, 'DELETE')
  
  const createContentTypeMutation = useApiMutation<void, { name: string; value: string }>('/api/admin/content-types', 'POST')
  const updateContentTypeMutation = useApiMutation<void, { id: number; enabled: boolean }>('/api/admin/content-types', 'PATCH')
  const deleteContentTypeMutation = useApiMutation<void, { id: number }>((variables) => `/api/admin/content-types?id=${variables.id}`, 'DELETE')
  
  const updateSettingMutation = useApiMutation<void, { key: string; value: string; type?: string; description?: string }>('/api/admin/settings', 'PATCH')

  // Platform operations with optimized refresh
  const createPlatform = useCallback(async (name: string) => {
    await createPlatformMutation.mutate({ name })
    await fetchData(false) // Refresh without full loading state
  }, [createPlatformMutation, fetchData])

  const updatePlatformStatus = useCallback(async (id: string | number, enabled: boolean) => {
    try {
      // Handle default platforms (string IDs) vs custom platforms (number IDs)
      if (typeof id === 'string') {
        // Default platform - update in localStorage
        updatePlatformSetting(id, enabled)
        await fetchData(false) // Refresh to show updated state
      } else {
        // Custom platform - update in database
        await updatePlatformMutation.mutate({ id, enabled })
        await fetchData(false)
      }
    } catch (err) {
      console.error('Error updating platform:', err)
      throw err
    }
  }, [updatePlatformMutation, fetchData])

  const deletePlatform = useCallback(async (id: number) => {
    await deletePlatformMutation.mutate({ id })
    await fetchData(false)
  }, [deletePlatformMutation, fetchData])

  // Content type operations
  const createContentType = useCallback(async (name: string, value: string) => {
    await createContentTypeMutation.mutate({ name, value })
    await fetchData(false)
  }, [createContentTypeMutation, fetchData])

  const updateContentTypeStatus = useCallback(async (id: string | number, enabled: boolean) => {
    try {
      // Handle default content types (string IDs) vs custom content types (number IDs)
      if (typeof id === 'string') {
        // Default content type - update in localStorage
        updateContentTypeSetting(id, enabled)
        await fetchData(false) // Refresh to show updated state
      } else {
        // Custom content type - update in database
        await updateContentTypeMutation.mutate({ id, enabled })
        await fetchData(false)
      }
    } catch (err) {
      console.error('Error updating content type:', err)
      throw err
    }
  }, [updateContentTypeMutation, fetchData])

  const deleteContentType = useCallback(async (id: number) => {
    await deleteContentTypeMutation.mutate({ id })
    await fetchData(false)
  }, [deleteContentTypeMutation, fetchData])

  // Settings operations with optimized refresh
  const updateSetting = useCallback(async (
    key: string, 
    value: string, 
    type: string = 'string', 
    description?: string
  ) => {
    console.log('🔧 [useSystemSettings] updateSetting called:', { key, value, type, description })
    await updateSettingMutation.mutate({ key, value, type, description })
    console.log('🔧 [useSystemSettings] Setting mutation completed, refreshing data...')
    await fetchData(false) // Refresh without full loading state
    console.log('🔧 [useSystemSettings] Data refresh completed')
  }, [updateSettingMutation, fetchData])

  return {
    data,
    loading,
    error,
    isRefreshing,
    refresh: () => fetchData(false),
    createPlatform,
    updatePlatformStatus,
    deletePlatform,
    createContentType,
    updateContentTypeStatus,
    deleteContentType,
    updateSetting
  }
} 