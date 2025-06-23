'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { IntegrationCard } from './integration-card'
import { GoogleDriveSettingsComponent } from './google-drive-settings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FolderOpen, HardDrive, Shield, Zap, Settings } from 'lucide-react'
import { GoogleDriveSettings } from '@/lib/types/settings'
import { FolderBrowserItem } from '@/lib/services/google-drive-unified'
import { toast } from 'sonner'

interface GoogleDriveIntegrationProps {
  status: {
    connected: boolean
    email?: string
    lastSync?: string
    error?: string
  }
  onStatusChange: () => void
  userEmail: string
}

export const GoogleDriveIntegration = ({ 
  status, 
  onStatusChange 
}: GoogleDriveIntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)

  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [currentSettings, setCurrentSettings] = useState<GoogleDriveSettings>({
    folderNamingPattern: 'client-only',
    autoCreateYearFolders: false
  })
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const hasLoadedSettings = useRef(false)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true)
      hasLoadedSettings.current = true
      console.log('📖 [GoogleDriveIntegration] Loading settings...')
      
      const response = await fetch('/api/integrations/google-drive/settings')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📖 [GoogleDriveIntegration] Settings loaded:', data.settings)
        setCurrentSettings(data.settings)
      } else {
        console.error('Failed to load settings:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading Google Drive settings:', error)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])

  // Load settings when integration becomes connected (only once)
  useEffect(() => {
    if (status.connected && !hasLoadedSettings.current) {
      loadSettings()
    }
  }, [status.connected, loadSettings])

  const handleConnect = async () => {
    setShowPermissionsDialog(true)
  }

  const handleConfirmConnection = async () => {
    try {
      setIsConnecting(true)
      setShowPermissionsDialog(false)
      
      // Initiate Google OAuth flow
      const response = await fetch('/api/integrations/google-drive/connect', {
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
      console.error('Google Drive connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Google Drive')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/integrations/google-drive/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Google Drive disconnected successfully')
        onStatusChange()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Google Drive disconnect error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect Google Drive')
    }
  }

  const handleRetry = async () => {
    await handleConnect()
  }

  const handleSettingsChange = async (newSettings: GoogleDriveSettings) => {
    console.log('💾 [GoogleDriveIntegration] Saving settings:', newSettings)
    setCurrentSettings(newSettings)
    
    try {
      // Save settings to backend
      const response = await fetch('/api/integrations/google-drive/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      })

      if (response.ok) {
        toast.success('Google Drive settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving Google Drive settings:', error)
      toast.error('Failed to save settings. Changes are temporary.')
    }
  }

  // Mock folder browsing function (replace with real API call)
  const handleBrowseFolders = async (parentId?: string): Promise<FolderBrowserItem[]> => {
    console.log('📂 [GoogleDriveIntegration] Browsing folders:', { parentId })
    
    try {
      const response = await fetch(`/api/integrations/google-drive/browse?parentId=${parentId || 'root'}`)
      
      if (response.ok) {
        const data = await response.json()
        return data.folders || []
      } else {
        throw new Error('Failed to browse folders')
      }
    } catch (error) {
      console.error('Error browsing folders:', error)
      // Return mock data for now
      return [
        {
          id: 'folder1',
          name: 'Business Content',
          webViewLink: '',
          path: '/My Drive/Business Content'
        },
        {
          id: 'folder2', 
          name: 'Client Work',
          webViewLink: '',
          path: '/My Drive/Client Work'
        },
        {
          id: 'folder3',
          name: 'Photography',
          webViewLink: '',
          path: '/My Drive/Photography'
        }
      ]
    }
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
        name="Google Drive"
        description="Automatically organize and store your content files in the cloud"
        icon={<HardDrive className="h-5 w-5 text-blue-600" />}
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
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center gap-1 h-8"
              disabled={isLoadingSettings}
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
              <HardDrive className="h-5 w-5 text-blue-600" />
              Connect Google Drive
            </DialogTitle>
            <DialogDescription>
              Buzzboard will request the following permissions to enhance your workflow:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Permissions List */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <FolderOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Create and manage folders</p>
                  <p className="text-xs text-gray-600">
                    Organize your content with automatic folder structure
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload and store files</p>
                  <p className="text-xs text-gray-600">
                    Automatically save your shoot content and editing notes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Read file metadata</p>
                  <p className="text-xs text-gray-600">
                    Track upload status and sync information
                  </p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <Shield className="h-3 w-3 inline mr-1" />
                Your files remain private and secure. Buzzboard only accesses files it creates.
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

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Google Drive Settings
            </DialogTitle>
            <DialogDescription>
              Configure how your content is organized in Google Drive
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <GoogleDriveSettingsComponent
              currentSettings={currentSettings}
              onSettingsChange={handleSettingsChange}
              onBrowseFolders={handleBrowseFolders}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowSettingsDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 