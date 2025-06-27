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
 * Optimized for performance with minimal API calls and smart caching
 * 
 * Performance Optimizations Implemented:
 * 1. Optimized field selection - Request only needed fields to reduce bandwidth
 * 2. Smart caching - Cache paths and drive context to avoid redundant API calls
 * 3. Batch processing - Process multiple folders efficiently without individual path lookups
 * 4. Drive context caching - Cache shared drive information to avoid repeated checks
 * 5. Minimal API calls - Use single API calls for multiple data points where possible
 * 6. Path construction optimization - Build paths from cached parent paths when available
 * 7. Duplicate detection optimization - Use minimal fields for existence checks
 * 8. Cache management - Provide cache control and monitoring capabilities
 */
export class UnifiedGoogleDriveService {
  private drive: ReturnType<typeof google.drive>
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  private settings?: GoogleDriveSettings
  private pathCache = new Map<string, string>()
  private driveContextCache = new Map<string, { isSharedDrive: boolean; driveId?: string }>()
  
  // Configuration
  private readonly maxRetries = 3
  private readonly baseDelay = 1000
  private readonly pageSize = 100
  
  // Optimized field selections based on Google Drive API best practices
  private readonly folderFields = 'files(id,name,webViewLink,parents,driveId)'
  private readonly driveFields = 'drives(id,name)'
  private readonly pathFields = 'id,name,parents,driveId'

