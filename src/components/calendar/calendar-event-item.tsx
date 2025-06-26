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
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'tentative': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Get sync status color
  const getSyncStatusColor = (syncStatus: CalendarEvent['syncStatus']) => {
    switch (syncStatus) {
      case 'synced': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
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
        "bg-card rounded-lg border border-border p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-accent/50",
        event.conflictDetected && "border-destructive/20 bg-destructive/5",
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-medium text-card-foreground truncate",
              compact ? "text-sm" : "text-base"
            )}>
              {event.title}
            </h3>
            
            {/* Event type indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {event.isShootEvent && (
                <div title="Content Shoot">
                  <Camera className="h-3 w-3 text-primary" />
                </div>
              )}
              {event.isRecurring && (
                <div title="Recurring Event">
                  <Repeat className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              {event.conflictDetected && (
                <div title="Scheduling Conflict">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                </div>
              )}
            </div>
          </div>
          
          {/* Time and date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {event.description}
            </p>
          )}

          {/* Conflict warning */}
          {event.conflictDetected && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-destructive">
                    Scheduling conflict detected
                  </span>
                  {event.conflictDetails && event.conflictDetails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-destructive/80 font-medium">
                        Conflicts with:
                      </p>
                      {event.conflictDetails.map((conflict, index) => {
                        const startTime = new Date(conflict.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                        const endTime = new Date(conflict.endTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                        const date = new Date(conflict.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })
                        
                        return (
                          <div key={index} className="text-xs text-destructive/90 bg-destructive/5 rounded px-2 py-1">
                            <span className="font-medium">{conflict.title}</span>
                            <span className="text-destructive/70 ml-1">
                              ({date} • {startTime} - {endTime})
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 