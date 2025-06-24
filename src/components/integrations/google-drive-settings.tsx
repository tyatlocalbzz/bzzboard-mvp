'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { FolderSelector } from '@/components/ui/folder-selector'
import { FolderBrowserDialog, FolderBrowserItem } from '@/components/ui/folder-browser-dialog'
import { Settings } from 'lucide-react'
import { GoogleDriveSettings } from '@/lib/types/settings'
import { toast } from 'sonner'

interface GoogleDriveSettingsProps {
  currentSettings?: GoogleDriveSettings
  onSettingsChange: (settings: GoogleDriveSettings) => void
  onBrowseFolders?: (parentId?: string) => Promise<FolderBrowserItem[]>
}

export const GoogleDriveSettingsComponent = ({
  currentSettings,
  onSettingsChange,
  onBrowseFolders
}: GoogleDriveSettingsProps) => {
  const [settings, setSettings] = useState<GoogleDriveSettings>(
    currentSettings || {
      folderNamingPattern: 'client-only',
      autoCreateYearFolders: false
    }
  )
  const [showFolderBrowser, setShowFolderBrowser] = useState(false)

  // Create new folder function
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

  const handleSettingChange = (key: keyof GoogleDriveSettings, value: string | boolean | undefined) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const handleFolderSelect = (folder: FolderBrowserItem) => {
    handleSettingChange('parentFolderId', folder.id === 'root' ? undefined : folder.id)
    handleSettingChange('parentFolderName', folder.id === 'root' ? undefined : folder.name)
    handleSettingChange('parentFolderPath', folder.path)
    toast.success(`Selected folder: ${folder.name}`)
  }

  const clearParentFolder = () => {
    handleSettingChange('parentFolderId', undefined)
    handleSettingChange('parentFolderName', undefined)
    handleSettingChange('parentFolderPath', undefined)
    toast.success('Cleared parent folder - will use root Drive')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Google Drive Organization
        </CardTitle>
        <CardDescription>
          Configure how your content is organized in Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Parent Folder Selection */}
        <FolderSelector
          label="Default Parent Folder"
          folderName={settings.parentFolderName}
          folderPath={settings.parentFolderPath}
          folderId={settings.parentFolderId}
          isConnected={true} // Always connected in this context
          notConnectedMessage="Google Drive integration not available"
          onBrowse={() => setShowFolderBrowser(true)}
          onClear={clearParentFolder}
          helpText="Default folder for new client setups. Each client can override this in their individual settings."
        />

        <Separator />

        {/* Auto-create Year Folders */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-create Year Folders</Label>
            <p className="text-xs text-gray-500">
              Legacy setting - no longer used with current folder structure
            </p>
          </div>
          <Switch
            checked={settings.autoCreateYearFolders || false}
            onCheckedChange={(checked) => handleSettingChange('autoCreateYearFolders', checked)}
            disabled={true}
          />
        </div>

        <Separator />

        {/* Folder Naming Pattern */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Client Folder Naming</Label>
          <p className="text-xs text-gray-500 mb-2">
            Legacy setting - clients now select their specific folders directly
          </p>
          <Select
            value={settings.folderNamingPattern || 'client-only'}
            onValueChange={(value) => handleSettingChange('folderNamingPattern', value)}
            disabled={true}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client-only">Client Name Only</SelectItem>
              <SelectItem value="year-client">Year - Client Name</SelectItem>
              <SelectItem value="custom">Custom Template</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Folder Structure</Label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
            <div className="text-gray-600">
              Selected Client Folder (e.g., /My Drive/Clients/Acme Corp)
              <br />
              └── 📁 [2024-01-15] Product Launch
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;├── 📁 Hero Shot
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Behind Scenes
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Shoot folders are created directly in the client-selected folder. No additional nesting is applied.
          </p>
        </div>
      </CardContent>

      {/* Folder Browser Dialog */}
      <FolderBrowserDialog
        open={showFolderBrowser}
        onOpenChange={setShowFolderBrowser}
        title="Select Parent Folder"
        description="Choose where to organize your client folders"
        onFolderSelect={handleFolderSelect}
        onBrowseFolders={onBrowseFolders}
        onCreateFolder={handleCreateFolder}
      />
    </Card>
  )
} 