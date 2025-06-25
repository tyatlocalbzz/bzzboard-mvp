'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { Calendar, Clock, MapPin, Users, Play, CheckCircle, Upload } from 'lucide-react'
import { formatStatusText, getStatusColor } from '@/lib/utils/status'
import { useShootActions } from '@/lib/hooks/use-shoot-actions'
import Link from 'next/link'
import type { Shoot } from '@/lib/types/shoots'

interface ShootHeaderProps {
  shoot: Shoot
  postIdeasCount?: number
  onRefresh?: () => void
  onOptimisticDelete?: () => void
  showActions?: boolean
}

export const ShootHeader = ({ 
  shoot, 
  postIdeasCount = 0,
  onRefresh,
  onOptimisticDelete,
  showActions = true
}: ShootHeaderProps) => {
  const { startShoot, completeShoot, isLoading } = useShootActions({
    shoot,
    onSuccess: onRefresh,
    onOptimisticDelete
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
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

  return (
    <>
      {/* Action Button Section */}
      {showActions && (shoot.status === 'scheduled' || shoot.status === 'active' || shoot.status === 'completed') && (
        <div className="border-b border-gray-200 bg-white px-3 py-3">
          {shoot.status === 'scheduled' && (
            <LoadingButton
              onClick={startShoot}
              className="w-full h-12 text-base font-medium"
              loading={isLoading}
              loadingText="Starting..."
            >
              <Play className="h-5 w-5 mr-2" />
              Start Shoot
            </LoadingButton>
          )}
          {shoot.status === 'active' && (
            <LoadingButton
              onClick={completeShoot}
              className="w-full h-12 text-base font-medium"
              loading={isLoading}
              loadingText="Completing..."
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete Shoot
            </LoadingButton>
          )}
          {shoot.status === 'completed' && (
            <Link href={`/shoots/${shoot.id}/upload`} className="block">
              <Button className="w-full h-12 text-base font-medium">
                <Upload className="h-5 w-5 mr-2" />
                Upload Content
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Shoot Details */}
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{shoot.title}</h1>
          <Badge variant={getStatusColor(shoot.status)}>
            {formatStatusText(shoot.status)}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(shoot.scheduledAt)} at {formatTime(shoot.scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(shoot.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{shoot.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{postIdeasCount} post idea{postIdeasCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {shoot.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{shoot.notes}</p>
          </div>
        )}
      </div>
    </>
  )
} 