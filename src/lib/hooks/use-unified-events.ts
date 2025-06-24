'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UnifiedEvent, UnifiedEventFilter, UnifiedEventsResponse } from '@/lib/types/shoots'

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
}

export const useUnifiedEvents = (options: UseUnifiedEventsOptions = {}): UseUnifiedEventsReturn => {
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [shootsCount, setShootsCount] = useState(0)
  const [calendarEventsCount, setCalendarEventsCount] = useState(0)

  const {
    clientName,
    filter = 'shoots',
    startDate,
    endDate,
    autoRefresh = false
  } = options

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

      const response = await fetch(`/api/shoots?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`)
      }

      const data: UnifiedEventsResponse = await response.json()
      
      if (data.success) {
        setEvents(data.events)
        setTotalCount(data.totalCount)
        setShootsCount(data.shootsCount)
        setCalendarEventsCount(data.calendarEventsCount)
      } else {
        throw new Error('Failed to fetch events')
      }
    } catch (err) {
      console.error('Error fetching unified events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      setEvents([])
      setTotalCount(0)
      setShootsCount(0)
      setCalendarEventsCount(0)
    } finally {
      setLoading(false)
    }
  }, [clientName, filter, startDate, endDate])

  const syncCalendar = useCallback(async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceFullSync: false })
      })

      if (!response.ok) {
        throw new Error('Failed to sync calendar')
      }

      const data = await response.json()
      
      if (data.success) {
        // Refresh events after successful sync
        await fetchEvents()
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (err) {
      console.error('Error syncing calendar:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync calendar')
    }
  }, [fetchEvents])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchEvents()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh, fetchEvents])

  return {
    events,
    loading,
    error,
    totalCount,
    shootsCount,
    calendarEventsCount,
    refresh: fetchEvents,
    syncCalendar
  }
} 