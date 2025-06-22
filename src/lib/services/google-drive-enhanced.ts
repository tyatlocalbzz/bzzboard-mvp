import { google } from 'googleapis'
import { GoogleDriveSettings } from '@/lib/types/settings'

export interface DriveFolder {
  id: string
  name: string
  webViewLink: string
  path?: string
}

export interface DriveFile {
  id: string
  name: string
  size: string
  mimeType: string
  webViewLink: string
  webContentLink: string
}

export interface UploadProgress {
  uploadedBytes: number
  totalBytes: number
  percentage: number
}

export interface FolderBrowserItem {
  id: string
  name: string
  webViewLink: string
  isParent?: boolean
  path: string
  type?: 'my-drive-folder' | 'shared-drive' | 'folder'
}

export class EnhancedGoogleDriveService {
  private drive: ReturnType<typeof google.drive>
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  private parentFolderId?: string
  private settings?: GoogleDriveSettings
  private maxRetries = 3
  private baseDelay = 1000 // 1 second base delay for exponential backoff

  constructor(accessToken: string, refreshToken?: string, settings?: GoogleDriveSettings) {
    this.oauth2Client = new google.auth.OAuth2()
    this.oauth2Client.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    this.drive = google.drive({ 
      version: 'v3', 
      auth: this.oauth2Client,
      // Add retry configuration
      retry: true
    })
    
    this.settings = settings
    this.parentFolderId = settings?.parentFolderId
  }

