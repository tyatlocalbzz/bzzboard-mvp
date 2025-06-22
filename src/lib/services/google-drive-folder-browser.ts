// Google Drive Folder Browser Service
// Extracted from google-drive-enhanced.ts to reduce file size and improve maintainability

import { google } from 'googleapis'

export interface FolderBrowserItem {
  id: string
  name: string
  webViewLink: string
  isParent?: boolean
  path: string
  type?: 'my-drive-folder' | 'shared-drive' | 'folder'
}

export class GoogleDriveFolderBrowser {
  private drive: ReturnType<typeof google.drive>
  private pathCache = new Map<string, string>()
  private maxRetries = 3
  private baseDelay = 1000

  constructor(
    private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  ) {
    this.drive = google.drive({ 
      version: 'v3', 
      auth: this.oauth2Client,
      retry: true
    })
  }

  // Main browsing method
  async browseFolders(parentId?: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [FolderBrowser] Browsing folders...')
    console.log('📋 Browse parameters:', { parentId: parentId || 'root' })

    return this.retryWithBackoff(async () => {
      const folders: FolderBrowserItem[] = []

      // If at root level, show both My Drive folders and Shared Drives
      if (!parentId || parentId === 'root') {
        console.log('🏠 [FolderBrowser] At root level - showing My Drive and Shared Drives')
        
        // Get My Drive folders
        const myDriveFolders = await this.getMyDriveFolders()
        folders.push(...myDriveFolders)
        
        // Get Shared Drives
        const sharedDrives = await this.getSharedDrives()
        folders.push(...sharedDrives)
        
        console.log('📊 [FolderBrowser] Root level summary:', {
          myDriveFolders: myDriveFolders.length,
          sharedDrives: sharedDrives.length,
          total: folders.length
        })
        
        return folders
      }

      // For specific folder/drive navigation
      return this.getFolderContents(parentId)
    }, 'browseFolders')
  }

