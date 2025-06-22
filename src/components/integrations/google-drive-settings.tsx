'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Folder, FolderOpen, Settings, ChevronRight, Home, ArrowLeft, FolderPlus } from 'lucide-react'
import { GoogleDriveSettings } from '@/lib/types/settings'
import { FolderBrowserItem } from '@/lib/services/google-drive-unified'
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
  const [currentFolderId, setCurrentFolderId] = useState<string>('root')
  const [folders, setFolders] = useState<FolderBrowserItem[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('/My Drive')
  
  // New folder creation states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Load folders when browser opens or folder changes
  const loadFolders = useCallback(async (folderId: string) => {
    if (!onBrowseFolders) return

    setIsLoadingFolders(true)
    try {
      const folderList = await onBrowseFolders(folderId === 'root' ? undefined : folderId)
      setFolders(folderList)
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders')
    } finally {
      setIsLoadingFolders(false)
    }
  }, [onBrowseFolders])

  useEffect(() => {
    if (showFolderBrowser && onBrowseFolders) {
      loadFolders(currentFolderId)
    }
    
    // Reset create folder state when dialog opens
    if (showFolderBrowser) {
      setShowCreateFolder(false)
      setNewFolderName('')
    }
  }, [showFolderBrowser, currentFolderId, loadFolders, onBrowseFolders])

  // Create new folder function
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    setIsCreatingFolder(true)
    try {
      const response = await fetch('/api/integrations/google-drive/browse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName: newFolderName.trim(),
          parentId: currentFolderId === 'root' ? undefined : currentFolderId
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || `Folder "${newFolderName}" created successfully`)
        setNewFolderName('')
        setShowCreateFolder(false)
        // Refresh the folder list
        await loadFolders(currentFolderId)
      } else {
        throw new Error(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleSettingChange = (key: keyof GoogleDriveSettings, value: string | boolean | undefined) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const handleFolderSelect = (folder: FolderBrowserItem) => {
    if (folder.isParent) {
      // Navigate to parent folder
      setCurrentFolderId(folder.id)
      setSelectedFolderPath(folder.path)
    } else {
      // Navigate into folder or shared drive
      setCurrentFolderId(folder.id)
      setSelectedFolderPath(folder.path)
    }
  }

  const handleSelectCurrentFolder = () => {
    // Find the current folder info or use root
    let selectedFolder: FolderBrowserItem
    
    if (currentFolderId === 'root') {
      selectedFolder = {
        id: 'root',
        name: 'My Drive (Root)',
        path: '/My Drive',
        webViewLink: ''
      }
    } else {
      // Find folder in current list or use cached path
      const foundFolder = folders.find(f => f.id === currentFolderId)
      if (foundFolder) {
        selectedFolder = foundFolder
      } else {
        // Use cached path info
        const folderName = selectedFolderPath.split('/').pop() || 'Selected Folder'
        selectedFolder = {
          id: currentFolderId,
          name: folderName,
          path: selectedFolderPath,
          webViewLink: ''
        }
      }
    }
    
    console.log('🔍 [Debug] Selecting folder:', selectedFolder)
    
    handleSettingChange('parentFolderId', selectedFolder.id)
    handleSettingChange('parentFolderName', selectedFolder.name)
    handleSettingChange('parentFolderPath', selectedFolder.path)
    setSelectedFolderPath(selectedFolder.path)
    setShowFolderBrowser(false)
    toast.success(`Selected folder: ${selectedFolder.name}`)
  }

  const clearParentFolder = () => {
    handleSettingChange('parentFolderId', undefined)
    handleSettingChange('parentFolderName', undefined)
    handleSettingChange('parentFolderPath', undefined)
    setSelectedFolderPath('/My Drive')
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
        <div className="space-y-3">
          <Label className="text-sm font-medium">Parent Folder</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Folder className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm text-gray-900 font-medium">
                  {settings.parentFolderName || 'My Drive (Root)'}
                </div>
                <div className="text-xs text-gray-500">
                  {settings.parentFolderPath || '/My Drive'}
                </div>
              </div>
              {settings.parentFolderId && settings.parentFolderId !== 'root' && (
                <Badge variant="outline" className="text-xs">
                  {settings.parentFolderName || 'Custom'}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {onBrowseFolders && (
                <Dialog open={showFolderBrowser} onOpenChange={setShowFolderBrowser}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Browse Folders
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Select Parent Folder</DialogTitle>
                      <DialogDescription>
                        Choose where to organize your client folders
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 flex-1 overflow-hidden">
                      {/* Current Path */}
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <Home className="h-4 w-4" />
                        <span className="text-gray-600">
                          {folders.find(f => f.id === currentFolderId)?.path || selectedFolderPath || '/My Drive'}
                        </span>
                      </div>

                      {/* Create Folder Section - Always visible */}
                      <div className="border rounded-lg p-3 bg-white">
                        {!showCreateFolder ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Create a new folder here</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('🔍 [Debug] Create folder button clicked')
                                setShowCreateFolder(true)
                              }}
                              className="gap-2"
                            >
                              <FolderPlus className="h-4 w-4" />
                              Create Folder
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                              <FolderPlus className="h-4 w-4" />
                              Create New Folder
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter folder name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCreateFolder()
                                  } else if (e.key === 'Escape') {
                                    setShowCreateFolder(false)
                                    setNewFolderName('')
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim() || isCreatingFolder}
                                size="sm"
                              >
                                {isCreatingFolder ? 'Creating...' : 'Create'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowCreateFolder(false)
                                  setNewFolderName('')
                                }}
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs text-blue-700">
                              Folder will be created in: {folders.find(f => f.id === currentFolderId)?.path || selectedFolderPath || '/My Drive'}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Folder List */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-1 max-h-60">
                          {isLoadingFolders ? (
                            <div className="text-center py-4 text-gray-500">
                              Loading folders...
                            </div>
                          ) : folders.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                              No folders found
                            </div>
                          ) : (
                            folders.map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => handleFolderSelect(folder)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-left"
                              >
                                {folder.isParent ? (
                                  <ArrowLeft className="h-4 w-4 text-gray-400" />
                                ) : folder.type === 'shared-drive' ? (
                                  <div className="flex items-center gap-1">
                                    <Folder className="h-4 w-4 text-purple-600" />
                                    <Badge variant="secondary" className="text-xs px-1">
                                      Team
                                    </Badge>
                                  </div>
                                ) : (
                                  <Folder className="h-4 w-4 text-blue-600" />
                                )}
                                <span className="text-sm flex-1 truncate">{folder.name}</span>
                                {!folder.isParent && (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowFolderBrowser(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSelectCurrentFolder}
                          className="flex-1"
                          disabled={false}
                        >
                          {currentFolderId === 'root' 
                            ? 'Select My Drive Root' 
                            : `Select "${folders.find(f => f.id === currentFolderId)?.name || selectedFolderPath.split('/').pop() || 'This Folder'}"`
                          }
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {settings.parentFolderId && (
                <Button variant="outline" size="sm" onClick={clearParentFolder}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            All client folders will be created inside this parent folder. Leave empty to use root Drive.
          </p>
        </div>

        <Separator />

        {/* Auto-create Year Folders */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Auto-create Year Folders</Label>
            <p className="text-xs text-gray-500">
              Organize clients by year (e.g., 2024/Client Name)
            </p>
          </div>
          <Switch
            checked={settings.autoCreateYearFolders || false}
            onCheckedChange={(checked) => handleSettingChange('autoCreateYearFolders', checked)}
          />
        </div>

        <Separator />

        {/* Folder Naming Pattern */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Client Folder Naming</Label>
          <Select
            value={settings.folderNamingPattern || 'client-only'}
            onValueChange={(value) => handleSettingChange('folderNamingPattern', value)}
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
          
          {settings.folderNamingPattern === 'custom' && (
            <div className="space-y-2">
              <Input
                placeholder="e.g., {year}-{month} {client}"
                value={settings.customNamingTemplate || ''}
                onChange={(e) => handleSettingChange('customNamingTemplate', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Available variables: {'{client}'}, {'{year}'}, {'{month}'}
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Folder Structure Preview</Label>
          <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
            <div className="text-gray-600">
              {settings.parentFolderPath || '/My Drive'}
              {settings.autoCreateYearFolders && (
                <>
                  <br />
                  └── 📁 {new Date().getFullYear()}
                </>
              )}
              <br />
              {settings.autoCreateYearFolders ? '    ' : ''}└── 📁 {
                settings.folderNamingPattern === 'year-client' ? `${new Date().getFullYear()} - Acme Corp` :
                settings.folderNamingPattern === 'custom' && settings.customNamingTemplate ? 
                  settings.customNamingTemplate
                    .replace('{client}', 'Acme Corp')
                    .replace('{year}', new Date().getFullYear().toString())
                    .replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0')) :
                  'Acme Corp'
              }
              <br />
              {settings.autoCreateYearFolders ? '    ' : ''}    └── 📁 [2024-01-15] Product Launch
              <br />
              {settings.autoCreateYearFolders ? '    ' : ''}        ├── 📁 Hero Shot
              <br />
              {settings.autoCreateYearFolders ? '    ' : ''}        └── 📁 Behind Scenes
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 