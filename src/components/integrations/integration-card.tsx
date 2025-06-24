'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Check, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntegrationCardProps {
  name: string
  description: string
  icon: string | ReactNode
  status: 'connected' | 'disconnected' | 'error' | 'connecting' | 'coming-soon'
  connectedEmail?: string
  lastSync?: string
  error?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onRetry?: () => void
  disabled?: boolean
  className?: string
  additionalActions?: ReactNode
}

export const IntegrationCard = ({
  name,
  description,
  icon,
  status,
  connectedEmail,
  lastSync,
  error,
  onConnect,
  onDisconnect,
  onRetry,
  disabled = false,
  className,
  additionalActions
}: IntegrationCardProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'connecting':
        return <LoadingSpinner size="sm" />
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-700">Connected</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>
      case 'connecting':
        return <Badge variant="secondary" className="text-xs">Connecting...</Badge>
      case 'coming-soon':
        return <Badge variant="outline" className="text-xs">Coming Soon</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Not Connected</Badge>
    }
  }

  const getActionButton = () => {
    if (disabled || status === 'coming-soon') {
      return null
    }

    if (status === 'connecting') {
      return (
        <Button variant="outline" size="sm" disabled className="h-8">
          <LoadingSpinner size="sm" className="mr-1" />
          Connecting...
        </Button>
      )
    }

    if (status === 'connected') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDisconnect}
          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Disconnect
        </Button>
      )
    }

    if (status === 'error') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="h-8"
        >
          Retry
        </Button>
      )
    }

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onConnect}
        className="h-8"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Connect
      </Button>
    )
  }

  const formatLastSync = (lastSync: string) => {
    const date = new Date(lastSync)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const actionButton = getActionButton()
  const hasActions = actionButton || additionalActions

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg p-4 transition-colors',
      disabled && 'opacity-60',
      className
    )}>
      {/* Mobile-first: Stack layout */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        
        {/* Content Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            {typeof icon === 'string' ? (
              <span className="text-lg">{icon}</span>
            ) : (
              icon
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">{name}</h3>
              {getStatusIcon()}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{description}</p>
            
            {/* Status Details */}
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              {connectedEmail && (
                <span className="text-xs text-gray-500 truncate">
                  {connectedEmail}
                </span>
              )}
            </div>

            {/* Error Message */}
            {status === 'error' && error && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mb-2">
                {error}
              </div>
            )}

            {/* Last Sync */}
            {status === 'connected' && lastSync && (
              <div className="text-xs text-gray-500">
                Last synced: {formatLastSync(lastSync)}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Section */}
        {hasActions && (
          <div className="flex flex-row gap-2 justify-start sm:flex-col sm:items-end sm:justify-start sm:gap-2 sm:ml-3 sm:flex-shrink-0">
            {actionButton}
            {additionalActions}
        </div>
        )}
      </div>
    </div>
  )
} 