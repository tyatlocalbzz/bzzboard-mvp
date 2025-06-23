'use client'

import { useMemo } from 'react'
import { CalendarEvent } from '@/lib/types/calendar'
import { CalendarEventItem } from './calendar-event-item'
import { EmptyState } from '@/components/ui/empty-state'
import { Separator } from '@/components/ui/separator'
import { Calendar, Camera } from 'lucide-react'

interface CalendarListViewProps {
  events: CalendarEvent[]
  loading?: boolean
  filter: 'all' | 'shoots'
  onEventClick?: (event: CalendarEvent) => void
}

interface GroupedEvents {
  [date: string]: CalendarEvent[]
}

export const CalendarListView = ({ 
  events, 
  loading = false, 
  filter,
  onEventClick 
}: CalendarListViewProps) => {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: GroupedEvents = {}
    
    events.forEach(event => {
      const date = new Date(event.startTime).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
    })
    
    // Sort events within each day by start time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    })
    
    return groups
  }, [events])

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(groupedEvents).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    )
  }, [groupedEvents])

  // Format date for display
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Get day of week
  const getDayOfWeek = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' })
  }

  if (loading) {
    return (
      <div className="space-y-4 px-3 py-3">
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="space-y-2">
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 py-8">
        <EmptyState
          icon={filter === 'shoots' ? Camera : Calendar}
          title={filter === 'shoots' ? 'No content shoots' : 'No calendar events'}
          description={
            filter === 'shoots' 
              ? 'No content shoots found in your calendar. Schedule a shoot to get started.'
              : 'No events found in your calendar. Try syncing your calendar or check your date range.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-3 py-3">
      {sortedDates.map((dateString, dateIndex) => {
        const dayEvents = groupedEvents[dateString]
        const date = new Date(dateString)
        
        return (
          <div key={dateString} className="space-y-3">
            {/* Date Header */}
            <div className="sticky top-0 bg-gray-50 -mx-3 px-3 py-2 border-b border-gray-200 z-10">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-lg">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {getDayOfWeek(dateString)}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDateHeader(dateString)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    {filter === 'shoots' && dayEvents.some(e => e.isShootEvent) && 
                      ` • ${dayEvents.filter(e => e.isShootEvent).length} shoot${dayEvents.filter(e => e.isShootEvent).length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Events for this date */}
            <div className="space-y-3">
              {dayEvents.map((event, eventIndex) => (
                <div key={event.id}>
                  <CalendarEventItem
                    event={event}
                    onClick={() => onEventClick?.(event)}
                    showDate={false} // Don't show date since it's grouped by date
                  />
                  {eventIndex < dayEvents.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))}
            </div>

            {/* Separator between dates */}
            {dateIndex < sortedDates.length - 1 && (
              <div className="py-2">
                <Separator />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
} 