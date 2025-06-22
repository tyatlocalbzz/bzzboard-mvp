import { google } from 'googleapis'
import { Readable } from 'stream'
import { GoogleDriveSettings } from '@/lib/types/settings'

// Unified interfaces
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

export interface GoogleDriveError {
  code?: number
  errors?: Array<{ reason?: string }>
  message?: string
}

/**
 * Unified Google Drive Service
 * Consolidates functionality from google-drive.ts, google-drive-enhanced.ts, and google-drive-folder-browser.ts
 * Applies DRY principles to eliminate code duplication
 */
export class UnifiedGoogleDriveService {
  private drive: ReturnType<typeof google.drive>
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  private settings?: GoogleDriveSettings
  private pathCache = new Map<string, string>()
  
  // Configuration
  private readonly maxRetries = 3
  private readonly baseDelay = 1000
  private readonly pageSize = 100

  constructor(accessToken: string, refreshToken?: string, settings?: GoogleDriveSettings) {
    this.oauth2Client = new google.auth.OAuth2()
    this.oauth2Client.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    this.drive = google.drive({ 
      version: 'v3', 
      auth: this.oauth2Client,
      retry: true
    })
    
    this.settings = settings
  }

  // ===========================================
  // CORE UTILITY METHODS
  // ===========================================

  /**
   * Exponential backoff retry logic for API calls
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const googleError = error as GoogleDriveError
      const isRetryable = this.isRetryableError(googleError)
      
      if (isRetryable && retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount)
        console.log(`🔄 [GoogleDriveService] Retrying ${context} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.retryWithBackoff(operation, context, retryCount + 1)
      }
      
      this.handleGoogleDriveError(googleError, context)
      throw error
    }
  }

  /**
   * Check if error is retryable (rate limiting, temporary server errors)
   */
  private isRetryableError(error: GoogleDriveError): boolean {
    if (!error.code) return false
    
    // Retry on rate limiting (403 with specific reasons) and server errors (5xx)
    if (error.code === 403) {
      const reason = error.errors?.[0]?.reason
      return ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason || '')
    }
    
