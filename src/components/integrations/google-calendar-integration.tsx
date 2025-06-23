'use client'

import { useState } from 'react'
import { IntegrationCard } from './integration-card'
import { GoogleCalendarSettings } from './google-calendar-settings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, CalendarCheck, Shield, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface GoogleCalendarIntegrationProps {
  status: {
    connected: boolean
    email?: string
    lastSync?: string
    error?: string
  }
  onStatusChange: () => void
  userEmail: string
}

export const GoogleCalendarIntegration = ({ 
  status, 
  onStatusChange 
}: GoogleCalendarIntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleConnect = async () => {
    setShowPermissionsDialog(true)
  }

  const handleConfirmConnection = async () => {
    try {
      setIsConnecting(true)
      setShowPermissionsDialog(false)
      
      // Initiate Google OAuth flow
      const response = await fetch('/api/integrations/google-calendar/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to initiate connection')
      }
    } catch (error) {
      console.error('Google Calendar connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Google Calendar')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/integrations/google-calendar/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Google Calendar disconnected successfully')
        onStatusChange()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Google Calendar disconnect error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect Google Calendar')
    }
  }

  const handleRetry = async () => {
    await handleConnect()
  }

  const getIntegrationStatus = () => {
    if (isConnecting) return 'connecting'
    if (status.connected) return 'connected'
    if (status.error) return 'error'
    return 'disconnected'
  }

  return (
    <>
            <IntegrationCard
        name="Google Calendar"
        description="Automatically sync your shoot schedules and check availability"
        icon={<Calendar className="h-5 w-5 text-green-600" />}
        status={getIntegrationStatus()}
        connectedEmail={status.email}
        lastSync={status.lastSync}
        error={status.error}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRetry={handleRetry}
        additionalActions={
          status.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 h-8"
            >
              <Settings className="h-3 w-3" />
              Configure
            </Button>
          ) : undefined
        }
      />

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Connect Google Calendar
            </DialogTitle>
            <DialogDescription>
              Buzzboard will request the following permissions to enhance your scheduling:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Permissions List */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CalendarCheck className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Create and manage events</p>
                  <p className="text-xs text-gray-600">
                    Automatically create calendar events for your shoots
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Check availability</p>
                  <p className="text-xs text-gray-600">
                    Prevent double-booking by checking your calendar
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Read calendar details</p>
                  <p className="text-xs text-gray-600">
                    Sync event updates and modifications
                  </p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800">
                <Shield className="h-3 w-3 inline mr-1" />
                Buzzboard only accesses your calendar for shoot-related events.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPermissionsDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmConnection}
                className="flex-1"
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Continue to Google'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              Google Calendar Settings
            </DialogTitle>
            <DialogDescription>
              Configure your Google Calendar integration preferences
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <GoogleCalendarSettings
              isConnected={status.connected}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </>
  )
} 