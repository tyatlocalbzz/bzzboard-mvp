'use client'

import { useState, useEffect, useCallback } from 'react'
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

  // Fetch system settings data (only custom platforms/content types + settings)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [platformsRes, contentTypesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/platforms'),
        fetch('/api/admin/content-types'),
        fetch('/api/admin/settings')
      ])

      if (!platformsRes.ok || !contentTypesRes.ok || !settingsRes.ok) {
        throw new Error('Failed to fetch system settings')
      }

      const [platformsData, contentTypesData, settingsData] = await Promise.all([
        platformsRes.json(),
        contentTypesRes.json(),
        settingsRes.json()
      ])

      // Combine hard-coded defaults with custom items from database
      const effectivePlatforms = getEffectivePlatforms(platformsData.platforms || [])
      const effectiveContentTypes = getEffectiveContentTypes(contentTypesData.contentTypes || [])

      setData({
        platforms: effectivePlatforms,
        contentTypes: effectiveContentTypes,
        settings: settingsData.settings || []
      })
    } catch (err) {
      console.error('Error fetching system settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings')
    } finally {
      setLoading(false)
    }
  }, [])

  // Platform operations
  const createPlatform = useCallback(async (name: string) => {
    try {
      const response = await fetch('/api/admin/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create platform')
      }

      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error creating platform:', err)
      throw err
    }
  }, [fetchData])

  const updatePlatformStatus = useCallback(async (id: string | number, enabled: boolean) => {
    try {
      // Handle default platforms (string IDs) vs custom platforms (number IDs)
      if (typeof id === 'string') {
        // Default platform - update in localStorage
        updatePlatformSetting(id, enabled)
        await fetchData() // Refresh to show updated state
      } else {
        // Custom platform - update in database
        const response = await fetch('/api/admin/platforms', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, enabled })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update platform')
        }

        await fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Error updating platform:', err)
      throw err
    }
  }, [fetchData])

  const deletePlatform = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/admin/platforms?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete platform')
      }

      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error deleting platform:', err)
      throw err
    }
  }, [fetchData])

  // Content type operations
  const createContentType = useCallback(async (name: string, value: string) => {
    try {
      const response = await fetch('/api/admin/content-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create content type')
      }

      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error creating content type:', err)
      throw err
    }
  }, [fetchData])

  const updateContentTypeStatus = useCallback(async (id: string | number, enabled: boolean) => {
    try {
      // Handle default content types (string IDs) vs custom content types (number IDs)
      if (typeof id === 'string') {
        // Default content type - update in localStorage
        updateContentTypeSetting(id, enabled)
        await fetchData() // Refresh to show updated state
      } else {
        // Custom content type - update in database
        const response = await fetch('/api/admin/content-types', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, enabled })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update content type')
        }

        await fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Error updating content type:', err)
      throw err
    }
  }, [fetchData])

  const deleteContentType = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/admin/content-types?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete content type')
      }

      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error deleting content type:', err)
      throw err
    }
  }, [fetchData])

  // Settings operations
  const updateSetting = useCallback(async (
    key: string, 
    value: string, 
    type: string = 'string', 
    description?: string
  ) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, type, description })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update setting')
      }

      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error updating setting:', err)
      throw err
    }
  }, [fetchData])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    createPlatform,
    updatePlatformStatus,
    deletePlatform,
    createContentType,
    updateContentTypeStatus,
    deleteContentType,
    updateSetting
  }
} 