    return error.code >= 500 && error.code < 600
  }

  /**
   * Handle Google Drive specific errors with meaningful messages
   */
  private handleGoogleDriveError(error: GoogleDriveError, context: string): void {
    console.error(`❌ [GoogleDriveService] Error in ${context}:`, error)
    
    const errorMessages = {
      401: '🔐 Authentication error - token may be expired',
      403: this.get403ErrorMessage(error.errors?.[0]?.reason),
      404: '🔍 File or folder not found',
      500: '🔧 Server error - will retry'
    }

    const message = errorMessages[error.code as keyof typeof errorMessages]
    if (message) {
      console.error(`[GoogleDriveService] ${message}`)
    }
  }

  private get403ErrorMessage(reason?: string): string {
    const reasonMessages = {
      insufficientFilePermissions: '🚫 Insufficient permissions for file',
      rateLimitExceeded: '⏰ Rate limit exceeded',
      userRateLimitExceeded: '⏰ User rate limit exceeded',
      storageQuotaExceeded: '💾 Storage quota exceeded',
      activeItemCreationLimitExceeded: '📁 Too many items created (500M limit)'
    }
    
    return reasonMessages[reason as keyof typeof reasonMessages] || `🚫 Forbidden error: ${reason}`
  }

  /**
   * Build folder query with common parameters
   */
  private buildFolderQuery(parentId?: string, additionalConditions?: string): string {
    let query = `mimeType='application/vnd.google-apps.folder' and trashed=false`
    
    if (parentId && parentId !== 'root') {
      query += ` and '${parentId}' in parents`
    } else if (!parentId || parentId === 'root') {
      query += ` and 'root' in parents`
    }
    
    if (additionalConditions) {
      query += ` and ${additionalConditions}`
    }
    
    return query
  }

  // ===========================================
  // FOLDER BROWSING METHODS
  // ===========================================

  /**
   * Main browsing method - unified entry point
   */
  async browseFolders(parentId?: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [GoogleDriveService] Browsing folders...')
    console.log('📋 Browse parameters:', { parentId: parentId || 'root' })

    return this.retryWithBackoff(async () => {
      // Root level: show My Drive folders + Shared Drives
      if (!parentId || parentId === 'root') {
        return this.getRootLevelFolders()
      }

      // Specific folder/drive navigation
      return this.getFolderContents(parentId)
    }, 'browseFolders')
  }

  /**
   * Get root level folders (My Drive + Shared Drives)
   */
  private async getRootLevelFolders(): Promise<FolderBrowserItem[]> {
    console.log('🏠 [GoogleDriveService] Getting root level folders')
    
    const [myDriveFolders, sharedDrives] = await Promise.all([
      this.getMyDriveFolders(),
      this.getSharedDrives()
    ])
    
    const allFolders = [...myDriveFolders, ...sharedDrives]
    
    console.log('📊 [GoogleDriveService] Root level summary:', {
      myDriveFolders: myDriveFolders.length,
      sharedDrives: sharedDrives.length,
      total: allFolders.length
    })
    
    return allFolders
  }

  /**
   * Get My Drive folders with path caching
   */
  private async getMyDriveFolders(): Promise<FolderBrowserItem[]> {
    console.log('📁 [GoogleDriveService] Getting My Drive folders...')
    
    const response = await this.drive.files.list({
      q: this.buildFolderQuery('root'),
      fields: 'files(id,name,webViewLink)',
      orderBy: 'name',
      pageSize: this.pageSize
    })

    const folders = response.data.files?.map((file) => {
      const path = `/My Drive/${file.name || 'Unknown'}`
      
      // Cache path for later use
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
    }) || []

    console.log('📊 [GoogleDriveService] My Drive folders found:', folders.length)
    return folders
  }

  /**
   * Get Shared Drives (Team Drives) with error handling
   */
  private async getSharedDrives(): Promise<FolderBrowserItem[]> {
    console.log('🏢 [GoogleDriveService] Getting Shared Drives...')
    
    try {
      const response = await this.drive.drives.list({
        fields: 'drives(id,name)',
        pageSize: this.pageSize
      })

      const sharedDrives = response.data.drives?.map(drive => {
        const path = `/Shared Drives/${drive.name || 'Unnamed'}`
        
        // Cache path for later use
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

      console.log('📊 [GoogleDriveService] Shared Drives found:', sharedDrives.length)
      return sharedDrives
    } catch (error) {
      console.warn('⚠️ [GoogleDriveService] Could not fetch shared drives (may not have access):', error)
      return []
    }
  }

  /**
   * Get contents of a specific folder or shared drive
   */
  private async getFolderContents(parentId: string): Promise<FolderBrowserItem[]> {
    console.log('📂 [GoogleDriveService] Getting folder contents for:', parentId)
    
    const folders: FolderBrowserItem[] = []

    // Add back navigation
    folders.push({
      id: 'root',
      name: '⬆️ Back to Root',
      webViewLink: '',
      isParent: true,
      path: '/Root'
    })

    const isSharedDrive = await this.isSharedDriveRoot(parentId)
    const queryOptions = this.getQueryOptionsForFolder(parentId, isSharedDrive)
    
    const response = await this.drive.files.list(queryOptions)

    // Process subfolders with path resolution
    const subfolderPromises = response.data.files?.map(async (file) => {
      const path = await this.getFolderPath(file.id || '')
      return {
        id: file.id || '',
        name: file.name || '',
        webViewLink: file.webViewLink || '',
        path,
        type: 'folder' as const
      }
    }) || []

    const subfolders = await Promise.all(subfolderPromises)
    folders.push(...subfolders)

    console.log('📊 [GoogleDriveService] Folder contents found:', {
      parentId,
      isSharedDrive,
      subfolders: subfolders.length
    })

    return folders
  }

  /**
   * Get query options for different folder types
   */
  private getQueryOptionsForFolder(parentId: string, isSharedDrive: boolean) {
    const baseOptions = {
      q: this.buildFolderQuery(parentId),
      fields: 'files(id,name,webViewLink)',
      orderBy: 'name',
      pageSize: this.pageSize
    }

    if (isSharedDrive) {
      return {
        ...baseOptions,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: parentId,
        corpora: 'drive' as const
      }
    }

    return baseOptions
  }

  /**
   * Check if a drive ID is a shared drive root
   */
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

  // ===========================================
  // PATH RESOLUTION METHODS
  // ===========================================

  /**
   * Get folder path with caching and smart resolution
   */
  async getFolderPath(folderId: string): Promise<string> {
    if (!folderId || folderId === 'root') {
      return '/My Drive'
    }

    // Check cache first
    const cachedPath = this.pathCache.get(folderId)
    if (cachedPath) {
      return cachedPath
    }

    console.log('🗂️ [GoogleDriveService] Resolving folder path for:', folderId)

    try {
      const path = await this.buildFolderPath(folderId)
      this.pathCache.set(folderId, path)
      return path
    } catch (error) {
      console.error('❌ [GoogleDriveService] Error getting folder path:', error)
      return '/Unknown Path'
    }
  }

  /**
   * Build folder path by traversing parent hierarchy
   */
  private async buildFolderPath(folderId: string): Promise<string> {
    const pathSegments: string[] = []
    let currentId = folderId

    while (currentId && currentId !== 'root') {
      const response = await this.drive.files.get({
        fileId: currentId,
        fields: 'id,name,parents',
        supportsAllDrives: true
      })

      const folder = response.data
      if (folder.name) {
        pathSegments.unshift(folder.name)
      }

      // Move to parent folder
      currentId = folder.parents?.[0] || ''
      if (currentId === 'root') break
    }

    const fullPath = pathSegments.length > 0 ? `/My Drive/${pathSegments.join('/')}` : '/My Drive'
    console.log('📂 [GoogleDriveService] Resolved path:', fullPath)
    return fullPath
  }

  // ===========================================
  // FOLDER CREATION METHODS
  // ===========================================

  /**
   * Create folder with smart path construction
   */
  async createFolder(folderName: string, parentId?: string): Promise<FolderBrowserItem> {
    console.log('📁 [GoogleDriveService] Creating new folder...')
    console.log('📋 Parameters:', { folderName, parentId })

    // Validate folder name
    const sanitizedName = this.sanitizeFolderName(folderName)
    
    // Check for duplicates
    await this.checkForDuplicateFolder(sanitizedName, parentId)

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

    // Smart path construction to avoid duplication
    const path = await this.constructNewFolderPath(response.data.id!, sanitizedName, parentId)

    const folderBrowserItem = {
      id: response.data.id || '',
      name: response.data.name || sanitizedName,
      webViewLink: response.data.webViewLink || '',
      path
    }

    // Cache the path
    this.pathCache.set(folderBrowserItem.id, path)

    console.log('✅ Folder created successfully:', folderBrowserItem)
    return folderBrowserItem
  }

  /**
   * Construct path for newly created folder without duplication
   */
  private async constructNewFolderPath(folderId: string, folderName: string, parentId?: string): Promise<string> {
    if (!parentId || parentId === 'root') {
      return `/My Drive/${folderName}`
    }

    // Use cached parent path if available
    const parentPath = this.pathCache.get(parentId)
    if (parentPath && !parentPath.includes('Unknown')) {
      return `${parentPath}/${folderName}`
    }

    // Fallback to full path resolution
    const parentPathResolved = await this.getFolderPath(parentId)
    return `${parentPathResolved}/${folderName}`
  }

  /**
   * Sanitize folder name for Google Drive
   */
  private sanitizeFolderName(name: string): string {
    return name
      .trim()
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 255) // Limit length
  }

  /**
   * Check for duplicate folders before creation
   */
  private async checkForDuplicateFolder(folderName: string, parentId?: string): Promise<void> {
    const query = this.buildFolderQuery(parentId, `name='${folderName.replace(/'/g, "\\'")}'`)
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name)',
      pageSize: 1
    })

    if (response.data.files && response.data.files.length > 0) {
      throw new Error(`Folder "${folderName}" already exists in this location`)
    }
  }

  /**
   * Find existing folder or create new one
   */
  async findOrCreateFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    console.log('🔍 [GoogleDriveService] Finding or creating folder...')
    console.log('📋 Folder parameters:', { folderName, parentId })
    
    try {
      // Search for existing folder
      const query = this.buildFolderQuery(parentId, `name='${folderName.replace(/'/g, "\\'")}'`)
      
      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
        pageSize: 1
      })

      // Return existing folder if found
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const existingFolder = searchResponse.data.files[0]
        console.log('✅ Found existing folder:', existingFolder.name)
        
        return {
          id: existingFolder.id || '',
          name: existingFolder.name || folderName,
          webViewLink: existingFolder.webViewLink || ''
        }
      }

      // Create new folder
      console.log('➕ Folder not found, creating new folder...')
      const newFolder = await this.createFolder(folderName, parentId)
      
      return {
        id: newFolder.id,
        name: newFolder.name,
        webViewLink: newFolder.webViewLink
      }
    } catch (error) {
      console.error('❌ Error finding/creating folder:', error)
      throw new Error(`Failed to find or create folder: ${folderName}`)
    }
  }

  // ===========================================
  // BUSINESS LOGIC METHODS
  // ===========================================

  /**
   * Create client folder with settings support
   */
  async createClientFolder(clientName: string): Promise<DriveFolder> {
    console.log('🏢 [GoogleDriveService] Creating client folder with settings...')
    
    let parentId = this.settings?.parentFolderId
    let folderName = clientName

    // Auto-create year folders if enabled
    if (this.settings?.autoCreateYearFolders) {
      const currentYear = new Date().getFullYear().toString()
      const yearFolder = await this.findOrCreateFolder(currentYear, parentId)
      parentId = yearFolder.id
    }

    // Apply naming pattern
    folderName = this.applyNamingPattern(clientName)

    return this.findOrCreateFolder(folderName, parentId)
  }

  /**
   * Apply folder naming pattern based on settings
   */
  private applyNamingPattern(clientName: string): string {
    const pattern = this.settings?.folderNamingPattern || 'client-only'
    const year = new Date().getFullYear()
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')

    switch (pattern) {
      case 'year-client':
        return `${year} - ${clientName}`
      case 'custom':
        return this.settings?.customNamingTemplate
          ?.replace('{client}', clientName)
          ?.replace('{year}', year.toString())
          ?.replace('{month}', month) || clientName
      default:
        return clientName
    }
  }

  /**
   * Create complete shoot folder structure
   */
  async createShootFolder(clientName: string, shootTitle: string, shootDate: string): Promise<DriveFolder> {
    console.log('🗂️ [GoogleDriveService] Creating shoot folder structure...')
    
    // Format date for folder name
    const formattedDate = new Date(shootDate).toISOString().split('T')[0]
    const shootFolderName = `[${formattedDate}] ${shootTitle}`
    
    // Create client folder first
    const clientFolder = await this.createClientFolder(clientName)
    
    // Then create shoot folder inside client folder
    return this.findOrCreateFolder(shootFolderName, clientFolder.id)
  }

  /**
   * Create post idea folder with raw-files subfolder
   */
  async createPostIdeaFolder(postIdeaTitle: string, parentFolderId: string): Promise<DriveFolder> {
    console.log('📁 [GoogleDriveService] Creating post idea folder structure...')
    
    // Create post idea folder
    const postIdeaFolder = await this.findOrCreateFolder(postIdeaTitle, parentFolderId)
    
    // Create raw-files subfolder
    await this.findOrCreateFolder('raw-files', postIdeaFolder.id)
    
    return postIdeaFolder
  }

  // ===========================================
  // FILE OPERATIONS
  // ===========================================

  /**
   * Upload file to specific folder
   */
  async uploadFile(
    file: Buffer | NodeJS.ReadableStream,
    fileName: string,
    folderId: string,
    mimeType: string
  ): Promise<DriveFile> {
    console.log('📤 [GoogleDriveService] Starting file upload...')
    console.log('📋 Upload parameters:', { 
      fileName, 
      folderId, 
      mimeType,
      fileType: file instanceof Buffer ? 'Buffer' : 'Stream',
      fileSize: file instanceof Buffer ? file.length : 'unknown'
    })
    
    return this.retryWithBackoff(async () => {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      }

      // Convert Buffer to Readable stream if needed
      const body = file instanceof Buffer 
        ? (() => {
            console.log('🔄 [GoogleDriveService] Converting Buffer to readable stream...')
            return Readable.from(file)
          })()
        : file

      const media = {
        mimeType,
        body
      }

      console.log('🚀 [GoogleDriveService] Uploading to Google Drive...')
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,size,mimeType,webViewLink,webContentLink',
        supportsAllDrives: true
      })

      const driveFile = {
        id: response.data.id || '',
        name: response.data.name || fileName,
        size: response.data.size || '0',
        mimeType: response.data.mimeType || mimeType,
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || ''
      }

      console.log('✅ [GoogleDriveService] File upload completed successfully:', {
        driveFileId: driveFile.id,
        fileName: driveFile.name,
        size: driveFile.size,
        webViewLink: driveFile.webViewLink
      })
      return driveFile
    }, `upload file: ${fileName}`)
  }

  /**
   * Create text notes file
   */
  async createNotesFile(notes: string, fileName: string, folderId: string): Promise<DriveFile> {
    return this.uploadFile(Buffer.from(notes, 'utf8'), fileName, folderId, 'text/plain')
  }

  // ===========================================
  // AUTHENTICATION & HEALTH METHODS
  // ===========================================

  /**
   * Refresh token if needed
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(credentials)
      return true
    } catch (error) {
      console.error('❌ [GoogleDriveService] Token refresh failed:', error)
      return false
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.drive.about.get({ fields: 'user' })
      return true
    } catch {
      return false
    }
  }

  // ===========================================
  // SETTINGS MANAGEMENT
  // ===========================================

  /**
   * Update service settings
   */
  updateSettings(newSettings: GoogleDriveSettings): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  /**
   * Get current settings
   */
  getSettings(): GoogleDriveSettings | undefined {
    return this.settings
  }
}

/**
 * Factory function to create service instance
 */
export const createUnifiedGoogleDriveService = (
  accessToken: string,
  refreshToken?: string,
  settings?: GoogleDriveSettings
): UnifiedGoogleDriveService => {
  return new UnifiedGoogleDriveService(accessToken, refreshToken, settings)
} 