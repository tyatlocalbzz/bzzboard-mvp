'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { useApiData, useApiMutation } from './use-api-data'
import type { CalendarEvent } from '@/lib/types/calendar'

interface UseCalendarEventsOptions {
  startDate?: Date
  endDate?: Date
  filter?: 'all' | 'busy' | 'free'
  autoRefresh?: boolean
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  totalCount: number
  refresh: () => Promise<void>
  syncCalendar: () => Promise<void>
}

interface CalendarEventsResponse {
  events: CalendarEvent[]
  totalCount: number
}

export const useCalendarEvents = (options: UseCalendarEventsOptions = {}): UseCalendarEventsReturn => {
  const {
    startDate,
    endDate,
    filter = 'all',
    autoRefresh = false
  } = options

  // Build endpoint with parameters
  const endpoint = useMemo(() => {
    const params = new URLSearchParams()
    
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())
    if (filter) params.append('filter', filter)

    return `/api/calendar/events?${params.toString()}`
  }, [startDate, endDate, filter])

  // Transform function to handle API response
  const transform = useCallback((data: unknown) => {
    const result = data as { events?: CalendarEvent[]; totalCount?: number }
    
    return {
      events: Array.isArray(result.events) ? result.events : [],
      totalCount: result.totalCount || 0
    }
  }, [])

  // Memoize error callback to prevent infinite loops
  const onError = useCallback((error: string) => {
    console.error('Error fetching calendar events:', error)
  }, [])

  // Use standardized API data hook
  const { data, isLoading, error, refresh } = useApiData<CalendarEventsResponse>({
    endpoint,
    dependencies: [startDate, endDate, filter],
    transform,
    onError
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
  const syncMutation = useApiMutation<{ success: boolean; error?: string }>('/api/integrations/google-calendar/sync', 'POST')

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

  return {
    events: data?.events || [],
    loading: isLoading,
    error,
    totalCount: data?.totalCount || 0,
    refresh,
    syncCalendar
  }
} 