  // Exponential backoff retry logic for API calls
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
        console.log(`🔄 [GoogleDriveService] Retrying ${context} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.retryWithBackoff(operation, context, retryCount + 1)
      }
      
      // Handle specific Google Drive errors
      this.handleGoogleDriveError(googleError, context)
      throw error
    }
  }

  // Check if error is retryable (rate limiting, temporary server errors)
  private isRetryableError(error: { code?: number; errors?: Array<{ reason?: string }> }): boolean {
    if (!error.code) return false
    
    // Retry on rate limiting (403 with specific reasons) and server errors (5xx)
    if (error.code === 403) {
      const reason = error.errors?.[0]?.reason
      return ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason || '')
    }
    
    return error.code >= 500 && error.code < 600
  }

  // Handle Google Drive specific errors with meaningful messages
  private handleGoogleDriveError(error: { code?: number; errors?: Array<{ reason?: string }> }, context: string): void {
    console.error(`❌ [GoogleDriveService] Error in ${context}:`, error)
    
    if (error.code === 401) {
      console.error('🔐 [GoogleDriveService] Authentication error - token may be expired')
    } else if (error.code === 403) {
      const reason = error.errors?.[0]?.reason
      switch (reason) {
        case 'insufficientFilePermissions':
          console.error('🚫 [GoogleDriveService] Insufficient permissions for file')
          break
        case 'rateLimitExceeded':
        case 'userRateLimitExceeded':
          console.error('⏰ [GoogleDriveService] Rate limit exceeded')
          break
        case 'storageQuotaExceeded':
          console.error('💾 [GoogleDriveService] Storage quota exceeded')
          break
        case 'activeItemCreationLimitExceeded':
          console.error('📁 [GoogleDriveService] Too many items created (500M limit)')
          break
        default:
          console.error('🚫 [GoogleDriveService] Forbidden error:', reason)
      }
    } else if (error.code === 404) {
      console.error('🔍 [GoogleDriveService] File or folder not found')
    } else if (error.code && error.code >= 500) {
      console.error('🔧 [GoogleDriveService] Server error - will retry')
    }
  }

  // Method to browse and select parent folder with improved error handling
  async browseFolders(parentId?: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [EnhancedGoogleDriveService] Browsing folders...')
    console.log('📋 Browse parameters:', { parentId: parentId || 'root' })

    return this.retryWithBackoff(async () => {
      const folders: FolderBrowserItem[] = []

      // If at root level, show both My Drive folders and Shared Drives
      if (!parentId || parentId === 'root') {
        console.log('🏠 [EnhancedGoogleDriveService] At root level - showing My Drive and Shared Drives')
        
        // Get My Drive folders
        const myDriveFolders = await this.getMyDriveFolders()
        folders.push(...myDriveFolders)
        
        // Get Shared Drives
        const sharedDrives = await this.getSharedDrives()
        folders.push(...sharedDrives)
        
        console.log('📊 [EnhancedGoogleDriveService] Root level summary:', {
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
    console.log('📁 [EnhancedGoogleDriveService] Getting My Drive folders...')
    
    const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,webViewLink)',
      orderBy: 'name',
      pageSize: 100
    })

    // Use consistent path resolution for all folders
    const folderPromises = response.data.files?.map(async (file) => {
      try {
        // For root-level folders, we know they're directly under My Drive
        const path = `/My Drive/${file.name || 'Unknown'}`
        
        // Cache this path to avoid duplicate resolution later
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
    console.log('📊 [EnhancedGoogleDriveService] My Drive folders found:', folders.length)
    return folders
  }

  // Get Shared Drives (Team Drives)
  private async getSharedDrives(): Promise<FolderBrowserItem[]> {
    console.log('🏢 [EnhancedGoogleDriveService] Getting Shared Drives...')
    
    try {
      const response = await this.drive.drives.list({
        fields: 'drives(id,name)',
        pageSize: 100
      })

      const sharedDrives = response.data.drives?.map(drive => {
        const path = `/Shared Drives/${drive.name || 'Unnamed'}`
        
        // Cache this path to avoid duplicate resolution later
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

      console.log('📊 [EnhancedGoogleDriveService] Shared Drives found:', sharedDrives.length)
      return sharedDrives
    } catch (error) {
      console.warn('⚠️ [EnhancedGoogleDriveService] Could not fetch shared drives (may not have access):', error)
      return []
    }
  }

  // Get contents of a specific folder or shared drive
  private async getFolderContents(parentId: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [EnhancedGoogleDriveService] Getting folder contents for:', parentId)
    
    const folders: FolderBrowserItem[] = []

    // Add parent navigation option
    folders.push({
      id: 'root',
      name: '⬆️ Back to Root',
      webViewLink: '',
      isParent: true,
      path: '/Root'
    })

    // Check if this is a shared drive root
    const isSharedDriveRoot = await this.isSharedDriveRoot(parentId)
    
    let query: string
    let driveId: string | undefined

    if (isSharedDriveRoot) {
      // For shared drive root, list folders in the shared drive
      query = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
      driveId = parentId
      console.log('🏢 [EnhancedGoogleDriveService] Browsing shared drive root:', parentId)
    } else {
      // For regular folders, list subfolders
      query = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
      console.log('📁 [EnhancedGoogleDriveService] Browsing regular folder:', parentId)
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,webViewLink,parents)',
      orderBy: 'name',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(driveId && { driveId, corpora: 'drive' })
    })

    // Process subfolders
    if (response.data.files && response.data.files.length > 0) {
      const folderPromises = response.data.files.map(async (file) => {
        try {
          const path = await this.getFolderPath(file.id || '')
          return {
            id: file.id || '',
            name: file.name || '',
            webViewLink: file.webViewLink || '',
            path
          }
        } catch {
          console.warn(`⚠️ [EnhancedGoogleDriveService] Could not get path for folder ${file.name}`)
          return {
            id: file.id || '',
            name: file.name || '',
            webViewLink: file.webViewLink || '',
            path: `/${file.name || 'Unknown'}`
          }
        }
      })

      const resolvedFolders = await Promise.all(folderPromises)
      folders.push(...resolvedFolders)
    }

    console.log('📊 [EnhancedGoogleDriveService] Folder contents found:', {
      parentId,
      isSharedDrive: isSharedDriveRoot,
      subfolders: folders.length - 1 // Subtract 1 for the "Back to Root" item
    })

    return folders
  }

  // Check if a given ID is a shared drive root
  private async isSharedDriveRoot(driveId: string): Promise<boolean> {
    try {
      const response = await this.drive.drives.get({
        driveId: driveId,
        fields: 'id'
      })
      return !!response.data.id
    } catch {
      // If we can't get drive info, it's probably not a shared drive root
      return false
    }
  }

  // Optimized folder path resolution with caching
  private pathCache = new Map<string, string>()
  
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
      let isSharedDrive = false
      const visited = new Set<string>() // Prevent infinite loops

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

        // Move to parent folder
        currentId = folder.parents?.[0] || ''
        
        // Check if we've reached a shared drive root
        if (currentId && await this.isSharedDriveRoot(currentId)) {
          const driveResponse = await this.drive.drives.get({
            driveId: currentId,
            fields: 'name'
          })
          if (driveResponse.data.name) {
            path.unshift(driveResponse.data.name)
          }
          isSharedDrive = true
          break
        }
        
        if (currentId === 'root' || !currentId) break
      }

      // Build the full path based on drive type
      let fullPath: string
      if (isSharedDrive) {
        fullPath = path.length > 0 ? `/Shared Drives/${path.join('/')}` : '/Shared Drives'
      } else {
        fullPath = path.length > 0 ? `/My Drive/${path.join('/')}` : '/My Drive'
      }
      
      // Cache the result
      this.pathCache.set(folderId, fullPath)
      
      console.log(`🗂️ [GoogleDriveService] Resolved path for ${folderId}: ${fullPath}`)
      return fullPath
    }, `getFolderPath(${folderId})`)
  }

  // Create folder with improved error handling and conflict resolution
  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    console.log('🔍 [EnhancedGoogleDriveService] Finding or creating folder...')
    console.log('📋 Folder parameters:', { folderName, parentId })
    
    return this.retryWithBackoff(async () => {
      // Search for existing folder with optimized query
      let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`
      if (parentId && parentId !== 'root') {
        query += ` and '${parentId}' in parents`
      } else {
        query += ` and 'root' in parents`
      }

      console.log('🔎 Search query:', query)

      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
        pageSize: 10, // Small page size since we expect few results
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })

      // If folder exists, return it
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const existingFolder = searchResponse.data.files[0]
        console.log('✅ Found existing folder:', {
          id: existingFolder.id,
          name: existingFolder.name
        })
        
        return {
          id: existingFolder.id || '',
          name: existingFolder.name || folderName,
          webViewLink: existingFolder.webViewLink || ''
        }
      }

      // Create new folder with proper metadata
      console.log('➕ Creating new folder...')
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && parentId !== 'root' && { parents: [parentId] })
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name,webViewLink',
        supportsAllDrives: true
      })

      console.log('✅ New folder created:', {
        id: response.data.id,
        name: response.data.name
      })

      return {
        id: response.data.id || '',
        name: response.data.name || folderName,
        webViewLink: response.data.webViewLink || ''
      }
    }, `findOrCreateFolder(${folderName})`)
  }

  // Refresh access token if needed
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const tokens = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(tokens.credentials)
      console.log('🔄 [GoogleDriveService] Access token refreshed successfully')
      return true
    } catch (error) {
      console.error('❌ [GoogleDriveService] Failed to refresh access token:', error)
      return false
    }
  }

  // Health check method to verify API connectivity
  async healthCheck(): Promise<boolean> {
    try {
      await this.retryWithBackoff(async () => {
        await this.drive.about.get({
          fields: 'user(displayName,emailAddress)'
        })
      }, 'healthCheck')
      
      console.log('✅ [GoogleDriveService] Health check passed')
      return true
    } catch (error) {
      console.error('❌ [GoogleDriveService] Health check failed:', error)
      return false
    }
  }

  // Create a new folder for business organization
  async createBusinessFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    console.log('🏢 [EnhancedGoogleDriveService] Creating business folder...')
    console.log('📋 Parameters:', { folderName, parentId })

    const folder = await this.findOrCreateFolder(folderName, parentId)
    const path = await this.getFolderPath(folder.id)
    
    return {
      ...folder,
      path
    }
  }

  // Enhanced method to create client folder with configurable parent
  private async createClientFolder(clientName: string): Promise<DriveFolder> {
    console.log('🏢 [EnhancedGoogleDriveService] Creating client folder with settings...')
    console.log('📋 Client folder parameters:', { 
      clientName, 
      useParentFolder: !!this.parentFolderId,
      parentFolderId: this.parentFolderId,
      settings: this.settings 
    })

    let parentId = this.parentFolderId

    // If auto-create year folders is enabled, create/find year folder first
    if (this.settings?.autoCreateYearFolders) {
      const currentYear = new Date().getFullYear().toString()
      console.log('📅 [EnhancedGoogleDriveService] Auto-creating year folder:', currentYear)
      
      const yearFolder = await this.findOrCreateFolder(currentYear, this.parentFolderId)
      parentId = yearFolder.id
      console.log('✅ Year folder ready:', { 
        id: yearFolder.id, 
        name: yearFolder.name 
      })
    }

    // Apply naming pattern
    let folderName = clientName
    if (this.settings?.folderNamingPattern === 'year-client') {
      const year = new Date().getFullYear()
      folderName = `${year} - ${clientName}`
    } else if (this.settings?.folderNamingPattern === 'custom' && this.settings?.customNamingTemplate) {
      folderName = this.settings.customNamingTemplate
        .replace('{client}', clientName)
        .replace('{year}', new Date().getFullYear().toString())
        .replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
    }

    console.log('📁 Final client folder name:', folderName)
    console.log('📂 Parent folder ID:', parentId || 'root')

    // Create the client folder
    const clientFolder = await this.findOrCreateFolder(folderName, parentId)
    console.log('✅ Client folder created/found:', {
      id: clientFolder.id,
      name: clientFolder.name,
      parentId: parentId || 'root'
    })

    return clientFolder
  }

  // Create folder structure: [Parent]/Client Name/[YYYY-MM-DD] Shoot Title/
  async createShootFolder(clientName: string, shootTitle: string, shootDate: string): Promise<DriveFolder> {
    console.log('🗂️  [EnhancedGoogleDriveService] Creating shoot folder structure...')
    console.log('📋 Input parameters:', { clientName, shootTitle, shootDate })
    
    // Format date for folder name
    const formattedDate = new Date(shootDate).toISOString().split('T')[0]
    const shootFolderName = `[${formattedDate}] ${shootTitle}`
    console.log('📅 Formatted shoot folder name:', shootFolderName)

    // Create client folder using enhanced method with settings
    console.log('🔍 Step 1: Creating client folder with settings...')
    const clientFolder = await this.createClientFolder(clientName)
    console.log('✅ Client folder created/found:', { 
      id: clientFolder.id, 
      name: clientFolder.name, 
      webViewLink: clientFolder.webViewLink 
    })
    
    // Then create shoot folder inside client folder
    console.log('🔍 Step 2: Creating shoot folder inside client folder...')
    console.log('📂 Parent folder ID:', clientFolder.id)
    const shootFolder = await this.findOrCreateFolder(shootFolderName, clientFolder.id)
    console.log('✅ Shoot folder created/found:', { 
      id: shootFolder.id, 
      name: shootFolder.name, 
      webViewLink: shootFolder.webViewLink,
      parentId: clientFolder.id
    })
    
    console.log('🎉 Shoot folder structure created successfully!')
    return shootFolder
  }

  // Update settings
  updateSettings(newSettings: GoogleDriveSettings) {
    this.settings = newSettings
    this.parentFolderId = newSettings.parentFolderId
    console.log('⚙️ [EnhancedGoogleDriveService] Settings updated:', newSettings)
  }

  // Get current settings
  getSettings(): GoogleDriveSettings | undefined {
    return this.settings
  }

  // Public method to create a new folder in a specific location
  async createFolder(folderName: string, parentId?: string): Promise<FolderBrowserItem> {
    console.log('📁 [EnhancedGoogleDriveService] Creating new folder...')
    console.log('📋 Parameters:', { folderName, parentId: parentId || 'root' })

    return this.retryWithBackoff(async () => {
      // Validate folder name
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
        pageSize: 1,
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
      if (!newFolder.id || !newFolder.name) {
        throw new Error('Failed to create folder - invalid response from Google Drive')
      }

      // Construct path intelligently without calling getFolderPath
      let path: string
      if (!parentId || parentId === 'root') {
        // New folder at root level
        path = `/My Drive/${sanitizedName}`
      } else {
        // New folder inside existing folder - get parent path from cache or construct
        const parentPath = this.pathCache.get(parentId)
        if (parentPath) {
          path = `${parentPath}/${sanitizedName}`
        } else {
          // Fallback to full path resolution only if parent path not cached
          path = await this.getFolderPath(newFolder.id)
        }
      }

      // Cache the new folder's path
      this.pathCache.set(newFolder.id, path)

      console.log('✅ Folder created successfully:', {
        id: newFolder.id,
        name: newFolder.name,
        path
      })

      return {
        id: newFolder.id,
        name: newFolder.name,
        webViewLink: newFolder.webViewLink || '',
        path,
        type: 'folder'
      }
    }, `createFolder(${folderName})`)
  }
} 