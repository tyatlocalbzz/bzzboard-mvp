import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { FolderBrowserItem } from '@/components/ui/folder-browser-dialog'

/**
 * Reusable hook for Google Drive folder browsing
 * Eliminates duplication across StorageSetupStep, ClientStorageSettingsForm, 
 * GoogleDriveSettings, and other components
 */
export const useFolderBrowser = () => {
  // Request deduplication cache to prevent multiple simultaneous requests
  const pendingRequests = useRef<Map<string, Promise<FolderBrowserItem[]>>>(new Map())

  const browseFolders = useCallback(async (parentId?: string): Promise<FolderBrowserItem[]> => {
    const requestKey = parentId || 'root'
    
    // Check if we already have a pending request for this folder
    if (pendingRequests.current.has(requestKey)) {
      console.log('🔄 [useFolderBrowser] Request already pending for:', requestKey)
      return pendingRequests.current.get(requestKey)!
    }
    // Create the request promise and cache it
    const requestPromise = (async (): Promise<FolderBrowserItem[]> => {
      try {
        console.log('📂 [useFolderBrowser] Making API request for:', requestKey)
        const response = await fetch(`/api/integrations/google-drive/browse?parentId=${parentId || 'root'}`)

        if (response.ok) {
          const data = await response.json()
          
          // Handle standardized API format: { success: true, data: { folders: [...] } }
          if (data.success && data.data?.folders) {
            return data.data.folders
          }
          
          // Fallback for legacy format
          return data.folders || []
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Error response:', errorData)
          
          if (response.status === 401) {
            toast.error('Google Drive authentication expired. Please reconnect in the Integrations tab.')
          } else if (response.status === 400) {
            toast.error('Google Drive not properly connected. Please check your integration settings.')
          } else {
            const errorMessage = errorData.error || errorData.message || 'Unknown error'
            toast.error(`Failed to load folders: ${errorMessage}`)
          }
          
          return []
        }
      } catch (error) {
        console.error('Error loading folders:', error)
        toast.error('Failed to load folders. Please check your Google Drive connection.')
        return []
      } finally {
        // Clean up the pending request when done
        pendingRequests.current.delete(requestKey)
      }
    })()

    // Cache the promise
    pendingRequests.current.set(requestKey, requestPromise)
    
    return requestPromise
  }, [])

  const createFolder = useCallback(async (folderName: string, parentId?: string): Promise<void> => {
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
      // Handle standardized error format
      const errorMessage = data.error || data.message || 'Failed to create folder'
      throw new Error(errorMessage)
    }

    // Success - standardized format doesn't require additional handling for void return
  }, [])

  return {
    browseFolders,
    createFolder
  }
} 