  // Get My Drive folders
  private async getMyDriveFolders(): Promise<FolderBrowserItem[]> {
    console.log('📁 [FolderBrowser] Getting My Drive folders...')
    
    const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,webViewLink)',
      orderBy: 'name',
      pageSize: 100
    })

    const folderPromises = response.data.files?.map(async (file) => {
      try {
        const path = `/My Drive/${file.name || 'Unknown'}`
        
        if (file.id) {
          this.pathCache.set(file.id, path)
        }
        
        return {
          id: file.id || '',
          name: file.name || '',
          webViewLink: file.webViewLink || '',
          path,
          type: 'my-drive-folder' as const
        }
      } catch {
        return {
          id: file.id || '',
          name: file.name || '',
          webViewLink: file.webViewLink || '',
          path: `/My Drive/${file.name || 'Unknown'}`,
          type: 'my-drive-folder' as const
        }
      }
    }) || []

    const folders = await Promise.all(folderPromises)
    console.log('📊 [FolderBrowser] My Drive folders found:', folders.length)
    return folders
  }

  // Get Shared Drives (Team Drives)
  private async getSharedDrives(): Promise<FolderBrowserItem[]> {
    console.log('🏢 [FolderBrowser] Getting Shared Drives...')
    
    try {
      const response = await this.drive.drives.list({
        fields: 'drives(id,name)',
        pageSize: 100
      })

      const sharedDrives = response.data.drives?.map(drive => {
        const path = `/Shared Drives/${drive.name || 'Unnamed'}`
        
        if (drive.id) {
          this.pathCache.set(drive.id, path)
        }
        
        return {
          id: drive.id || '',
          name: `📁 ${drive.name || 'Unnamed Shared Drive'} (Shared Drive)`,
          webViewLink: `https://drive.google.com/drive/folders/${drive.id}`,
          path,
          type: 'shared-drive' as const
        }
      }) || []

      console.log('📊 [FolderBrowser] Shared Drives found:', sharedDrives.length)
      return sharedDrives
    } catch (error) {
      console.error('❌ [FolderBrowser] Error fetching shared drives:', error)
      return []
    }
  }

  // Get contents of a specific folder
  private async getFolderContents(parentId: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [FolderBrowser] Getting folder contents for:', parentId)
    
    const folders: FolderBrowserItem[] = []
    
    // Add "Back to Root" option
    folders.push({
      id: 'root',
      name: '⬆️ Back to Root',
      webViewLink: '',
      isParent: true,
      path: '/Root'
    })

    // Check if this is a shared drive root
    const isSharedDrive = await this.isSharedDriveRoot(parentId)
    
    if (isSharedDrive) {
      console.log('📁 [FolderBrowser] Browsing shared drive root:', parentId)
      const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
        orderBy: 'name',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })

      const subfolders = response.data.files?.map(async (file) => {
        const path = await this.getFolderPath(file.id || '')
        return {
          id: file.id || '',
          name: file.name || '',
          webViewLink: file.webViewLink || '',
          path,
          type: 'folder' as const
        }
      }) || []

      const resolvedSubfolders = await Promise.all(subfolders)
      folders.push(...resolvedSubfolders)
    } else {
      console.log('📁 [FolderBrowser] Browsing regular folder:', parentId)
      const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
        orderBy: 'name',
        pageSize: 100
      })

      const subfolders = response.data.files?.map(async (file) => {
        const path = await this.getFolderPath(file.id || '')
        return {
          id: file.id || '',
          name: file.name || '',
          webViewLink: file.webViewLink || '',
          path,
          type: 'folder' as const
        }
      }) || []

      const resolvedSubfolders = await Promise.all(subfolders)
      folders.push(...resolvedSubfolders)
    }

    console.log('📊 [FolderBrowser] Folder contents found:', {
      parentId,
      isSharedDrive,
      subfolders: folders.length - 1 // Exclude "Back to Root"
    })

    return folders
  }

  // Check if a drive ID is a shared drive root
  private async isSharedDriveRoot(driveId: string): Promise<boolean> {
    try {
      await this.drive.drives.get({
        driveId: driveId,
        fields: 'id'
      })
      return true
    } catch {
      return false
    }
  }

  // Get folder path with caching and smart resolution
  async getFolderPath(folderId: string): Promise<string> {
    if (!folderId || folderId === 'root') {
      return '/My Drive'
    }

    // Check cache first
    if (this.pathCache.has(folderId)) {
      return this.pathCache.get(folderId)!
    }

    return this.retryWithBackoff(async () => {
      const path: string[] = []
      let currentId = folderId
      const visited = new Set<string>()

      while (currentId && currentId !== 'root' && !visited.has(currentId)) {
        visited.add(currentId)
        
        const response = await this.drive.files.get({
          fileId: currentId,
          fields: 'id,name,parents',
          supportsAllDrives: true
        })

        const folder = response.data
        if (folder.name) {
          path.unshift(folder.name)
        }

        currentId = folder.parents?.[0] || ''
        
        if (currentId === 'root') {
          break
        }
      }

      // Determine if this is in a shared drive or My Drive
      let fullPath: string
      if (currentId === 'root' || !currentId) {
        fullPath = `/My Drive/${path.join('/')}`
      } else {
        // Check if the parent is a shared drive
        const isSharedDriveParent = await this.isSharedDriveRoot(currentId)
        if (isSharedDriveParent) {
          const driveResponse = await this.drive.drives.get({
            driveId: currentId,
            fields: 'name'
          })
          const driveName = driveResponse.data.name || 'Unknown Drive'
          fullPath = `/Shared Drives/${driveName}/${path.join('/')}`
        } else {
          fullPath = `/My Drive/${path.join('/')}`
        }
      }

      // Cache the result
      this.pathCache.set(folderId, fullPath)
      return fullPath
    }, 'getFolderPath')
  }

  // Create a new folder
  async createFolder(folderName: string, parentId?: string): Promise<FolderBrowserItem> {
    console.log('📁 [FolderBrowser] Creating new folder...')
    console.log('📋 Parameters:', { folderName, parentId: parentId || 'root' })

    return this.retryWithBackoff(async () => {
      if (!folderName || folderName.trim().length === 0) {
        throw new Error('Folder name cannot be empty')
      }

      const sanitizedName = folderName.trim()
      
      // Check if folder already exists
      let query = `mimeType='application/vnd.google-apps.folder' and name='${sanitizedName.replace(/'/g, "\\'")}' and trashed=false`
      if (parentId && parentId !== 'root') {
        query += ` and '${parentId}' in parents`
      } else {
        query += ` and 'root' in parents`
      }

      const existingResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id,name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })

      if (existingResponse.data.files && existingResponse.data.files.length > 0) {
        throw new Error(`Folder "${sanitizedName}" already exists in this location`)
      }

      // Create the folder
      const fileMetadata = {
        name: sanitizedName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && parentId !== 'root' && { parents: [parentId] })
      }

      console.log('📄 Creating folder with metadata:', fileMetadata)

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name,webViewLink',
        supportsAllDrives: true
      })

      const newFolder = response.data

      // Construct path intelligently
      let path: string
      if (!parentId || parentId === 'root') {
        path = `/My Drive/${sanitizedName}`
      } else {
        // Get parent path and append folder name
        const parentPath = this.pathCache.get(parentId)
        if (parentPath) {
          path = `${parentPath}/${sanitizedName}`
        } else {
          // Fallback to getting full path
          const parentFullPath = await this.getFolderPath(parentId)
          path = `${parentFullPath}/${sanitizedName}`
        }
      }

      // Cache the new folder's path
      if (newFolder.id) {
        this.pathCache.set(newFolder.id, path)
      }

      const result: FolderBrowserItem = {
        id: newFolder.id || '',
        name: newFolder.name || sanitizedName,
        webViewLink: newFolder.webViewLink || '',
        path,
        type: 'folder'
      }

      console.log('✅ Folder created successfully:', result)
      return result
    }, 'createFolder')
  }

  // Retry logic with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const googleError = error as { code?: number; errors?: Array<{ reason?: string }> }
      const isRetryable = this.isRetryableError(googleError)
      
      if (isRetryable && retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount)
        console.log(`🔄 [FolderBrowser] Retrying ${context} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.retryWithBackoff(operation, context, retryCount + 1)
      }
      
      this.handleGoogleDriveError(googleError, context)
      throw error
    }
  }

  // Check if error is retryable
  private isRetryableError(error: { code?: number; errors?: Array<{ reason?: string }> }): boolean {
    if (!error.code) return false
    
    if (error.code === 403) {
      const reason = error.errors?.[0]?.reason
      return ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason || '')
    }
    
    return error.code >= 500 && error.code < 600
  }

  // Handle Google Drive specific errors
  private handleGoogleDriveError(error: { code?: number; errors?: Array<{ reason?: string }> }, context: string): void {
    console.error(`❌ [FolderBrowser] Error in ${context}:`, error)
    
    if (error.code === 401) {
      console.error('🔐 [FolderBrowser] Authentication error - token may be expired')
    } else if (error.code === 403) {
      const reason = error.errors?.[0]?.reason
      switch (reason) {
        case 'insufficientFilePermissions':
          console.error('🚫 [FolderBrowser] Insufficient permissions for file')
          break
        case 'rateLimitExceeded':
        case 'userRateLimitExceeded':
          console.error('⏰ [FolderBrowser] Rate limit exceeded')
          break
        default:
          console.error('🚫 [FolderBrowser] Forbidden error:', reason)
      }
    } else if (error.code === 404) {
      console.error('🔍 [FolderBrowser] File or folder not found')
    }
  }
} 