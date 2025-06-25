'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock, Users } from 'lucide-react'
import { PostIdea } from '@/lib/hooks/use-posts'
import { toast } from 'sonner'

interface Shoot {
  id: number
  title: string
  client: string
  scheduledAt: string
  duration: number
  location: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  postIdeasCount: number
}

interface AssignToShootDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  post: PostIdea | null
  onAssign: (postId: number, shootId: number) => Promise<void>
}

export const AssignToShootDialog = ({
  isOpen,
  onOpenChange,
  post,
  onAssign
}: AssignToShootDialogProps) => {
  const [shoots, setShoots] = useState<Shoot[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchShoots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('filter', 'shoots')
      
      // Filter by the post's client if available
      if (post?.client?.name) {
        params.append('client', post.client.name)
      }

      const response = await fetch(`/api/shoots?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch shoots')
      }

      const data = await response.json()
      
      if (data.success && data.data?.events) {
        // Transform unified events back to shoots and filter for scheduled/active shoots
        const shootEvents = data.data.events
          .filter((event: { type: string; shootStatus: string }) => 
            event.type === 'shoot' && 
            ['scheduled', 'active'].includes(event.shootStatus)
          )
          .map((event: { 
            shootId: number; 
            title: string; 
            client?: string; 
            startTime: string; 
            duration: number; 
            location?: string; 
            shootStatus: string; 
            postIdeasCount?: number 
          }) => ({
            id: event.shootId,
            title: event.title,
            client: event.client || 'Unknown Client',
            scheduledAt: event.startTime,
            duration: event.duration,
            location: event.location || 'No location',
            status: event.shootStatus,
            postIdeasCount: event.postIdeasCount || 0
          }))

        setShoots(shootEvents)
      } else {
        throw new Error('Failed to fetch shoots')
      }
    } catch (err) {
      console.error('Error fetching shoots:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch shoots')
      setShoots([])
    } finally {
      setLoading(false)
    }
  }, [post])

  useEffect(() => {
    if (isOpen && post) {
      fetchShoots()
    }
  }, [isOpen, post, fetchShoots])

  const handleAssign = async (shootId: number) => {
    if (!post) return

    try {
      setAssigning(shootId)
      await onAssign(post.id, shootId)
      
      const shoot = shoots.find(s => s.id === shootId)
      toast.success(`Post assigned to "${shoot?.title}" successfully!`)
      onOpenChange(false)
    } catch (error) {
      console.error('Assign error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign post to shoot')
    } finally {
      setAssigning(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assign Post to Shoot
          </DialogTitle>
          <DialogDescription>
            {post && `Select a shoot to assign "${post.title}" to. Only scheduled and active shoots are shown.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-sm text-gray-600">Loading shoots...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Shoots</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchShoots} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : shoots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No available shoots"
              description={
                post?.client?.name 
                  ? `No scheduled or active shoots found for ${post.client.name}.`
                  : "No scheduled or active shoots found."
              }
            />
          ) : (
            <div className="space-y-3">
              {shoots.map((shoot) => (
                <div
                  key={shoot.id}
                  className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {shoot.title}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(shoot.status)}`}
                        >
                          {shoot.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>{shoot.client}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(shoot.scheduledAt)} • {formatTime(shoot.scheduledAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(shoot.duration)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{shoot.location}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {shoot.postIdeasCount} post idea{shoot.postIdeasCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAssign(shoot.id)}
                      disabled={assigning !== null}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {assigning === shoot.id ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-1" />
                          Assigning...
                        </>
                      ) : (
                        'Assign'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={assigning !== null}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 