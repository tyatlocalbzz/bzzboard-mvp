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
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Folder, 
  FolderOpen, 
  FolderPlus,
  ChevronRight, 
  Home, 
  ArrowLeft,
  HardDrive,
  Save,
  X
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

interface FolderBrowserItem {
  id: string
  name: string
  webViewLink: string
  path: string
  isParent?: boolean
  type?: string
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
  const [currentFolderId, setCurrentFolderId] = useState<string>('root')
  const [folders, setFolders] = useState<FolderBrowserItem[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  
  // Folder creation states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('/My Drive')

  // Check Google Drive connection status
  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  const loadFolders = useCallback(async (folderId: string) => {
    setIsLoadingFolders(true)
    try {
      const response = await fetch(`/api/integrations/google-drive/browse?parentId=${folderId === 'root' ? '' : folderId}`)
      
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
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
        
        // Use mock data as fallback
        setFolders([
          {
            id: 'mock-folder-1',
            name: 'Business Content',
            webViewLink: '',
            path: '/My Drive/Business Content'
          },
          {
            id: 'mock-folder-2', 
            name: 'Client Work',
            webViewLink: '',
            path: '/My Drive/Client Work'
          },
          {
            id: 'mock-folder-3',
            name: client.name,
            webViewLink: '',
            path: `/My Drive/${client.name}`
          }
        ])
      }
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders - using demo data')
      
      // Fallback to mock data for development
      setFolders([
        {
          id: 'mock-folder-1',
          name: 'Business Content',
          webViewLink: '',
          path: '/My Drive/Business Content'
        },
        {
          id: 'mock-folder-2', 
          name: 'Client Work',
          webViewLink: '',
          path: '/My Drive/Client Work'
        },
        {
          id: 'mock-folder-3',
          name: client.name,
          webViewLink: '',
          path: `/My Drive/${client.name}`
        }
      ])
    } finally {
      setIsLoadingFolders(false)
    }
  }, [client.name])

  // Load folders when browser opens or folder changes
  useEffect(() => {
    if (showFolderBrowser && googleDriveConnected) {
      loadFolders(currentFolderId)
    }
  }, [showFolderBrowser, currentFolderId, googleDriveConnected, loadFolders])

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

