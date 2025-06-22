import { google } from 'googleapis'
import { GoogleDriveSettings } from '@/lib/types/settings'

export interface DriveFolder {
  id: string
  name: string
  webViewLink: string
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

export class GoogleDriveService {
  private drive: ReturnType<typeof google.drive>
  private parentFolderId?: string
  private settings?: GoogleDriveSettings

  constructor(accessToken: string, settings?: GoogleDriveSettings) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    this.drive = google.drive({ version: 'v3', auth })
    this.settings = settings
    this.parentFolderId = settings?.parentFolderId
  }

  // Enhanced method to create client folder with configurable parent
  private async createClientFolder(clientName: string): Promise<DriveFolder> {
    console.log('🏢 [GoogleDriveService] Creating client folder with settings...')
    console.log('📋 Client folder parameters:', { 
      clientName, 
      useParentFolder: !!this.parentFolderId,
      parentFolderId: this.parentFolderId,
      settings: this.settings 
    })

    try {
      let parentId = this.parentFolderId

      // If auto-create year folders is enabled, create/find year folder first
      if (this.settings?.autoCreateYearFolders) {
        const currentYear = new Date().getFullYear().toString()
        console.log('📅 [GoogleDriveService] Auto-creating year folder:', currentYear)
        
        const yearFolder = await this.findOrCreateFolder(currentYear, this.parentFolderId)
        parentId = yearFolder.id
        console.log('✅ [GoogleDriveService] Year folder ready:', { 
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

      console.log('📁 [GoogleDriveService] Final client folder name:', folderName)
      console.log('📂 [GoogleDriveService] Parent folder ID:', parentId || 'root')

      // Create the client folder
      const clientFolder = await this.findOrCreateFolder(folderName, parentId)
      console.log('✅ [GoogleDriveService] Client folder created/found:', {
        id: clientFolder.id,
        name: clientFolder.name,
        parentId: parentId || 'root'
      })

      return clientFolder
    } catch (error) {
      console.error('❌ [GoogleDriveService] Error creating client folder:', error)
      throw new Error(`Failed to create client folder: ${clientName}`)
    }
  }

  // Method to browse and select parent folder
  async browseFolders(parentId?: string): Promise<DriveFolder[]> {
    console.log('📂 [GoogleDriveService] Browsing folders...')
    console.log('📋 Browse parameters:', { parentId: parentId || 'root' })

    try {
      let query = `mimeType='application/vnd.google-apps.folder' and trashed=false`
      if (parentId) {
        query += ` and '${parentId}' in parents`
      } else {
        query += ` and 'root' in parents`
      }

      console.log('🔎 [GoogleDriveService] Folder search query:', query)

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
        orderBy: 'name'
      })

      const folders = response.data.files?.map(file => ({
        id: file.id || '',
        name: file.name || '',
        webViewLink: file.webViewLink || ''
      })) || []

      console.log('📊 [GoogleDriveService] Found folders:', {
        count: folders.length,
        folders: folders.map(f => ({ id: f.id, name: f.name }))
      })

      return folders
    } catch (error) {
      console.error('❌ [GoogleDriveService] Error browsing folders:', error)
      throw new Error('Failed to browse folders')
    }
  }

  // Method to get folder path for display
  async getFolderPath(folderId: string): Promise<string> {
    console.log('🗂️  [GoogleDriveService] Getting folder path...')
    console.log('📋 Folder ID:', folderId)

    try {
      const path: string[] = []
      let currentId = folderId

      while (currentId && currentId !== 'root') {
        const response = await this.drive.files.get({
          fileId: currentId,
          fields: 'id,name,parents'
        })

        const folder = response.data
        if (folder.name) {
          path.unshift(folder.name)
        }

        // Move to parent folder
        currentId = folder.parents?.[0] || ''
        if (currentId === 'root') break
      }

      const fullPath = path.length > 0 ? `/${path.join('/')}` : '/My Drive'
      console.log('📂 [GoogleDriveService] Folder path:', fullPath)
      return fullPath
    } catch (error) {
      console.error('❌ [GoogleDriveService] Error getting folder path:', error)
      return '/Unknown Path'
    }
  }

  // Create folder structure: [Parent]/Client Name/[YYYY-MM-DD] Shoot Title/
  async createShootFolder(clientName: string, shootTitle: string, shootDate: string): Promise<DriveFolder> {
    console.log('🗂️  [GoogleDriveService] Creating shoot folder structure...')
    console.log('📋 Input parameters:', { clientName, shootTitle, shootDate })
    
    try {
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
    } catch (error) {
      console.error('❌ Error creating shoot folder:', error)
      console.error('🔍 Error details:', {
        clientName,
        shootTitle,
        shootDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to create shoot folder in Google Drive')
    }
  }

  // Create post idea folder: [Post Idea Title]/raw-files/
  async createPostIdeaFolder(postIdeaTitle: string, parentFolderId: string): Promise<DriveFolder> {
    console.log('📁 [GoogleDriveService] Creating post idea folder structure...')
    console.log('📋 Input parameters:', { postIdeaTitle, parentFolderId })
    
    try {
      // Create post idea folder
      console.log('🔍 Step 1: Creating post idea folder:', postIdeaTitle)
      console.log('📂 Parent folder ID:', parentFolderId)
      const postIdeaFolder = await this.findOrCreateFolder(postIdeaTitle, parentFolderId)
      console.log('✅ Post idea folder created/found:', {
        id: postIdeaFolder.id,
        name: postIdeaFolder.name,
        webViewLink: postIdeaFolder.webViewLink,
        parentId: parentFolderId
      })
      
      // Create raw-files subfolder
      console.log('🔍 Step 2: Creating raw-files subfolder...')
      const rawFilesFolder = await this.findOrCreateFolder('raw-files', postIdeaFolder.id)
      console.log('✅ Raw-files folder created/found:', {
        id: rawFilesFolder.id,
        name: rawFilesFolder.name,
        webViewLink: rawFilesFolder.webViewLink,
        parentId: postIdeaFolder.id
      })
      
      console.log('🎉 Post idea folder structure created successfully!')
      console.log('📂 Final structure: Client/Shoot/PostIdea/raw-files')
      return postIdeaFolder
    } catch (error) {
      console.error('❌ Error creating post idea folder:', error)
      console.error('🔍 Error details:', {
        postIdeaTitle,
        parentFolderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to create post idea folder in Google Drive')
    }
  }

  // Create misc folder for non-post-idea files
  async createMiscFolder(parentFolderId: string): Promise<DriveFolder> {
    try {
      return await this.findOrCreateFolder('misc-files', parentFolderId)
    } catch (error) {
      console.error('Error creating misc folder:', error)
      throw new Error('Failed to create misc folder in Google Drive')
    }
  }

  // Upload file to specific folder
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
      fileSize: file instanceof Buffer ? file.length : 'stream (unknown size)'
    })
    
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      }
      console.log('📄 File metadata:', fileMetadata)

      const media = {
        mimeType,
        body: file
      }
      console.log('📦 Media configuration:', { mimeType, bodyType: typeof file })

      console.log('🚀 Initiating Google Drive API upload...')
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,size,mimeType,webViewLink,webContentLink'
      })

