'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Calendar, Clock, MapPin, Users, Camera, AlertTriangle, Repeat, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStatusText, getStatusColor } from '@/lib/utils/status'
import { formatTime, formatDuration } from '@/lib/utils/date-time'
import type { UnifiedEvent } from '@/lib/types/shoots'

interface UnifiedEventItemProps {
  event: UnifiedEvent
  onClick?: () => void
  onDelete?: (eventId: string, eventType: 'shoot' | 'calendar') => void
  className?: string
}

export const UnifiedEventItem = ({ 
  event, 
  onClick,
  onDelete,
  className 
}: UnifiedEventItemProps) => {



  // Get event type indicator
  const getEventTypeIndicator = () => {
    if (event.type === 'shoot') {
      return {
        icon: Camera,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'Content Shoot'
      }
    } else {
      return {
        icon: Calendar,
        color: event.isShootEvent ? 'text-primary' : 'text-muted-foreground',
        bgColor: event.isShootEvent ? 'bg-primary/10' : 'bg-muted/50',
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
        "bg-card rounded-lg border border-border p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-accent/50",
        event.conflictDetected && "border-destructive/20 bg-destructive/5",
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
            
            <h3 className="font-medium text-card-foreground truncate flex-1">
              {event.title}
            </h3>
            
            {/* Additional indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
              {event.syncStatus === 'error' && (
                <div title="Sync Error">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                </div>
              )}
            </div>
          </div>
          
          {/* Client name for shoots */}
          {event.client && (
            <div className="text-sm text-muted-foreground mb-1">
              {event.client}
            </div>
          )}
          
          {/* Time and duration */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                {` (${formatDuration(event.duration)})`}
              </span>
            </div>
          </div>
        </div>

        {/* Status badge and actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusBadge && (
            <Badge variant={statusBadge.variant}>
              {statusBadge.text}
            </Badge>
          )}
          
          {/* Action Menu - only for shoots */}
          {onDelete && event.type === 'shoot' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation() // Prevent triggering the card click
                    onDelete(event.id, event.type)
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Post ideas count for shoots */}
        {event.type === 'shoot' && typeof event.postIdeasCount === 'number' && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span>
              {event.postIdeasCount} post idea{event.postIdeasCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Attendees for calendar events */}
        {event.type === 'calendar' && event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span>
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Description for calendar events */}
        {event.type === 'calendar' && event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="p-2 bg-muted/50 rounded text-sm text-muted-foreground">
            <strong className="text-foreground">Notes:</strong> {event.notes}
          </div>
        )}

        {/* Conflict warning */}
        {event.conflictDetected && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
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
      </div>

      
    </div>
  )
} 