  const handleSettingChange = (key: keyof ClientStorageSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleFolderSelect = (folder: FolderBrowserItem) => {
    if (folder.isParent) {
      // Navigate to parent folder
      setCurrentFolderId(folder.id)
      setSelectedFolderPath(folder.path)
    } else {
      // Navigate into folder
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
        // Use cached path info - extract folder name from path
        const pathParts = selectedFolderPath.split('/')
        const folderName = pathParts[pathParts.length - 1] || 'Unknown Folder'
        selectedFolder = {
          id: currentFolderId,
          name: folderName,
          path: selectedFolderPath,
          webViewLink: ''
        }
      }
    }
    
    console.log('🔍 [Debug] Selecting folder:', selectedFolder)
    
    handleSettingChange('storageFolderId', selectedFolder.id)
    handleSettingChange('storageFolderName', selectedFolder.name)
    handleSettingChange('storageFolderPath', selectedFolder.path)
    setShowFolderBrowser(false)
    toast.success(`Selected folder: ${selectedFolder.name}`)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    try {
      setIsCreatingFolder(true)
      console.log('📁 [ClientStorageSettings] Creating folder:', {
        name: newFolderName,
        parentId: currentFolderId
      })

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

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [ClientStorageSettings] Folder created:', data.folder)
        
        toast.success(`Folder "${newFolderName}" created successfully!`)
        
        // Reset creation form
        setNewFolderName('')
        setShowCreateFolder(false)
        
        // Refresh folder list
        await loadFolders(currentFolderId)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 409) {
          toast.error(`Folder "${newFolderName}" already exists in this location`)
        } else if (response.status === 401) {
          toast.error('Google Drive authentication expired. Please reconnect.')
        } else if (response.status === 403) {
          toast.error('Insufficient permissions to create folders in this location')
        } else {
          toast.error(errorData.error || 'Failed to create folder')
        }
        
        console.error('❌ [ClientStorageSettings] Error creating folder:', errorData)
      }
    } catch (error) {
      console.error('❌ [ClientStorageSettings] Error creating folder:', error)
      toast.error('Failed to create folder. Please try again.')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const clearStorageFolder = () => {
    handleSettingChange('storageFolderId', undefined)
    handleSettingChange('storageFolderName', undefined)
    handleSettingChange('storageFolderPath', undefined)
    toast.success('Cleared storage folder - will use default location')
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const response = await fetch(`/api/client-settings/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        onSave(data.clientSettings)
        toast.success('Client storage settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving client settings:', error)
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Storage Settings for {client.name}
          </h2>
          <p className="text-sm text-gray-600">
            Configure where this client&apos;s content will be stored and organized
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Configuration
          </CardTitle>
          <CardDescription>
            Choose the storage provider and folder for {client.name}&apos;s content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Storage Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Storage Provider</Label>
            <Select
              value={settings.storageProvider || 'google-drive'}
              onValueChange={(value) => handleSettingChange('storageProvider', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google-drive">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    Google Drive
                    {googleDriveConnected && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        Connected
                      </Badge>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="dropbox" disabled>
                  <div className="flex items-center gap-2 opacity-50">
                    <HardDrive className="h-4 w-4 text-purple-600" />
                    Dropbox (Coming Soon)
                  </div>
                </SelectItem>
                <SelectItem value="onedrive" disabled>
                  <div className="flex items-center gap-2 opacity-50">
                    <HardDrive className="h-4 w-4 text-green-600" />
                    OneDrive (Coming Soon)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Google Drive Folder Selection */}
          {settings.storageProvider === 'google-drive' && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Client Storage Folder</Label>
                
                {!googleDriveConnected ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm">
                      <HardDrive className="h-4 w-4" />
                      <span className="font-medium">Google Drive not connected</span>
                    </div>
                    <p className="text-yellow-700 text-xs mt-1">
                      Please connect Google Drive in the Integrations tab first
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900 font-medium">
                          {settings.storageFolderName || 'My Drive (Default Location)'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {settings.storageFolderPath || '/My Drive'}
                        </div>
                      </div>
                      {settings.storageFolderId && (
                        <Badge variant="outline" className="text-xs">
                          {settings.storageFolderName || 'Custom'}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog open={showFolderBrowser} onOpenChange={setShowFolderBrowser}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Browse Folders
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Select Storage Folder</DialogTitle>
                            <DialogDescription>
                              Choose where {client.name}&apos;s content will be stored
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
                                  <div className="flex items-center justify-center py-4">
                                    <LoadingSpinner size="sm" />
                                    <span className="ml-2 text-sm text-gray-500">Loading folders...</span>
                                  </div>
                                ) : folders.length === 0 ? (
                                  <div className="text-center py-4 text-gray-500 text-sm">
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
                                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                                            Team
                                          </Badge>
                                        </div>
                                      ) : (
                                        <Folder className="h-4 w-4 text-blue-600" />
                                      )}
                                      <span className="text-sm flex-1">{folder.name}</span>
                                      {!folder.isParent && (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t">
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
                              disabled={currentFolderId === 'root'}
                            >
                              {currentFolderId === 'root' 
                                ? 'Select My Drive Root' 
                                : `Select ${folders.find(f => f.id === currentFolderId)?.name || 'This Folder'}`
                              }
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {settings.storageFolderId && (
                        <Button variant="outline" size="sm" onClick={clearStorageFolder}>
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  All content for {client.name} will be stored in this folder. Leave empty to use the default location.
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Custom Naming */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Custom File Naming</Label>
              <p className="text-xs text-gray-500">
                Use custom naming templates for this client&apos;s files
              </p>
            </div>
            <Switch
              checked={settings.customNaming || false}
              onCheckedChange={(checked) => handleSettingChange('customNaming', checked)}
            />
          </div>

          {/* Custom Naming Template */}
          {settings.customNaming && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Naming Template</Label>
              <Input
                placeholder="e.g., {client}_{date}_{type}"
                value={settings.namingTemplate || ''}
                onChange={(e) => handleSettingChange('namingTemplate', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Available variables: {'{client}'}, {'{date}'}, {'{type}'}, {'{title}'}
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Preview</Label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
              <div className="text-gray-600">
                📁 {settings.storageFolderPath || '/My Drive'}
                <br />
                └── 📁 {client.name}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;└── 📁 [2024-01-15] Product Launch
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 Hero Shot
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Behind Scenes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
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
    </div>
  )
} 