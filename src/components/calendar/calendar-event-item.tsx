'use client'

import { CalendarEvent } from '@/lib/types/calendar'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Users, AlertTriangle, Camera, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventItemProps {
  event: CalendarEvent
  compact?: boolean
  showDate?: boolean
  onClick?: () => void
  className?: string
}

export const CalendarEventItem = ({ 
  event, 
  compact = false, 
  showDate = false,
  onClick,
  className 
}: CalendarEventItemProps) => {
  // Format time for display
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Format date for display
  const formatDate = (timeString: string) => {
    const date = new Date(timeString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Get status color
  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'tentative': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get sync status color
  const getSyncStatusColor = (syncStatus: CalendarEvent['syncStatus']) => {
    switch (syncStatus) {
      case 'synced': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-gray-50",
        event.conflictDetected && "border-red-200 bg-red-50",
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-medium text-gray-900 truncate",
              compact ? "text-sm" : "text-base"
            )}>
              {event.title}
            </h3>
            
            {/* Event type indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {event.isShootEvent && (
                <div title="Content Shoot">
                  <Camera className="h-3 w-3 text-blue-600" />
                </div>
              )}
              {event.isRecurring && (
                <div title="Recurring Event">
                  <Repeat className="h-3 w-3 text-gray-500" />
                </div>
              )}
              {event.conflictDetected && (
                <div title="Scheduling Conflict">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </div>
              )}
            </div>
          </div>
          
          {/* Time and date */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {showDate && `${formatDate(event.startTime)} • `}
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                {!compact && ` (${formatDuration(event.duration)})`}
              </span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col gap-1 items-end flex-shrink-0">
          <Badge 
            variant="secondary" 
            className={cn("text-xs", getStatusColor(event.status))}
          >
            {event.status}
          </Badge>
          
          {event.syncStatus !== 'synced' && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", getSyncStatusColor(event.syncStatus))}
            >
              {event.syncStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Details */}
      {!compact && (
        <>
          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
              {event.description}
            </p>
          )}

          {/* Conflict warning */}
          {event.conflictDetected && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-red-100 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">
                Scheduling conflict detected
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
} 