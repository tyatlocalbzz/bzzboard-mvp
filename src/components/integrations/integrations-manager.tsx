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

interface IntegrationStatus {
  googleDrive: {
    connected: boolean
    email?: string
    lastSync?: string
    error?: string
  }
  googleCalendar: {
    connected: boolean
    email?: string
    lastSync?: string
    error?: string
  }
}

export const IntegrationsManager = ({ user }: IntegrationsManagerProps) => {
  const searchParams = useSearchParams()
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    googleDrive: { connected: false },
    googleCalendar: { connected: false }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Load integration status
  useEffect(() => {
    loadIntegrationStatus()
  }, [])

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      if (success === 'google-drive') {
        toast.success('Google Drive connected successfully!')
      } else if (success === 'google-calendar') {
        toast.success('Google Calendar connected successfully!')
      }
      // Refresh status after successful connection
      setTimeout(() => {
        loadIntegrationStatus()
      }, 1000)
    }

    if (error) {
      let errorMessage = 'Connection failed'
      switch (error) {
        case 'oauth_not_configured':
          errorMessage = 'Google OAuth is not configured. Please contact support.'
          break
        case 'invalid_request':
          errorMessage = 'Invalid request. Please try again.'
          break
        case 'no_email':
          errorMessage = 'Unable to access email from Google account.'
          break
        case 'callback_failed':
          errorMessage = 'Connection failed. Please try again.'
          break
      }
      toast.error(errorMessage)
    }
  }, [searchParams])

  const loadIntegrationStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/integrations/status')
      
      if (response.ok) {
        const data = await response.json()
        setIntegrationStatus(data.integrations)
      }
    } catch (error) {
      console.error('Failed to load integration status:', error)
      toast.error('Failed to load integration status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadIntegrationStatus()
    setIsRefreshing(false)
    toast.success('Integration status refreshed')
  }

  const handleIntegrationChange = () => {
    loadIntegrationStatus()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const connectedCount = Object.values(integrationStatus).filter(integration => integration.connected).length
  const totalCount = Object.keys(integrationStatus).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
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
        
        <p className="text-sm text-gray-600">
          Connect your favorite tools to streamline your content production workflow.
        </p>

        {/* Status Overview */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {connectedCount} of {totalCount} integrations connected
          </span>
          {connectedCount === totalCount && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              All connected
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Google Integrations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Google Workspace</h2>
        
        <div className="space-y-3">
          <GoogleDriveIntegration
            status={integrationStatus.googleDrive}
            onStatusChange={handleIntegrationChange}
            userEmail={user.email}
          />
          
          <GoogleCalendarIntegration
            status={integrationStatus.googleCalendar}
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
            description="Alternative cloud storage for your content files"
            icon="📦"
            status="coming-soon"
            disabled
          />
          
          <IntegrationCard
            name="Slack"
            description="Get notifications about shoots and uploads"
            icon="💬"
            status="coming-soon"
            disabled
          />
          
          <IntegrationCard
            name="Adobe Creative Cloud"
            description="Direct integration with editing workflows"
            icon="🎨"
            status="coming-soon"
            disabled
          />
        </div>
      </div>
    </div>
  )
} 