'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StorageProviderSelector } from '@/components/ui/storage-provider-selector'
import { FolderSelector } from '@/components/ui/folder-selector'
import { FolderBrowserDialog, FolderBrowserItem } from '@/components/ui/folder-browser-dialog'
import { useFolderBrowser } from '@/lib/hooks/use-folder-browser'
import { useIntegrationStatus } from '@/lib/hooks/use-integration-status'
import { 
  HardDrive,
  Save
} from 'lucide-react'
import { ClientStorageSettings } from '@/lib/types/settings'
import { toast } from 'sonner'

interface ClientWithStats {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  activeProjects: number
}

interface ClientStorageSettingsFormProps {
  client: ClientWithStats
  currentSettings: ClientStorageSettings | null
  onSave: (settings: ClientStorageSettings) => void
  onCancel: () => void
}

export const ClientStorageSettingsForm = ({
  client,
  currentSettings,
  onSave,
  onCancel
}: ClientStorageSettingsFormProps) => {
  const [settings, setSettings] = useState<Partial<ClientStorageSettings>>({
    clientId: client.id,
    clientName: client.name,
    storageProvider: currentSettings?.storageProvider || 'google-drive',
    storageFolderId: currentSettings?.storageFolderId,
    storageFolderName: currentSettings?.storageFolderName,
    storageFolderPath: currentSettings?.storageFolderPath,
    customNaming: currentSettings?.customNaming || false,
    namingTemplate: currentSettings?.namingTemplate,
  })

  const [showFolderBrowser, setShowFolderBrowser] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Use the reusable folder browser hook
  const { browseFolders: handleBrowseFolders, createFolder: handleCreateFolder } = useFolderBrowser()
  
  // Use standardized integration status hook
  const { isGoogleDriveConnected } = useIntegrationStatus()

  const handleSettingChange = (key: keyof ClientStorageSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleFolderSelect = (folder: FolderBrowserItem) => {
    setSettings(prev => ({
      ...prev,
      storageFolderId: folder.id === 'root' ? undefined : folder.id,
      storageFolderName: folder.id === 'root' ? undefined : folder.name,
      storageFolderPath: folder.path
    }))
  }

  const clearStorageFolder = () => {
    setSettings(prev => ({
      ...prev,
      storageFolderId: undefined,
      storageFolderName: undefined,
      storageFolderPath: undefined
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const settingsToSave: ClientStorageSettings = {
        clientId: client.id,
        clientName: client.name,
        storageProvider: settings.storageProvider || 'google-drive',
        storageFolderId: settings.storageFolderId,
        storageFolderName: settings.storageFolderName,
        storageFolderPath: settings.storageFolderPath,
        customNaming: settings.customNaming || false,
        namingTemplate: settings.namingTemplate,
      }

      onSave(settingsToSave)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Storage Settings</h2>
        </div>
          <p className="text-sm text-gray-600">
          Configure where {client.name}&apos;s content will be stored
          </p>
      </div>

      {/* Storage Provider */}
      <StorageProviderSelector
              value={settings.storageProvider || 'google-drive'}
              onValueChange={(value) => handleSettingChange('storageProvider', value)}
        googleDriveConnected={isGoogleDriveConnected}
      />

          {/* Google Drive Folder Selection */}
          {settings.storageProvider === 'google-drive' && (
        <FolderSelector
          label="Storage Folder"
          folderName={settings.storageFolderName}
          folderPath={settings.storageFolderPath}
          folderId={settings.storageFolderId}
          isConnected={isGoogleDriveConnected}
          notConnectedMessage="Connect Google Drive in Settings → Integrations to select a folder"
          onBrowse={() => setShowFolderBrowser(true)}
          onClear={clearStorageFolder}
          helpText="Content will be organized in subfolders by shoot date and type"
        />
          )}

          <Separator />

          {/* Custom Naming */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Custom File Naming</Label>
              <p className="text-xs text-gray-500">
              Use custom naming templates for organized file management
              </p>
            </div>
            <Switch
              checked={settings.customNaming || false}
              onCheckedChange={(checked) => handleSettingChange('customNaming', checked)}
            />
          </div>

          {settings.customNaming && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-100">
            <div>
              <Label className="text-sm font-medium">Naming Template</Label>
              <Input
                placeholder="e.g., {client}_{date}_{type}"
                value={settings.namingTemplate || ''}
                onChange={(e) => handleSettingChange('namingTemplate', e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Available variables:</p>
              <div className="grid grid-cols-2 gap-1">
                <span>• {'{client}'} - Client name</span>
                <span>• {'{date}'} - Shoot date</span>
                <span>• {'{type}'} - Content type</span>
                <span>• {'{title}'} - Post title</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Folder Structure Preview</Label>
        <div className="p-4 bg-gray-50 rounded-lg text-sm font-mono">
          <div className="text-gray-700 space-y-1">
            <div>📁 {settings.storageFolderPath || '/My Drive'}</div>
            <div className="ml-4">└── 📁 [2024-01-15] Product Launch</div>
            <div className="ml-8">├── 📁 Hero Shot</div>
            <div className="ml-8">└── 📁 Behind Scenes</div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Shoot folders will be created directly in the selected folder. No additional client folder will be created.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Folder Browser Dialog */}
      <FolderBrowserDialog
        open={showFolderBrowser}
        onOpenChange={setShowFolderBrowser}
        title="Select Storage Folder"
        description={`Choose where ${client.name}'s content will be stored`}
        onFolderSelect={handleFolderSelect}
        onBrowseFolders={handleBrowseFolders}
        onCreateFolder={handleCreateFolder}
        initialParentId={settings.storageFolderId}
        initialPath={settings.storageFolderPath}
      />
    </div>
  )
} 