  constructor(accessToken: string, refreshToken?: string, settings?: GoogleDriveSettings) {
    console.log('🔧 [GoogleDriveService] Initializing service...')
    console.log('🔍 [GoogleDriveService] OAuth2 configuration:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      redirectUri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : 'not set'
    })
    
    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const missing = []
      if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
      if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
      throw new Error(`Google OAuth not configured. Missing environment variables: ${missing.join(', ')}`)
    }
    
    // Create OAuth2 client with proper client ID and secret from environment
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : undefined
    )
    
    // Set the credentials (tokens)
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
    console.log('✅ [GoogleDriveService] Service initialized successfully')
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
   * Get My Drive folders with optimized field selection
   */
  private async getMyDriveFolders(): Promise<FolderBrowserItem[]> {
    console.log('📁 [GoogleDriveService] Getting My Drive folders...')
    
    const response = await this.drive.files.list({
      q: this.buildFolderQuery('root'),
      fields: this.folderFields,
      orderBy: 'name',
      pageSize: this.pageSize
    })

    const folders = response.data.files?.map((file) => {
      const path = `/My Drive/${file.name || 'Unknown'}`
      
      // Cache path and drive context for later use
      if (file.id) {
        this.pathCache.set(file.id, path)
        // My Drive folders are never in shared drives
        this.driveContextCache.set(file.id, { isSharedDrive: false })
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
   * Get Shared Drives (Team Drives) with optimized field selection
   */
  private async getSharedDrives(): Promise<FolderBrowserItem[]> {
    console.log('🏢 [GoogleDriveService] Getting Shared Drives...')
    
    try {
      const response = await this.drive.drives.list({
        fields: this.driveFields,
        pageSize: this.pageSize
      })

      const sharedDrives = response.data.drives?.map(drive => {
        const path = `/Shared Drives/${drive.name || 'Unnamed'}`
        
        // Cache path and drive context for later use
        if (drive.id) {
          this.pathCache.set(drive.id, path)
          // Shared drive roots are shared drives
          this.driveContextCache.set(drive.id, { isSharedDrive: true, driveId: drive.id })
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
   * Get contents of a specific folder or shared drive with optimized batch processing
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

    // Use cached drive context or determine it efficiently
    let driveContext = this.driveContextCache.get(parentId)
    if (!driveContext) {
      // Batch the drive context determination with folder listing
      driveContext = await this.determineDriveContext(parentId)
      this.driveContextCache.set(parentId, driveContext)
    }
    
    console.log('🔍 [GoogleDriveService] Drive context (cached):', {
      parentId,
      ...driveContext
    })

    const queryOptions = this.getQueryOptionsForSharedDriveContext(parentId, driveContext.isSharedDrive, driveContext.driveId)
    
    console.log('🚀 [GoogleDriveService] Executing optimized folder query...')
    const response = await this.drive.files.list(queryOptions)

    console.log('📊 [GoogleDriveService] Raw API response:', {
      filesFound: response.data.files?.length || 0,
      files: response.data.files?.map(f => ({ id: f.id, name: f.name })) || []
    })

    // Batch process subfolders with optimized path construction
    if (response.data.files && response.data.files.length > 0) {
      const subfolders = await this.batchProcessFolderPaths(response.data.files, driveContext)
      folders.push(...subfolders)
    }

    console.log('📊 [GoogleDriveService] Folder contents found:', {
      parentId,
      driveContext,
      subfolders: folders.length - 1 // Exclude back navigation
    })

    return folders
  }

  /**
   * Get query options optimized for shared drive context with better field selection
   */
  private getQueryOptionsForSharedDriveContext(parentId: string, isInSharedDrive: boolean, driveId?: string) {
    const baseQuery = this.buildFolderQuery(parentId)
    
    console.log('🔧 [GoogleDriveService] Building optimized shared drive context query:', {
      parentId,
      isInSharedDrive,
      driveId,
      baseQuery
    })

    const baseOptions = {
      q: baseQuery,
      fields: this.folderFields, // Use optimized field selection
      orderBy: 'name',
      pageSize: this.pageSize,
      // Always include shared drive support
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      supportsTeamDrives: true
    }

    if (isInSharedDrive && driveId) {
      console.log('🏢 [GoogleDriveService] Using shared drive scoped query with driveId:', driveId)
      return {
        ...baseOptions,
        driveId: driveId,
        corpora: 'drive' as const
      }
    }

    console.log('📁 [GoogleDriveService] Using cross-drive query')
    return {
      ...baseOptions,
      corpora: 'allDrives' as const
    }
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
   * Build folder path with simplified and reliable approach
   */
  private async buildFolderPath(folderId: string): Promise<string> {
    const pathSegments: string[] = []
    let currentId = folderId
    let sharedDriveId: string | undefined
    const visited = new Set<string>() // Prevent infinite loops

    console.log('🗂️ [GoogleDriveService] Building path for folder:', folderId)

    while (currentId && currentId !== 'root' && !visited.has(currentId)) {
      visited.add(currentId)

      const response = await this.drive.files.get({
        fileId: currentId,
        fields: 'id,name,parents,driveId',
        supportsAllDrives: true
      })

      const folder = response.data
      if (folder.name) {
        pathSegments.unshift(folder.name)
      }

      // Track if we're in a shared drive
      if (folder.driveId) {
        sharedDriveId = folder.driveId
      }

      // Move to parent folder
      currentId = folder.parents?.[0] || ''
      if (currentId === 'root') break
    }

    // Construct the path based on drive type
    let fullPath: string
    
    if (sharedDriveId) {
      // For shared drive folders, get the drive name
      try {
        const driveResponse = await this.drive.drives.get({
          driveId: sharedDriveId,
          fields: 'id,name'
        })
        const driveName = driveResponse.data.name || 'Unknown'
        fullPath = pathSegments.length > 0 
          ? `/Shared Drives/${driveName}/${pathSegments.join('/')}`
          : `/Shared Drives/${driveName}`
      } catch (error) {
        console.warn('⚠️ [GoogleDriveService] Could not resolve shared drive name:', error)
        fullPath = pathSegments.length > 0 
          ? `/Shared Drives/Unknown/${pathSegments.join('/')}`
          : '/Shared Drives/Unknown'
      }
    } else {
      // For My Drive folders - ensure no duplication
      fullPath = pathSegments.length > 0 
        ? `/My Drive/${pathSegments.join('/')}`
        : '/My Drive'
    }
    
    // Final cleanup to prevent any path duplication issues
    fullPath = fullPath.replace(/\/My Drive\/My Drive\//g, '/My Drive/')
    
    console.log('📂 [GoogleDriveService] Built path:', fullPath)
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
      fields: 'id,name,webViewLink', // Minimal fields needed for response
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
      // Ensure we don't duplicate "My Drive" in the path
      const cleanParentPath = parentPath.startsWith('/My Drive/My Drive/') 
        ? parentPath.replace('/My Drive/My Drive/', '/My Drive/')
        : parentPath
      return `${cleanParentPath}/${folderName}`
    }

    // Fallback to full path resolution
    const parentPathResolved = await this.getFolderPath(parentId)
    // Ensure we don't duplicate "My Drive" in the path
    const cleanParentPath = parentPathResolved.startsWith('/My Drive/My Drive/') 
      ? parentPathResolved.replace('/My Drive/My Drive/', '/My Drive/')
      : parentPathResolved
    return `${cleanParentPath}/${folderName}`
  }

  /**
   * Sanitize folder name for Google Drive
   * Preserves original casing to maintain user intent
   */
  private sanitizeFolderName(name: string): string {
    return name
      .trim()
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 255) // Limit length
      // Note: Preserving original casing - do not convert to lowercase
  }

  /**
   * Check for duplicate folders before creation with minimal API call
   */
  private async checkForDuplicateFolder(folderName: string, parentId?: string): Promise<void> {
    const query = this.buildFolderQuery(parentId, `name='${folderName.replace(/'/g, "\\'")}'`)
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id)', // Only need ID to check existence
      pageSize: 1
    })

    if (response.data.files && response.data.files.length > 0) {
      throw new Error(`Folder "${folderName}" already exists in this location`)
    }
  }

  /**
   * Find existing folder or create new one with optimized field selection
   */
  async findOrCreateFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    console.log('🔍 [GoogleDriveService] Finding or creating folder...')
    console.log('📋 Folder parameters:', { 
      folderName, 
      parentId,
      folderNameLength: folderName.length,
      folderNameCasing: folderName
    })
    
    try {
      // Search for existing folder with optimized query
      const query = this.buildFolderQuery(parentId, `name='${folderName.replace(/'/g, "\\'")}'`)
      console.log('🔎 [GoogleDriveService] Search query:', query)
      
      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)', // Minimal fields for search
        pageSize: 1 // Only need to know if it exists
      })

      // Return existing folder if found
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const existingFolder = searchResponse.data.files[0]
        console.log('✅ Found existing folder:', {
          name: existingFolder.name,
          originalFolderName: folderName,
          nameMatch: existingFolder.name === folderName
        })
        
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
    
    // Use the selected parent folder directly (user has already chosen the client folder)
    const parentFolderId = this.settings?.parentFolderId
    console.log('📂 [GoogleDriveService] Using selected parent folder:', parentFolderId || 'root')
    
    // Create shoot folder directly in the selected folder
    return this.findOrCreateFolder(shootFolderName, parentFolderId)
  }

  /**
   * Create post idea folder with raw-files subfolder
   */
  async createPostIdeaFolder(postIdeaTitle: string, parentFolderId: string): Promise<DriveFolder> {
    console.log('📁 [GoogleDriveService] Creating post idea folder structure...')
    console.log('📋 [GoogleDriveService] Post idea folder parameters:', {
      postIdeaTitle,
      parentFolderId,
      titleLength: postIdeaTitle.length,
      titleCasing: postIdeaTitle
    })
    
    // Create post idea folder
    const postIdeaFolder = await this.findOrCreateFolder(postIdeaTitle, parentFolderId)
    console.log('✅ [GoogleDriveService] Post idea folder created:', {
      id: postIdeaFolder.id,
      name: postIdeaFolder.name,
      originalTitle: postIdeaTitle
    })
    
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
   * Refresh token if needed with enhanced error handling
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      console.log('🔄 [GoogleDriveService] Attempting token refresh...')
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(credentials)
      console.log('✅ [GoogleDriveService] Token refreshed successfully')
      return true
    } catch (error: unknown) {
      console.error('❌ [GoogleDriveService] Token refresh failed:', error)
      
      // Enhanced error logging for debugging
      const errorObj = error as { response?: { status?: number; statusText?: string; data?: unknown }; message?: string }
      if (errorObj.response) {
        console.error('🔍 [GoogleDriveService] Token refresh error details:', {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data
        })
      }
      
      // Check for specific error types
      if (errorObj.message?.includes('invalid_request') || 
          errorObj.message?.includes('invalid_grant') ||
          errorObj.response?.status === 400) {
        console.error('🚨 [GoogleDriveService] Refresh token appears to be expired or invalid - reconnection required')
      }
      
      return false
    }
  }

  /**
   * Perform health check with enhanced error reporting
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('🏥 [GoogleDriveService] Performing health check...')
      const response = await this.drive.about.get({ fields: 'user' })
      console.log('✅ [GoogleDriveService] Health check passed:', {
        user: response.data.user?.displayName || 'Unknown',
        status: 'healthy'
      })
      return true
    } catch (error: unknown) {
      console.error('❌ [GoogleDriveService] Health check failed:', error)
      
      const errorObj = error as { response?: { status?: number; statusText?: string; data?: unknown }; message?: string }
      if (errorObj.response) {
        console.error('🔍 [GoogleDriveService] Health check error details:', {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data
        })
      }
      
      // Check for authentication errors
      if (errorObj.message?.includes('401') || 
          errorObj.message?.includes('unauthorized') ||
          errorObj.response?.status === 401) {
        console.error('🚨 [GoogleDriveService] Authentication error detected - token may be expired')
      }
      
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

  /**
   * Efficiently determine drive context with minimal API calls
   */
  private async determineDriveContext(folderId: string): Promise<{ isSharedDrive: boolean; driveId?: string }> {
    try {
      // Check if it's a known shared drive root first
      const isSharedDriveRoot = await this.isSharedDriveRoot(folderId)
      if (isSharedDriveRoot) {
        return { isSharedDrive: true, driveId: folderId }
      }

      // Single API call to get both parents and driveId
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'parents,driveId',
        supportsAllDrives: true
      })
      
      const isSharedDrive = !!response.data.driveId
      return { 
        isSharedDrive, 
        driveId: response.data.driveId || undefined 
      }
    } catch {
      console.warn('⚠️ [GoogleDriveService] Could not determine drive context for:', folderId)
      return { isSharedDrive: false }
    }
  }

  /**
   * Batch process folder paths with simplified approach
   */
  private async batchProcessFolderPaths(
    files: Array<{ id?: string | null; name?: string | null; webViewLink?: string | null; parents?: string[] | null; driveId?: string | null }>,
    parentContext: { isSharedDrive: boolean; driveId?: string }
  ): Promise<FolderBrowserItem[]> {
    const results: FolderBrowserItem[] = []
    
    // Get the parent folder ID to determine the current folder being browsed
    const parentFolderId = files[0]?.parents?.[0]
    
    console.log('📦 [GoogleDriveService] Batch processing with context:', {
      parentFolderId,
      isSharedDrive: parentContext.isSharedDrive,
      driveId: parentContext.driveId,
      filesCount: files.length
    })
    
    // Determine the base path for all files in this folder
    let basePath: string
    
    if (parentContext.isSharedDrive && parentContext.driveId) {
      // For shared drives, get the drive name directly
      try {
        const driveResponse = await this.drive.drives.get({
          driveId: parentContext.driveId,
          fields: 'id,name'
        })
        const driveName = driveResponse.data.name || 'Unknown'
        
        // If we're browsing the shared drive root, use just the drive path
        if (parentFolderId === parentContext.driveId) {
          basePath = `/Shared Drives/${driveName}`
        } else {
          // For nested folders, get the current folder's path
          const currentFolderPath = await this.getFolderPath(parentFolderId!)
          basePath = currentFolderPath
        }
        
        console.log('🏢 [GoogleDriveService] Shared drive base path:', basePath)
      } catch (error) {
        console.warn('⚠️ [GoogleDriveService] Could not resolve shared drive name:', error)
        basePath = '/Shared Drives/Unknown'
      }
    } else {
      // For My Drive folders
      if (!parentFolderId || parentFolderId === 'root') {
        basePath = '/My Drive'
      } else {
        basePath = await this.getFolderPath(parentFolderId)
      }
      console.log('📁 [GoogleDriveService] My Drive base path:', basePath)
    }
    
    // Process each file with the determined base path
    for (const file of files) {
      if (!file.id || !file.name) continue
      
      const path = `${basePath}/${file.name}`
      
      // Cache the path and drive context
      this.pathCache.set(file.id, path)
      if (file.driveId || parentContext.isSharedDrive) {
        this.driveContextCache.set(file.id, {
          isSharedDrive: !!file.driveId || parentContext.isSharedDrive,
          driveId: file.driveId || parentContext.driveId
        })
      }
      
      results.push({
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink || '',
        path,
        type: 'folder' as const
      })
    }
    
    console.log(`📦 [GoogleDriveService] Batch processed ${results.length} folder paths`)
    return results
  }

  // ===========================================
  // CACHE MANAGEMENT METHODS
  // ===========================================

  /**
   * Clear all caches - useful for testing or when data becomes stale
   */
  clearCache(): void {
    this.pathCache.clear()
    this.driveContextCache.clear()
    console.log('🧹 [GoogleDriveService] All caches cleared')
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { pathCacheSize: number; driveContextCacheSize: number } {
    return {
      pathCacheSize: this.pathCache.size,
      driveContextCacheSize: this.driveContextCache.size
    }
  }

  /**
   * Warm up cache for a specific folder and its children (optional optimization)
   */
  async warmUpCache(folderId: string): Promise<void> {
    try {
      console.log('🔥 [GoogleDriveService] Warming up cache for folder:', folderId)
      
      // Pre-populate drive context
      if (!this.driveContextCache.has(folderId)) {
        const context = await this.determineDriveContext(folderId)
        this.driveContextCache.set(folderId, context)
      }
      
      // Pre-populate path if not cached
      if (!this.pathCache.has(folderId)) {
        const path = await this.getFolderPath(folderId)
        this.pathCache.set(folderId, path)
      }
      
      console.log('✅ [GoogleDriveService] Cache warmed up for folder:', folderId)
    } catch (error) {
      console.warn('⚠️ [GoogleDriveService] Failed to warm up cache:', error)
    }
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