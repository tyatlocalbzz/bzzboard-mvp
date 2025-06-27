'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Folder, 
  FolderPlus,
  ChevronRight, 
  Home, 
  ArrowLeft,
  Check,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export interface FolderBrowserItem {
  id: string
  name: string
  webViewLink: string
  isParent?: boolean
  path: string
  type?: 'my-drive-folder' | 'shared-drive' | 'folder'
}

interface FolderBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onFolderSelect: (folder: FolderBrowserItem) => void
  onBrowseFolders?: (parentId?: string) => Promise<FolderBrowserItem[]>
  onCreateFolder?: (folderName: string, parentId?: string) => Promise<void>
  showCreateFolder?: boolean
  initialParentId?: string
  initialPath?: string
}

export const FolderBrowserDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onFolderSelect,
  onBrowseFolders,
  onCreateFolder,
  showCreateFolder = true,
  initialParentId,
  initialPath
}: FolderBrowserDialogProps) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>('root')
  const [folders, setFolders] = useState<FolderBrowserItem[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [currentPath, setCurrentPath] = useState<string>('/My Drive')
  const [currentFolderName, setCurrentFolderName] = useState<string>('My Drive')
  
  // Navigation history to track folder hierarchy
  const [navigationHistory, setNavigationHistory] = useState<Array<{id: string, name: string, path: string}>>([])
  
  // New folder creation states
  const [showCreateFolderForm, setShowCreateFolderForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Load folders when browser opens or folder changes
  const loadFolders = useCallback(async (folderId: string) => {
    if (!onBrowseFolders) return

    setIsLoadingFolders(true)
    try {
      console.log('📂 [FolderBrowserDialog] Loading folders for:', folderId)
      const folderList = await onBrowseFolders(folderId === 'root' ? undefined : folderId)
      setFolders(folderList)
      console.log('📊 [FolderBrowserDialog] Loaded folders:', folderList.length)
      
      // Don't override the path if it was already set during navigation
      // The path should be set in handleFolderSelect when navigating
      console.log('📂 [FolderBrowserDialog] Current path after loading:', currentPath)
      
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders')
    } finally {
      setIsLoadingFolders(false)
    }
  }, [onBrowseFolders, currentPath])

  // Effect to handle dialog opening and initial setup
  useEffect(() => {
    if (open) {
      // Set initial folder when dialog opens
      const targetFolderId = initialParentId || 'root'
      setCurrentFolderId(targetFolderId)
      
      // Set the path and folder name if we have an initial path
      if (initialPath) {
        setCurrentPath(initialPath)
        setCurrentFolderName(initialPath.split('/').pop() || 'Selected Folder')
      } else if (!initialParentId) {
        setCurrentPath('/My Drive')
        setCurrentFolderName('My Drive')
      }
      
      // Reset navigation history when dialog opens
      setNavigationHistory([])
      
      // Reset create folder state when dialog opens
      setShowCreateFolderForm(false)
      setNewFolderName('')
    }
  }, [open, initialParentId, initialPath])

  // Effect to load folders when currentFolderId changes
  useEffect(() => {
    if (open && onBrowseFolders && currentFolderId) {
      loadFolders(currentFolderId)
    }
  }, [open, currentFolderId, loadFolders, onBrowseFolders]) // Removed currentPath dependency to prevent loops

  // Create new folder function
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    if (!onCreateFolder) {
      toast.error('Folder creation not available')
      return
    }

    setIsCreatingFolder(true)
    try {
      await onCreateFolder(newFolderName.trim(), currentFolderId === 'root' ? undefined : currentFolderId)
      toast.success(`Folder "${newFolderName}" created successfully`)
      setNewFolderName('')
      setShowCreateFolderForm(false)
      // Refresh the folder list
      await loadFolders(currentFolderId)
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleFolderSelect = (folder: FolderBrowserItem) => {
    if (folder.isParent) {
      // Navigate back one level using navigation history
      if (navigationHistory.length > 0) {
        const previousFolder = navigationHistory[navigationHistory.length - 1]
        setCurrentFolderId(previousFolder.id)
        setCurrentPath(previousFolder.path)
        setCurrentFolderName(previousFolder.name)
        // Remove the last item from history
        setNavigationHistory(prev => prev.slice(0, -1))
      } else {
        // If no history, go to root
        setCurrentFolderId('root')
        setCurrentPath('/My Drive')
        setCurrentFolderName('My Drive')
      }
    } else {
      // Navigate into folder or shared drive to see its contents
      // Add current folder to navigation history before navigating
      const currentFolderName = currentFolderId === 'root' ? 'My Drive' : currentPath.split('/').pop() || 'Unknown'
      const currentFolderInfo = {
        id: currentFolderId,
        name: currentFolderName,
        path: currentPath
      }
      setNavigationHistory(prev => [...prev, currentFolderInfo])
      
      // Update current folder and path
      setCurrentFolderId(folder.id)
      setCurrentPath(folder.path)
      setCurrentFolderName(folder.name)
      
      // The useEffect will automatically load the folder contents when currentFolderId changes
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
      // Use the tracked current folder name
      selectedFolder = {
        id: currentFolderId,
        name: currentFolderName,
        path: currentPath,
        webViewLink: ''
      }
    }
    
    onFolderSelect(selectedFolder)
    onOpenChange(false)
    // Don't show toast here - let the parent component handle success messages
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Current Path */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
            <Home className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700 truncate">
              {currentPath}
            </span>
          </div>

          {/* Create Folder Section */}
          {showCreateFolder && onCreateFolder && (
            <div className="border rounded-lg p-3">
              {!showCreateFolderForm ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Create new folder</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateFolderForm(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    Create
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
                          setShowCreateFolderForm(false)
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
                      {isCreatingFolder ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateFolderForm(false)
                        setNewFolderName('')
                      }}
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700">
                    Folder will be created in: {currentPath}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Folder List */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 max-h-60">
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-500">Loading folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No folders found
                </div>
              ) : (
                folders.map((folder) => {
                  // Don't show the "Back to Root" item if we have navigation history
                  if (folder.isParent && currentFolderId !== 'root') {
                    const backToFolder = navigationHistory.length > 0 
                      ? navigationHistory[navigationHistory.length - 1]
                      : { name: 'My Drive', path: '/My Drive' }
                    
                    return (
                      <button
                        key={folder.id}
                        onClick={() => handleFolderSelect(folder)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4 text-gray-400" />
                        <span className="text-sm flex-1 truncate">
                          ⬆️ Back to {backToFolder.name}
                        </span>
                      </button>
                    )
                  }
                  
                  // Skip the "Back to Root" item at root level
                  if (folder.isParent && currentFolderId === 'root') {
                    return null
                  }
                  
                  return (
                    <button
                      key={folder.id}
                      onClick={() => handleFolderSelect(folder)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    >
                      {folder.type === 'shared-drive' ? (
                        <div className="flex items-center gap-1">
                          <Folder className="h-4 w-4 text-purple-600" />
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                            Team
                          </Badge>
                        </div>
                      ) : (
                        <Folder className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-sm flex-1 truncate">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  )
                }).filter(Boolean)
              )}
            </div>
          </div>
        </div>
        
        {/* Dialog Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelectCurrentFolder}
            className="flex-1"
          >
            {currentFolderId === 'root' 
              ? 'Select My Drive Root' 
              : `Select "${currentFolderName}"`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 