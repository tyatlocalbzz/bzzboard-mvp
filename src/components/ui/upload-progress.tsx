'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Pause, Upload } from 'lucide-react'
import { Button } from './button'
import type { UploadProgress as UploadProgressType } from '@/lib/types/shoots'
import { uploadStatusManager } from '@/lib/utils/status'

interface UploadProgressProps {
  fileName: string
  progress: UploadProgressType
  onCancel?: () => void
  onRetry?: () => void
  onPause?: () => void
  onResume?: () => void
  className?: string
}

export const UploadProgress = ({
  fileName,
  progress,
  onCancel,
  onRetry,
  onPause,
  onResume,
  className
}: UploadProgressProps) => {
  const { percentage, status, uploadedBytes, totalBytes } = progress

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'uploading':
      default:
        return <Upload className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusText = () => {
    return uploadStatusManager.getLabel(status)
  }

  const getStatusColor = () => {
    return uploadStatusManager.getTextColor(status)
  }

  const getProgressBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'paused':
        return 'bg-yellow-500'
      case 'uploading':
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* File info and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <p className={cn('text-xs', getStatusColor())}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {status === 'uploading' && onPause && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onPause}
              aria-label="Pause upload"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
          
          {status === 'paused' && onResume && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onResume}
              aria-label="Resume upload"
            >
              <Upload className="h-3 w-3" />
            </Button>
          )}
          
          {status === 'failed' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              onClick={onRetry}
              aria-label="Retry upload"
            >
              <Upload className="h-3 w-3" />
            </Button>
          )}
          
          {(status === 'uploading' || status === 'paused' || status === 'failed') && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              onClick={onCancel}
              aria-label="Cancel upload"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300 ease-out',
              getProgressBarColor()
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        {/* Progress text */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{percentage}%</span>
          <span>
            {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
          </span>
        </div>
      </div>
    </div>
  )
} 