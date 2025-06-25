'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { GoogleDriveIntegration } from './google-drive-integration'
import { GoogleCalendarIntegration } from './google-calendar-integration'
import { IntegrationCard } from './integration-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useIntegrationStatus } from '@/lib/hooks/use-integration-status'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
}

interface IntegrationsManagerProps {
  user: User
}

export const IntegrationsManager = ({ user }: IntegrationsManagerProps) => {
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use standardized integration status hook
  const { 
    status: integrationStatus, 
    isLoading, 
    refresh: refreshStatus 
  } = useIntegrationStatus()

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      if (success === 'google-drive') {
        toast.success('Google Drive connected!')
      } else if (success === 'google-calendar') {
        toast.success('Google Calendar connected!')
      }
      // Refresh status immediately and again after a delay to ensure update
      refreshStatus()
      setTimeout(() => {
        refreshStatus()
      }, 500)
      // Additional refresh after 2 seconds to handle any database delays
      setTimeout(() => {
        refreshStatus()
      }, 2000)
    }

    if (error) {
      let errorMessage = 'Connection failed'
      switch (error) {
        case 'oauth_not_configured':
          errorMessage = 'Google OAuth not configured'
          break
        case 'invalid_request':
          errorMessage = 'Invalid request'
          break
        case 'no_email':
          errorMessage = 'Unable to access email'
          break
        case 'callback_failed':
          errorMessage = 'Connection failed'
          break
      }
      toast.error(errorMessage)
    }
  }, [searchParams, refreshStatus])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshStatus()
    setIsRefreshing(false)
    toast.success('Status refreshed')
  }

  const handleIntegrationChange = () => {
    refreshStatus()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Provide fallback for null status
  const status = integrationStatus || { googleDrive: { connected: false }, googleCalendar: { connected: false } }
  const connectedCount = Object.values(status).filter(integration => integration.connected).length
  const totalCount = Object.keys(status).length

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              {connectedCount} of {totalCount} connected
            </span>
            {connectedCount === totalCount && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                All connected
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {/* Google Integrations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Google Workspace</h2>
        
        <div className="space-y-3">
          <GoogleDriveIntegration
            status={status.googleDrive}
            onStatusChange={handleIntegrationChange}
            userEmail={user.email}
          />
          
          <GoogleCalendarIntegration
            status={status.googleCalendar}
            onStatusChange={handleIntegrationChange}
            userEmail={user.email}
          />
        </div>
      </div>

      <Separator />

      {/* Future Integrations Placeholder */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Coming Soon</h2>
        
        <div className="space-y-3">
          <IntegrationCard
            name="Dropbox"
            description="Alternative cloud storage"
            icon="📦"
            status="coming-soon"
            disabled
          />
          
          <IntegrationCard
            name="Slack"
            description="Team notifications"
            icon="💬"
            status="coming-soon"
            disabled
          />
          
          <IntegrationCard
            name="Notion"
            description="Project documentation"
            icon="📝"
            status="coming-soon"
            disabled
          />
        </div>
      </div>
    </div>
  )
} 