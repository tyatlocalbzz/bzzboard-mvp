// Centralized API functions for shoot-related operations
// Real database-backed API calls

import type { 
  Shot, 
  PostIdea, 
  Shoot, 
  ActiveShootData, 
  PostIdeaData, 
  UploadedFile, 
  UploadProgress, 
  UploadRequest,
  DriveFolder 
} from '@/lib/types/shoots'

// Real API functions using database

export const shootsApi = {
  async fetchShoot(id: string): Promise<Shoot> {
    const response = await fetch(`/api/shoots/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch shoot: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch shoot')
    }
    
    return data.shoot
  },

  async fetchPostIdeas(shootId: string): Promise<PostIdea[]> {
    const response = await fetch(`/api/shoots/${shootId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch post ideas: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch post ideas')
    }
    
    return data.postIdeas || []
  },

  async fetchActiveShootData(shootId: string): Promise<ActiveShootData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('🔍 fetchActiveShootData called with shootId:', shootId)
    
    try {
      const [shoot, postIdeas] = await Promise.all([
        this.fetchShoot(shootId),
        this.fetchPostIdeas(shootId)
      ])

      console.log('📊 Raw shoot data:', shoot)
      console.log('📊 Raw post ideas:', postIdeas)

      // Override shoot status for active shoot
      const activeShoot: Shoot = {
        ...shoot,
        status: "active",
        startedAt: "2024-01-15T10:00:00Z" // Fixed time for consistency
      }

      const result = {
        shoot: activeShoot,
        postIdeas
      }

      console.log('✅ Returning active shoot data:', result)
      return result
    } catch (error) {
      console.error('❌ Error in fetchActiveShootData:', error)
      throw error
    }
  },

  async toggleShot(shotId: number): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    console.log('Toggling shot:', shotId)
    // In real implementation, this would update the shot in the database
  },

  async editShot(shotId: number, text: string, notes?: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log('Editing shot:', { shotId, text, notes })
    // In real implementation, this would update the shot in the database
  },

  async addShot(postIdeaId: number, text: string, notes?: string): Promise<Shot> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Create new shot
    const newShot: Shot = {
      id: Math.floor(Math.random() * 1000000), // Mock ID generation
      text,
      completed: false,
      postIdeaId,
      notes
    }
    
    console.log('Adding shot:', newShot)
    // In real implementation, this would save to database and return the created shot
    return newShot
  },

  async addPostIdea(shootId: string, postIdeaData: PostIdeaData): Promise<PostIdea> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    // Generate consistent IDs
    const baseId = Math.floor(Math.random() * 1000000)
    
    // Parse shot list into individual shots
    const shots: Shot[] = []
    if (postIdeaData.shotList) {
      const shotLines = postIdeaData.shotList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      shotLines.forEach((shotText, index) => {
        shots.push({
          id: baseId + index + 1000, // Mock ID generation
          text: shotText,
          completed: false,
          postIdeaId: baseId, // Will be updated with real post idea ID
          notes: undefined
        })
      })
    }
    
    const newPostIdea: PostIdea = {
      id: baseId, // Mock ID generation
      title: postIdeaData.title,
      platforms: postIdeaData.platforms,
      contentType: postIdeaData.contentType,
      shots,
      caption: postIdeaData.caption
    }
    
    // Update shot postIdeaId references
    newPostIdea.shots.forEach(shot => {
      shot.postIdeaId = newPostIdea.id
    })
    
    console.log('Adding post idea:', newPostIdea)
    // In real implementation, this would save to database and return the created post idea
    return newPostIdea
  },

  async endShoot(shootId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('Ending shoot:', shootId)
    // In real implementation, this would update the shoot status to 'completed'
  },

  // Upload-related functions
  async uploadFile(request: UploadRequest, onProgress?: (progress: UploadProgress) => void): Promise<UploadedFile> {
    console.log('📤 [shootsApi.uploadFile] Starting file upload...')
    console.log('📋 [shootsApi.uploadFile] Upload request:', {
      fileName: request.file.name,
      fileSize: request.file.size,
      fileType: request.file.type,
      postIdeaId: request.postIdeaId,
      shootId: request.shootId,
      hasNotes: !!request.notes,
      notesLength: request.notes?.length || 0,
      hasProgressCallback: !!onProgress
    })

    // Simulate upload progress
    if (onProgress) {
      console.log('📊 [shootsApi.uploadFile] Simulating upload progress...')
      const totalBytes = request.file.size
      for (let uploadedBytes = 0; uploadedBytes <= totalBytes; uploadedBytes += Math.floor(totalBytes / 10)) {
        const percentage = Math.round((uploadedBytes / totalBytes) * 100)
        const progressData = {
          uploadedBytes,
          totalBytes,
          percentage,
          status: uploadedBytes === totalBytes ? 'completed' : 'uploading'
        } as UploadProgress
        
        console.log(`📈 [shootsApi.uploadFile] Progress: ${percentage}% (${uploadedBytes}/${totalBytes} bytes)`)
        onProgress(progressData)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      console.log('✅ [shootsApi.uploadFile] Progress simulation completed')
    }

    // Simulate API call to upload endpoint
    console.log('📦 [shootsApi.uploadFile] Preparing FormData...')
    const formData = new FormData()
    formData.append('file', request.file)
    
    if (request.postIdeaId) {
      formData.append('postIdeaId', request.postIdeaId.toString())
      console.log('🎯 [shootsApi.uploadFile] Added postIdeaId:', request.postIdeaId)
    }
    if (request.shootId) {
      formData.append('shootId', request.shootId.toString())
      console.log('📸 [shootsApi.uploadFile] Added shootId:', request.shootId)
    }
    if (request.notes) {
      formData.append('notes', request.notes)
      console.log('📝 [shootsApi.uploadFile] Added notes:', `${request.notes.length} characters`)
    }

    console.log('🚀 [shootsApi.uploadFile] Sending request to /api/uploads...')
    const startTime = Date.now()

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    })

    const endTime = Date.now()
    const duration = endTime - startTime
    console.log('⏱️  [shootsApi.uploadFile] API request completed in:', `${duration}ms`)

    console.log('📊 [shootsApi.uploadFile] Response status:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      console.error('❌ [shootsApi.uploadFile] Upload failed')
      const errorText = await response.text()
      console.error('🔍 [shootsApi.uploadFile] Error response:', errorText)
      throw new Error('Upload failed')
    }

    console.log('✅ [shootsApi.uploadFile] Upload successful - parsing response...')
    const result = await response.json()
    console.log('📄 [shootsApi.uploadFile] Upload result:', {
      success: result.success,
      fileName: result.file?.fileName,
      fileSize: result.file?.fileSize,
      driveFileId: result.file?.driveFileId,
      webViewLink: result.file?.webViewLink,
      uploadDestination: result.uploadDestination,
      folderStructure: result.folderStructure
    })

    console.log('🎉 [shootsApi.uploadFile] File upload completed successfully!')
    return result.file
  },

  async getUploadedFiles(shootId?: number, postIdeaId?: number): Promise<UploadedFile[]> {
    const params = new URLSearchParams()
    if (shootId) params.append('shootId', shootId.toString())
    if (postIdeaId) params.append('postIdeaId', postIdeaId.toString())

    const response = await fetch(`/api/uploads?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch uploaded files')
    }

    const result = await response.json()
    return result.files
  },

  async createDriveFolder(clientName: string, shootTitle: string, shootDate: string): Promise<DriveFolder> {
    console.log('🗂️  [shootsApi.createDriveFolder] Creating Google Drive folder structure...')
    console.log('📋 [shootsApi.createDriveFolder] Input parameters:', {
      clientName,
      shootTitle,
      shootDate,
      parsedDate: new Date(shootDate).toISOString()
    })

    // Real Google Drive folder creation - this will be implemented when Google Drive is connected
    const response = await fetch('/api/shoots/create-drive-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName,
        shootTitle,
        shootDate
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create Google Drive folder')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create Google Drive folder')
    }

    console.log('✅ [shootsApi.createDriveFolder] Folder creation completed!')
    return data.folder
  },

  async shareDriveFolder(folderId: string): Promise<string> {
    // Mock sharing - replace with real Google Drive API call
    await new Promise(resolve => setTimeout(resolve, 500))
    return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`
  }
} 