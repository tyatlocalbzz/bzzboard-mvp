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
        console.log('📖 [GoogleDriveIntegration] Settings loaded:', data)
        
        if (data.success && data.data?.settings) {
          setCurrentSettings(data.data.settings)
        } else {
          console.error('Invalid settings response format:', data)
        }
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

      if (response.ok && data.success && data.data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.data.authUrl
      } else {
        throw new Error(data.error || data.message || 'Failed to initiate connection')
      }
    } catch (error) {
      console.error('Google Drive connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Google Drive')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      console.log('🔌 [GoogleDriveIntegration] Starting disconnect process...')
      
      const response = await fetch('/api/integrations/google-drive/disconnect', {
        method: 'POST',
      })

      console.log('🔌 [GoogleDriveIntegration] Disconnect response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [GoogleDriveIntegration] Disconnect successful:', data)
        
        if (data.success) {
          toast.success('Google Drive disconnected successfully')
          
          // Trigger status refresh
          console.log('🔄 [GoogleDriveIntegration] Triggering status refresh...')
          onStatusChange()
        } else {
          throw new Error(data.error || data.message || 'Failed to disconnect')
        }
      } else {
        const data = await response.json()
        console.error('❌ [GoogleDriveIntegration] Disconnect failed:', data)
        throw new Error(data.error || data.message || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('❌ [GoogleDriveIntegration] Disconnect error:', error)
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

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Google Drive settings saved successfully!')
      } else {
        throw new Error(data.error || data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving Google Drive settings:', error)
      toast.error('Failed to save settings. Changes are temporary.')
    }
  }

  // Folder browsing function with proper API response handling
  const handleBrowseFolders = async (parentId?: string): Promise<FolderBrowserItem[]> => {
    console.log('📂 [GoogleDriveIntegration] Browsing folders:', { parentId })
    
    try {
      const response = await fetch(`/api/integrations/google-drive/browse?parentId=${parentId || 'root'}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data?.folders) {
          return data.data.folders
        } else {
          console.error('Invalid browse response format:', data)
          return []
        }
      } else {
        throw new Error('Failed to browse folders')
      }
    } catch (error) {
      console.error('Error browsing folders:', error)
      toast.error('Failed to browse folders. Please check your Google Drive connection.')
      return []
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
                  <p className="text-sm font-medium text-gray-900">Browse and view your folders</p>
                  <p className="text-xs text-gray-600">
                    Access existing folders to choose where to organize your content
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Create folders and upload files</p>
                  <p className="text-xs text-gray-600">
                    Automatically organize content with folder structure and file uploads
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Read file metadata</p>
                  <p className="text-xs text-gray-600">
                    Track upload status and sync information for your content
                  </p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <Shield className="h-3 w-3 inline mr-1" />
                Buzzboard can browse your folders but only manages files it creates. Your existing files remain untouched.
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