      console.log('✅ Upload successful! Google Drive response:', {
        id: response.data.id,
        name: response.data.name,
        size: response.data.size,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      })

      const driveFile = {
        id: response.data.id || '',
        name: response.data.name || fileName,
        size: response.data.size || '0',
        mimeType: response.data.mimeType || mimeType,
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || ''
      }

      console.log('📂 Final drive file object:', driveFile)
      console.log('🎉 File upload completed successfully!')
      return driveFile
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      console.error('🔍 Upload error details:', {
        fileName,
        folderId,
        mimeType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error(`Failed to upload file: ${fileName}`)
    }
  }

  // Create editor notes file
  async createNotesFile(notes: string, fileName: string, folderId: string): Promise<DriveFile> {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      }

      const media = {
        mimeType: 'text/plain',
        body: notes
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,size,mimeType,webViewLink,webContentLink'
      })

      return {
        id: response.data.id || '',
        name: response.data.name || fileName,
        size: response.data.size || '0',
        mimeType: response.data.mimeType || 'text/plain',
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || ''
      }
    } catch (error) {
      console.error('Error creating notes file:', error)
      throw new Error('Failed to create notes file')
    }
  }

  // Make folder shareable and get link
  async shareFolderPublicly(folderId: string): Promise<string> {
    try {
      // Make folder viewable by anyone with the link
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      })

      // Get the folder details to return the web view link
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'webViewLink'
      })

      return response.data.webViewLink || ''
    } catch (error) {
      console.error('Error sharing folder:', error)
      throw new Error('Failed to share folder')
    }
  }

  // Helper method to find existing folder or create new one
  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    console.log('🔍 [GoogleDriveService] Finding or creating folder...')
    console.log('📋 Folder parameters:', { folderName, parentId })
    
    try {
      // Search for existing folder
      let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
      if (parentId) {
        query += ` and '${parentId}' in parents`
      }
      console.log('🔎 Search query:', query)

      console.log('🚀 Searching for existing folder...')
      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)'
      })

      console.log('📊 Search results:', {
        filesFound: searchResponse.data.files?.length || 0,
        files: searchResponse.data.files?.map(f => ({ id: f.id, name: f.name }))
      })

      // If folder exists, return it
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const existingFolder = searchResponse.data.files[0]
        console.log('✅ Found existing folder:', {
          id: existingFolder.id,
          name: existingFolder.name,
          webViewLink: existingFolder.webViewLink
        })
        
        return {
          id: existingFolder.id || '',
          name: existingFolder.name || folderName,
          webViewLink: existingFolder.webViewLink || ''
        }
      }

      // Create new folder
      console.log('➕ Folder not found, creating new folder...')
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] })
      }
      console.log('📄 New folder metadata:', fileMetadata)

      console.log('🚀 Creating folder via Google Drive API...')
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name,webViewLink'
      })

      console.log('✅ New folder created successfully:', {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink
      })

      const driveFolder = {
        id: response.data.id || '',
        name: response.data.name || folderName,
        webViewLink: response.data.webViewLink || ''
      }

      console.log('📂 Final folder object:', driveFolder)
      return driveFolder
    } catch (error) {
      console.error('❌ Error finding/creating folder:', error)
      console.error('🔍 Folder error details:', {
        folderName,
        parentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error(`Failed to find or create folder: ${folderName}`)
    }
  }
}

// Factory function to create drive service instance (mock for now)
export const createDriveService = async (): Promise<GoogleDriveService> => {
  // For now, return a mock service until Google OAuth is set up
  // This will be replaced with real authentication later
  throw new Error('Google Drive service not yet configured. Please set up Google OAuth first.')
} 