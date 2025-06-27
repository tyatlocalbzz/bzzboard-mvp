'use client'

import { useState, useCallback, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FolderSelector } from '@/components/ui/folder-selector'
import { FolderBrowserDialog, FolderBrowserItem } from '@/components/ui/folder-browser-dialog'
import { useFolderBrowser } from '@/lib/hooks/use-folder-browser'
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

  // Use the reusable folder browser hook, but prefer the passed onBrowseFolders if available
  const { browseFolders, createFolder: handleCreateFolder } = useFolderBrowser()
  const effectiveBrowseFolders = onBrowseFolders || browseFolders

  // Debounce timer to prevent rapid settings updates
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const handleFolderSelect = useCallback((folder: FolderBrowserItem) => {
    // Update all folder-related settings at once to minimize API calls
    const newSettings = {
      ...settings,
      parentFolderId: folder.id === 'root' ? undefined : folder.id,
      parentFolderName: folder.id === 'root' ? undefined : folder.name,
      parentFolderPath: folder.path
    }
    
    setSettings(newSettings)
    
    // Clear any pending debounced updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Apply changes immediately for folder selection (user expects instant feedback)
    onSettingsChange(newSettings)
    toast.success(`Selected folder: ${folder.name}`)
  }, [settings, onSettingsChange])

  const clearParentFolder = useCallback(() => {
    // Clear all folder-related settings at once
    const newSettings = {
      ...settings,
      parentFolderId: undefined,
      parentFolderName: undefined,
      parentFolderPath: undefined
    }
    
    setSettings(newSettings)
    
    // Clear any pending debounced updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Apply changes immediately for clear action
    onSettingsChange(newSettings)
    toast.success('Cleared parent folder - will use root Drive')
  }, [settings, onSettingsChange])

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

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Folder Structure</Label>
          <div className="p-3 bg-muted rounded-lg text-sm font-mono">
            <div className="text-muted-foreground">
              Auto-organization enabled
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Files are organized by client and shoot date
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Files will be organized automatically when uploaded
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
        onBrowseFolders={effectiveBrowseFolders}
        onCreateFolder={handleCreateFolder}
      />
    </Card>
  )
} 