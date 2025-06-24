'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { StorageProviderSelector } from '@/components/ui/storage-provider-selector'
import { FolderSelector } from '@/components/ui/folder-selector'
import { FolderBrowserDialog, FolderBrowserItem } from '@/components/ui/folder-browser-dialog'
import { HardDrive } from 'lucide-react'
import { WizardStepProps } from '@/lib/types/wizard'
import { ClientStorageSettings } from '@/lib/types/settings'
import { toast } from 'sonner'

export const StorageSetupStep = ({ data, onUpdate }: WizardStepProps) => {
  const [showFolderBrowser, setShowFolderBrowser] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)

  // Initialize storage settings if not present
  const storageSettings = data.storageSettings || {}

  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  const checkGoogleDriveStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status')
      if (response.ok) {
        const data = await response.json()
        setGoogleDriveConnected(data.integrations?.googleDrive?.connected || false)
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error)
    }
  }

  const handleStorageSettingChange = (key: keyof ClientStorageSettings, value: unknown) => {
    onUpdate({
      storageSettings: {
        ...storageSettings,
        [key]: value
      }
    })
  }

  const handleBrowseFolders = async (parentId?: string): Promise<FolderBrowserItem[]> => {
    try {
      const response = await fetch(`/api/integrations/google-drive/browse?parentId=${parentId || 'root'}`)

      if (response.ok) {
        const data = await response.json()
        return data.folders || []
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Error response:', errorData)
        
        if (response.status === 401) {
          toast.error('Google Drive authentication expired. Please reconnect in the Integrations tab.')
        } else if (response.status === 400) {
          toast.error('Google Drive not properly connected. Please check your integration settings.')
        } else {
          toast.error(`Failed to load folders: ${errorData.error || 'Unknown error'}`)
        }
        
        return []
      }
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders. Please check your Google Drive connection.')
      return []
    }
  }

  const handleCreateFolder = async (folderName: string, parentId?: string): Promise<void> => {
    const response = await fetch('/api/integrations/google-drive/browse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderName: folderName.trim(),
        parentId: parentId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create folder')
    }
  }

  const handleClientRootFolderSelect = (folder: FolderBrowserItem) => {
    // Update client root folder settings
    handleStorageSettingChange('clientRootFolderId', folder.id === 'root' ? undefined : folder.id)
    handleStorageSettingChange('clientRootFolderName', folder.id === 'root' ? undefined : folder.name)
    handleStorageSettingChange('clientRootFolderPath', folder.path)
    
    // Clear content folder selection when root changes
    handleStorageSettingChange('contentFolderId', undefined)
    handleStorageSettingChange('contentFolderName', undefined)
    handleStorageSettingChange('contentFolderPath', undefined)
  }

  const handleContentFolderSelect = (folder: FolderBrowserItem) => {
    handleStorageSettingChange('contentFolderId', folder.id === 'root' ? undefined : folder.id)
    handleStorageSettingChange('contentFolderName', folder.id === 'root' ? undefined : folder.name)
    handleStorageSettingChange('contentFolderPath', folder.path)
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Storage Setup</h3>
        </div>
        <p className="text-sm text-gray-600">
          Configure where this client&apos;s content will be stored (optional)
        </p>
      </div>

      {/* Storage Provider Selection */}
      <StorageProviderSelector
        value={storageSettings.storageProvider || 'google-drive'}
        onValueChange={(value) => handleStorageSettingChange('storageProvider', value)}
        googleDriveConnected={googleDriveConnected}
      />

      {/* Google Drive Folder Selection */}
      {storageSettings.storageProvider === 'google-drive' && (
        <div className="space-y-4">
          {/* Client Root Folder */}
          <FolderSelector
            label="Client Root Folder"
            folderName={storageSettings.clientRootFolderName}
            folderPath={storageSettings.clientRootFolderPath}
            folderId={storageSettings.clientRootFolderId}
            isConnected={googleDriveConnected}
            notConnectedMessage="Connect Google Drive in Settings → Integrations to select folders"
            onBrowse={() => setShowFolderBrowser(true)}
            helpText="Main folder for all client content and organization"
          />

          {/* Content Subfolder - Only show if client root is selected */}
          {storageSettings.clientRootFolderId && (
            <FolderSelector
              label="Content Subfolder"
              folderName={storageSettings.contentFolderName}
              folderPath={storageSettings.contentFolderPath}
              folderId={storageSettings.contentFolderId}
              isConnected={googleDriveConnected}
              notConnectedMessage="Select client root folder first"
              onBrowse={() => setShowFolderBrowser(true)}
              helpText="Subfolder within client root for shoot content"
            />
          )}
        </div>
      )}

      {/* Folder Structure Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Folder Structure Preview</Label>
        <div className="p-4 bg-gray-50 rounded-lg text-sm font-mono">
          <div className="text-gray-700 space-y-1">
            <div>📁 {storageSettings.clientRootFolderPath || '/My Drive'}</div>
            {storageSettings.contentFolderPath && (
              <div className="ml-4">└── 📁 Content</div>
            )}
            <div className={storageSettings.contentFolderPath ? "ml-8" : "ml-4"}>
              ├── 📁 [2024-01-15] Product Launch
            </div>
            <div className={storageSettings.contentFolderPath ? "ml-12" : "ml-8"}>
              ├── 📁 Hero Shot
            </div>
            <div className={storageSettings.contentFolderPath ? "ml-12" : "ml-8"}>
              └── 📁 Behind Scenes
            </div>
            <div className={storageSettings.contentFolderPath ? "ml-8" : "ml-4"}>
              ├── 📁 Contracts (future)
            </div>
            <div className={storageSettings.contentFolderPath ? "ml-8" : "ml-4"}>
              ├── 📁 Assets (future)
            </div>
            <div className={storageSettings.contentFolderPath ? "ml-8" : "ml-4"}>
              └── 📁 Archive (future)
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Shoot folders will be created in the selected location. Future expansion will include additional organization folders.
        </p>
      </div>

      {/* Folder Browser Dialog */}
      <FolderBrowserDialog
        open={showFolderBrowser}
        onOpenChange={setShowFolderBrowser}
        title="Select Folder"
        description="Choose a folder for client content storage"
        onFolderSelect={(folder) => {
          // Determine which folder we're selecting based on current context
          if (!storageSettings.clientRootFolderId) {
            handleClientRootFolderSelect(folder)
          } else {
            handleContentFolderSelect(folder)
          }
        }}
        onBrowseFolders={handleBrowseFolders}
        onCreateFolder={handleCreateFolder}
        initialParentId={
          storageSettings.clientRootFolderId && !storageSettings.contentFolderId
            ? storageSettings.clientRootFolderId
            : storageSettings.contentFolderId || storageSettings.clientRootFolderId
        }
        initialPath={
          storageSettings.contentFolderPath || storageSettings.clientRootFolderPath
        }
      />
    </div>
  )
} 