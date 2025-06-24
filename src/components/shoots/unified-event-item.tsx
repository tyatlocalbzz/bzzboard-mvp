'use client'

import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Camera, AlertTriangle, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStatusText, getStatusColor } from '@/lib/utils/status'
import type { UnifiedEvent } from '@/lib/types/shoots'

interface UnifiedEventItemProps {
  event: UnifiedEvent
  onClick?: () => void
  className?: string
}

export const UnifiedEventItem = ({ 
  event, 
  onClick,
  className 
}: UnifiedEventItemProps) => {
  // Format time for display
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }



  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Get event type indicator
  const getEventTypeIndicator = () => {
    if (event.type === 'shoot') {
      return {
        icon: Camera,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'Content Shoot'
      }
    } else {
      return {
        icon: Calendar,
        color: event.isShootEvent ? 'text-blue-600' : 'text-gray-600',
        bgColor: event.isShootEvent ? 'bg-blue-50' : 'bg-gray-50',
        label: event.isShootEvent ? 'Linked Calendar Event' : 'Calendar Event'
      }
    }
  }

  // Get status badge
  const getStatusBadge = () => {
    if (event.type === 'shoot' && event.shootStatus) {
      return {
        text: formatStatusText(event.shootStatus),
        variant: getStatusColor(event.shootStatus)
      }
    } else if (event.type === 'calendar' && event.status) {
      const statusColors = {
        confirmed: 'default' as const,
        tentative: 'secondary' as const,
        cancelled: 'destructive' as const
      }
      return {
        text: event.status.charAt(0).toUpperCase() + event.status.slice(1),
        variant: statusColors[event.status] || 'default' as const
      }
    }
    return null
  }

  const typeIndicator = getEventTypeIndicator()
  const statusBadge = getStatusBadge()
  const TypeIcon = typeIndicator.icon

  return (
    <div
      className={cn(
        "bg-white rounded-lg border p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-gray-50",
        event.conflictDetected && "border-red-200 bg-red-50",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Event type indicator */}
            <div 
              className={cn("p-1 rounded", typeIndicator.bgColor)}
              title={typeIndicator.label}
            >
              <TypeIcon className={cn("h-3 w-3", typeIndicator.color)} />
            </div>
            
            <h3 className="font-medium text-gray-900 truncate flex-1">
              {event.title}
            </h3>
            
            {/* Additional indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
              {event.syncStatus === 'error' && (
                <div title="Sync Error">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                </div>
              )}
            </div>
          </div>
          
          {/* Client name for shoots */}
          {event.client && (
            <div className="text-sm text-gray-600 mb-1">
              {event.client}
            </div>
          )}
          
          {/* Time and duration */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                {` (${formatDuration(event.duration)})`}
              </span>
            </div>
          </div>
        </div>

        {/* Status badge */}
        {statusBadge && (
          <Badge variant={statusBadge.variant} className="flex-shrink-0">
            {statusBadge.text}
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Post ideas count for shoots */}
        {event.type === 'shoot' && typeof event.postIdeasCount === 'number' && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span>
              {event.postIdeasCount} post idea{event.postIdeasCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Attendees for calendar events */}
        {event.type === 'calendar' && event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span>
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Description for calendar events */}
        {event.type === 'calendar' && event.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
            <strong>Notes:</strong> {event.notes}
          </div>
        )}

        {/* Conflict warning */}
        {event.conflictDetected && (
          <div className="flex items-center gap-2 p-2 bg-red-100 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-800">
              Scheduling conflict detected
            </span>
          </div>
        )}
      </div>
    </div>
  )
} 