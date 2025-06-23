'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { HardDrive, Folder, Check } from 'lucide-react'
import { ClientStorageSettings } from '@/lib/types/settings'

interface WizardData {
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
  website?: string
  socialMedia: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  notes?: string
  storageSettings?: Partial<ClientStorageSettings>
}

interface StorageSetupStepProps {
  data: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export const StorageSetupStep = ({ data, onUpdate }: StorageSetupStepProps) => {
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  const checkGoogleDriveStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status')
      if (response.ok) {
        const statusData = await response.json()
        setGoogleDriveConnected(statusData.integrations?.['google-drive']?.connected || false)
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStorageSettingsUpdate = (settings: Partial<ClientStorageSettings>) => {
    onUpdate({
      storageSettings: {
        ...data.storageSettings,
        ...settings
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
          <HardDrive className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Storage Setup</h3>
        <p className="text-sm text-gray-600">Configure where content will be stored</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Checking integrations...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Google Drive Status */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Google Drive</h4>
                  <p className="text-sm text-gray-500">
                    {googleDriveConnected ? 'Connected and ready' : 'Not connected'}
                  </p>
                </div>
              </div>
              {googleDriveConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Connect Later
                </Button>
              )}
            </div>
          </div>

          {/* Storage Configuration */}
          {googleDriveConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Default Storage Setup</h4>
                <p className="text-sm text-blue-800 mb-3">
                  We&apos;ll create a folder structure for {data.name} in your Google Drive:
                </p>
                <div className="bg-white rounded border p-3 font-mono text-xs">
                  <div className="text-gray-600">
                    📁 My Drive/<br/>
                    └── 📁 {data.name}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;└── 📁 [Date] Shoot Name<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 Post Idea 1<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Post Idea 2
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleStorageSettingsUpdate({
                  storageProvider: 'google-drive',
                  customNaming: false
                })}
              >
                <Folder className="h-4 w-4 mr-2" />
                Use Default Setup
              </Button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Google Drive Not Connected</h4>
              <p className="text-sm text-yellow-800 mb-3">
                You can connect Google Drive later in Settings → Integrations to enable automatic file organization.
              </p>
              <p className="text-xs text-yellow-700">
                For now, we&apos;ll use the default storage setup.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-purple-900 mb-1">
                  Storage can be configured later
                </h4>
                <p className="text-xs text-purple-800">
                  You can always change storage settings, connect integrations, and customize 
                  folder organization from the client settings page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 