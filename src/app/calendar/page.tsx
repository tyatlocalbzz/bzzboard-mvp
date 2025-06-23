'use client'

import { useState, useMemo } from 'react'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { Button } from '@/components/ui/button'
import { ActionMenu } from '@/components/ui/action-menu'

import { CalendarListView } from '@/components/calendar/calendar-list-view'
import { useCalendarEvents } from '@/lib/hooks/use-calendar-events'
import { CalendarEvent, CalendarViewType } from '@/lib/types/calendar'
import { 
  Calendar, 
  List, 
  Grid3X3, 
  Clock, 
  Filter, 
  RefreshCw, 
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

export default function CalendarPage() {
  const [viewType, setViewType] = useState<CalendarViewType>('list')
  const [filter, setFilter] = useState<'all' | 'shoots'>('all')
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Calculate date range based on view type
  const { startDate, endDate } = useMemo(() => {
    const today = new Date(selectedDate)
    
    switch (viewType) {
      case 'daily':
        return {
          startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      case 'weekly':
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)
        return { startDate: startOfWeek, endDate: endOfWeek }
      case 'list':
      default:
        // For list view, show events from 1 month ago to 3 months ahead
        const start = new Date(today)
        start.setMonth(today.getMonth() - 1)
        const end = new Date(today)
        end.setMonth(today.getMonth() + 3)
        return { startDate: start, endDate: end }
    }
  }, [viewType, selectedDate])

  // Fetch calendar events
  const { 
    events, 
    loading, 
    error, 
    totalCount, 
    refresh, 
    syncCalendar 
  } = useCalendarEvents({
    startDate,
    endDate,
    filter,
    autoRefresh: true
  })

  // Handle sync
  const handleSync = async () => {
    try {
      await syncCalendar()
      toast.success('Calendar synced successfully')
    } catch {
      toast.error('Failed to sync calendar')
    }
  }

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    // TODO: Navigate to event details or show event modal
    console.log('Event clicked:', event)
    toast.info(`Event: ${event.title}`)
  }

  // Navigation for daily/weekly views
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    
    switch (viewType) {
      case 'daily':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'weekly':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
        break
    }
    
    setSelectedDate(newDate)
  }

  // View type menu items
  const viewMenuItems = [
    {
      label: 'List View',
      icon: List,
      onClick: () => setViewType('list'),
      active: viewType === 'list'
    },
    {
      label: 'Weekly View',
      icon: Grid3X3,
      onClick: () => setViewType('weekly'),
      active: viewType === 'weekly'
    },
    {
      label: 'Daily View',
      icon: Clock,
      onClick: () => setViewType('daily'),
      active: viewType === 'daily'
    }
  ]

  // Filter menu items
  const filterMenuItems = [
    {
      label: 'All Events',
      icon: Calendar,
      onClick: () => setFilter('all'),
      active: filter === 'all'
    },
    {
      label: 'Content Shoots Only',
      icon: Camera,
      onClick: () => setFilter('shoots'),
      active: filter === 'shoots'
    }
  ]

  // Format selected date for display
  const formatSelectedDate = () => {
    switch (viewType) {
      case 'daily':
        return selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'weekly':
        const startOfWeek = new Date(selectedDate)
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      default:
        return 'Calendar'
    }
  }

  return (
    <MobileLayout
      title={viewType === 'list' ? 'Calendar' : formatSelectedDate()}
      headerAction={
        <div className="flex items-center gap-1">
          {/* Date navigation for daily/weekly views */}
          {(viewType === 'daily' || viewType === 'weekly') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Filter menu */}
          <ActionMenu
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${filter !== 'all' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
              </Button>
            }
            items={filterMenuItems}
          />
          
          {/* View type menu */}
          <ActionMenu
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${viewType !== 'list' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                {viewType === 'list' && <List className="h-4 w-4" />}
                {viewType === 'weekly' && <Grid3X3 className="h-4 w-4" />}
                {viewType === 'daily' && <Clock className="h-4 w-4" />}
              </Button>
            }
            items={viewMenuItems}
          />
          
          {/* Sync button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSync}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      }
    >
      {/* Error state */}
      {error && (
        <div className="px-3 py-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">!</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-900">Error loading events</h4>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={refresh}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!error && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {loading ? 'Loading...' : `${totalCount} event${totalCount !== 1 ? 's' : ''}`}
              {filter === 'shoots' && ' (content shoots only)'}
            </span>
            {!loading && events.length > 0 && (
              <span className="text-gray-500">
                {events.filter(e => e.conflictDetected).length > 0 && 
                  `${events.filter(e => e.conflictDetected).length} conflict${events.filter(e => e.conflictDetected).length !== 1 ? 's' : ''}`
                }
              </span>
            )}
          </div>
        </div>
      )}

      {/* Calendar views */}
      {!error && (
        <>
          {viewType === 'list' && (
            <CalendarListView
              events={events}
              loading={loading}
              filter={filter}
              onEventClick={handleEventClick}
            />
          )}
          
          {viewType === 'weekly' && (
            <div className="flex-1 flex items-center justify-center px-3 py-8">
              <div className="text-center">
                <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Weekly View</h3>
                <p className="text-sm text-gray-600">Coming soon...</p>
              </div>
            </div>
          )}
          
          {viewType === 'daily' && (
            <div className="flex-1 flex items-center justify-center px-3 py-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Daily View</h3>
                <p className="text-sm text-gray-600">Coming soon...</p>
              </div>
            </div>
          )}
        </>
      )}
    </MobileLayout>
  )
} 