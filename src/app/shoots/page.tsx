'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { UnifiedEventItem } from "@/components/shoots/unified-event-item"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Calendar, Camera, RefreshCw } from "lucide-react"
import { ScheduleShootForm } from "@/components/shoots/schedule-shoot-form"
import { useClient } from "@/contexts/client-context"
import { useUnifiedEvents } from "@/lib/hooks/use-unified-events"
import type { UnifiedEvent, UnifiedEventFilter } from '@/lib/types/shoots'
import { toast } from 'sonner'

const ITEMS_PER_PAGE = 10

export default function ShootsPage() {
  const { selectedClient } = useClient()
  const router = useRouter()
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Get initial filter from URL query parameter
  const [eventFilter, setEventFilter] = useState<UnifiedEventFilter>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const filterParam = urlParams.get('filter') as UnifiedEventFilter
      return ['shoots', 'calendar', 'all'].includes(filterParam) ? filterParam : 'shoots'
    }
    return 'shoots'
  })
  // Always sort chronologically - no user sorting options needed for schedule view

  // Load unified events from API
  const { 
    events: allEvents, 
    loading, 
    error, 
    refresh,
    syncCalendar,
    optimisticDelete
  } = useUnifiedEvents({
    clientName: selectedClient.type === 'all' ? undefined : selectedClient.name,
    filter: eventFilter,
    autoRefresh: true
  })

  // Check for refresh parameter and trigger refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('refresh') === 'true') {
        // Remove the refresh parameter from URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('refresh')
        router.replace(newUrl.pathname + newUrl.search, { scroll: false })
        
        // Trigger data refresh
        refresh()
      }
    }
  }, [router, refresh])

  // Navigate to event details
  const handleEventClick = useCallback((event: UnifiedEvent) => {
    if (event.type === 'shoot' && event.shootId) {
      router.push(`/shoots/${event.shootId}`)
    } else if (event.type === 'calendar') {
      // For calendar events, show a toast for now
      // TODO: Implement calendar event details or link to Google Calendar
      toast.info(`Calendar Event: ${event.title}`)
    }
  }, [router])

  // Handle delete with optimistic updates
  const handleDelete = useCallback(async (eventId: string, eventType: 'shoot' | 'calendar') => {
    if (eventType !== 'shoot') {
      toast.error('Only shoots can be deleted from this view')
      return
    }

    try {
      // Extract numeric ID from the prefixed format (e.g., "shoot-11" -> "11")
      const numericId = eventId.startsWith('shoot-') ? eventId.replace('shoot-', '') : eventId
      
      // Optimistically remove from UI immediately
      optimisticDelete(eventId, eventType)
      toast.success('Shoot deleted successfully!')

      // Call the actual delete API with numeric ID
      const response = await fetch(`/api/shoots/${numericId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete shoot')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete shoot')
      }

      // Show additional feedback if available
      if (data.calendarEventRemoved) {
        toast.info('Calendar event removed from Google Calendar')
      }
      
      if (data.recoveryNote) {
        toast.info(data.recoveryNote, { duration: 5000 })
      }

    } catch (error) {
      // If delete failed, refresh to restore the correct state
      console.error('Delete failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete shoot')
      refresh() // Restore the correct state
    }
  }, [optimisticDelete, refresh])

  // Sort events chronologically (what's happening next)
  const sortedEvents = useMemo(() => {
    if (!allEvents || !Array.isArray(allEvents)) {
      return []
    }
    return [...allEvents].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })
  }, [allEvents])

  // Get events to display (with pagination)
  const displayedEvents = useMemo(() => {
    return sortedEvents.slice(0, displayCount)
  }, [sortedEvents, displayCount])

  // Check if there are more events to load
  const hasMore = displayCount < sortedEvents.length

  // Load more function with simulated delay
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore])

  // Handle calendar sync
  const handleSync = async () => {
    try {
      await syncCalendar()
      
      // Provide contextual success message based on current filter
      if (eventFilter === 'shoots') {
        toast.success('Calendar synced successfully - conflict detection updated')
      } else if (eventFilter === 'calendar') {
        toast.success('Calendar events synced successfully')
      } else {
        toast.success('Calendar synced successfully')
      }
    } catch {
      toast.error('Failed to sync calendar - check your Google Calendar connection')
    }
  }

  // Reset pagination when filter changes
  const handleFilterChange = (newFilter: UnifiedEventFilter) => {
    setEventFilter(newFilter)
    setDisplayCount(ITEMS_PER_PAGE)
    
    // Update URL to reflect the new filter
    const url = new URL(window.location.href)
    if (newFilter === 'shoots') {
      url.searchParams.delete('filter')
    } else {
      url.searchParams.set('filter', newFilter)
    }
    router.replace(url.pathname + url.search, { scroll: false })
  }

  // No sorting needed - always chronological

  // No filter menu needed - using tabs instead

  // No sort menu needed - always chronological order

  // Get page title based on filter
  const getPageTitle = () => {
    switch (eventFilter) {
      case 'shoots': return 'Shoots'
      case 'calendar': return 'Calendar'
      case 'all': return 'Schedule'
      default: return 'Schedule'
    }
  }

  // Get empty state props based on filter
  const getEmptyStateProps = () => {
    switch (eventFilter) {
      case 'shoots':
        return {
          icon: Camera,
          title: "No shoots found",
          description: selectedClient.type === 'all' 
            ? "You haven't scheduled any shoots yet. Create your first shoot to get started."
            : `No shoots scheduled for ${selectedClient.name}. Schedule a shoot to get started.`,
          actionLabel: "Schedule Your First Shoot"
        }
      case 'calendar':
        return {
          icon: Calendar,
          title: "No calendar events",
          description: "No calendar events found. Make sure your Google Calendar is connected and synced.",
          actionLabel: "Sync Calendar"
        }
      case 'all':
        return {
          icon: Calendar,
          title: "No events found",
          description: "No shoots or calendar events found. Schedule a shoot or sync your calendar to get started.",
          actionLabel: "Schedule Your First Shoot"
        }
      default:
        return {
          icon: Calendar,
          title: "No events found",
          description: "No events found.",
          actionLabel: "Schedule Event"
        }
    }
  }

  const emptyStateProps = getEmptyStateProps()

  return (
    <MobileLayout 
      title={getPageTitle()}
      headerAction={
        <div className="flex items-center gap-1">
          {/* Calendar sync button - always show for calendar integration */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSync}
            disabled={loading}
            title="Sync Calendar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <ScheduleShootForm onSuccess={refresh}>
            <Button size="sm" className="h-8 px-3 text-xs">
              <Camera className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          </ScheduleShootForm>
        </div>
      }
    >
      {/* Filter Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          <button
            onClick={() => handleFilterChange('shoots')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              eventFilter === 'shoots'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shoots
          </button>
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              eventFilter === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="px-3 py-3 space-y-6">
        {/* Events List */}
        <div className="space-y-3">
          {/* Loading State */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={refresh} 
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : displayedEvents.length > 0 ? (
            <div className="space-y-3">
              {displayedEvents.map((event, index) => (
                <div key={event.id}>
                  <UnifiedEventItem
                    event={event}
                    onClick={() => handleEventClick(event)}
                    onDelete={event.type === 'shoot' ? handleDelete : undefined}
                  />
                  
                  {/* Add separator between events, but not after the last one */}
                  {index < displayedEvents.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-12 tap-target"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <LoadingSpinner size="md" color="gray" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${sortedEvents.length - displayCount} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <EmptyState
              icon={emptyStateProps.icon}
              title={emptyStateProps.title}
              description={emptyStateProps.description}
              action={{
                label: emptyStateProps.actionLabel,
                children: (
                  eventFilter === 'calendar' ? (
                    <Button className="tap-target" onClick={handleSync}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {emptyStateProps.actionLabel}
                    </Button>
                  ) : (
                    <ScheduleShootForm onSuccess={refresh}>
                      <Button className="tap-target">
                        <Camera className="h-4 w-4 mr-2" />
                        {emptyStateProps.actionLabel}
                      </Button>
                    </ScheduleShootForm>
                  )
                )
              }}
            />
          )}
        </div>
      </div>
    </MobileLayout>
  )
}