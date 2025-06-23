'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent, CalendarEventsResponse } from '@/lib/types/calendar'

interface UseCalendarEventsOptions {
  startDate?: Date
  endDate?: Date
  filter?: 'all' | 'shoots'
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

export const useCalendarEvents = (options: UseCalendarEventsOptions = {}): UseCalendarEventsReturn => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const {
    startDate,
    endDate,
    filter = 'all',
    autoRefresh = false
  } = options

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (filter) params.append('filter', filter)

      const response = await fetch(`/api/calendar/events?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`)
      }

      const data: CalendarEventsResponse = await response.json()
      
      if (data.success) {
        setEvents(data.events)
        setTotalCount(data.totalCount)
      } else {
        throw new Error('Failed to fetch calendar events')
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      setEvents([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, filter])

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
    refresh: fetchEvents,
    syncCalendar
  }
} 