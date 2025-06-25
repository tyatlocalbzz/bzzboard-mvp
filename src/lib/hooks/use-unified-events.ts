'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { useApiData, useApiMutation } from './use-api-data'
import type { UnifiedEvent, UnifiedEventFilter } from '@/lib/types/shoots'

interface UseUnifiedEventsOptions {
  clientName?: string
  filter?: UnifiedEventFilter
  startDate?: Date
  endDate?: Date
  autoRefresh?: boolean
}

interface UseUnifiedEventsReturn {
  events: UnifiedEvent[]
  loading: boolean
  error: string | null
  totalCount: number
  shootsCount: number
  calendarEventsCount: number
  refresh: () => Promise<void>
  syncCalendar: () => Promise<void>
  optimisticDelete: (eventId: string, eventType: 'shoot' | 'calendar') => void
}

interface UnifiedEventsResponse {
  events: UnifiedEvent[]
  totalCount: number
  shootsCount: number
  calendarEventsCount: number
}

export const useUnifiedEvents = (options: UseUnifiedEventsOptions = {}): UseUnifiedEventsReturn => {
  const {
    clientName,
    filter = 'shoots',
    startDate,
    endDate,
    autoRefresh = false
  } = options

  // Build endpoint with parameters
  const endpoint = useMemo(() => {
    const params = new URLSearchParams()
    
    if (clientName && clientName !== 'All Clients') {
      params.append('client', clientName)
    }
    if (filter) {
      params.append('filter', filter)
    }
    if (startDate) {
      params.append('startDate', startDate.toISOString())
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString())
    }

    return `/api/shoots?${params.toString()}`
  }, [clientName, filter, startDate, endDate])

  // Transform function to handle both API response formats
  const transform = useCallback((data: unknown) => {
    const result = data as {
      events?: UnifiedEvent[]
      totalCount?: number
      shootsCount?: number
      calendarEventsCount?: number
      data?: {
        events?: UnifiedEvent[]
        totalCount?: number
        shootsCount?: number
        calendarEventsCount?: number
      }
    }

    // Handle both new standardized API format and old format
    if (result.events) {
      return {
        events: Array.isArray(result.events) ? result.events : [],
        totalCount: result.totalCount || 0,
        shootsCount: result.shootsCount || 0,
        calendarEventsCount: result.calendarEventsCount || 0
      }
    } else if (result.data?.events) {
      return {
        events: Array.isArray(result.data.events) ? result.data.events : [],
        totalCount: result.data.totalCount || 0,
        shootsCount: result.data.shootsCount || 0,
        calendarEventsCount: result.data.calendarEventsCount || 0
      }
    } else {
      console.error('Unexpected API response format:', result)
      return {
        events: [],
        totalCount: 0,
        shootsCount: 0,
        calendarEventsCount: 0
      }
    }
  }, [])

  // Use standardized API data hook with auto-refresh
  const { data, isLoading, error, refresh, updateData } = useApiData<UnifiedEventsResponse>({
    endpoint,
    dependencies: [clientName, filter, startDate, endDate],
    transform,
    autoFetch: true
  })

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refresh()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh, refresh])

  // Calendar sync mutation
  const syncMutation = useApiMutation<{ success: boolean }>('/api/integrations/google-calendar/sync', 'POST')

  const syncCalendar = useCallback(async () => {
    try {
      const result = await syncMutation.mutate({ forceFullSync: false })
      
      if (result.success) {
        // Refresh events after successful sync
        await refresh()
      }
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Calendar sync failed:', error)
    }
  }, [syncMutation, refresh])

  // Optimistic delete with proper state updates
  const optimisticDelete = useCallback((eventId: string, eventType: 'shoot' | 'calendar') => {
    updateData(prev => {
      if (!prev) return null
      
      const filteredEvents = prev.events.filter(event => event.id !== eventId)
      
      return {
        ...prev,
        events: filteredEvents,
        totalCount: prev.totalCount - 1,
        shootsCount: eventType === 'shoot' ? prev.shootsCount - 1 : prev.shootsCount,
        calendarEventsCount: eventType === 'calendar' ? prev.calendarEventsCount - 1 : prev.calendarEventsCount
      }
    })
  }, [updateData])

  return {
    events: data?.events || [],
    loading: isLoading,
    error,
    totalCount: data?.totalCount || 0,
    shootsCount: data?.shootsCount || 0,
    calendarEventsCount: data?.calendarEventsCount || 0,
    refresh,
    syncCalendar,
    optimisticDelete
  }
} 