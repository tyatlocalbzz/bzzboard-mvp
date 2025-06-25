// Centralized API functions for shoot-related operations
// Real database-backed API calls

import type { 
  Shot, 
  PostIdea, 
  Shoot, 
  ActiveShootData, 
  UploadedFile, 
  UploadProgress, 
  UploadRequest,
  DriveFolder 
} from '@/lib/types/shoots'

// Extended PostIdeaData with notes field
interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string
  notes?: string
}

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
    // For now, shots are stored as simple strings in the shotList array
    // We would need to enhance the schema to track individual shot completion
    console.log('Toggling shot:', shotId)
    // This would require additional database structure to track shot completion
    // For MVP, we can implement this as a client-side state management
  },

  async editShot(shotId: number, text: string, notes?: string): Promise<void> {
    // Extract post idea ID and shot index from shotId
    // This is a simplified approach - in a full implementation, 
    // we'd need a proper shots table
    console.log('Editing shot:', { shotId, text, notes })
    
    // For now, this would require knowing which post idea the shot belongs to
    // and updating the shotList array at the specific index
    throw new Error('Shot editing requires post idea context - use updatePostIdea API instead')
  },

  async addShot(postIdeaId: number, text: string, notes?: string): Promise<Shot> {
    const response = await fetch(`/api/posts/${postIdeaId}/shots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        notes
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to add shot')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to add shot')
    }
    
    return data.shot
  },

  async addPostIdea(shootId: string, postIdeaData: PostIdeaData): Promise<PostIdea> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: postIdeaData.title,
        platforms: postIdeaData.platforms,
        contentType: postIdeaData.contentType,
        caption: postIdeaData.caption,
        shotList: postIdeaData.shotList || [],
                 notes: postIdeaData.notes || undefined,
        shootId: shootId // Include shoot ID to auto-assign
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create post idea')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create post idea')
    }
    
    // Transform database response to frontend format
    const postIdea = data.postIdea
    const shots: Shot[] = (postIdea.shotList || []).map((shotText: string, index: number) => ({
      id: index,
      text: shotText,
      completed: false,
      postIdeaId: postIdea.id,
      notes: undefined
    }))
    
    return {
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      shots,
      caption: postIdea.caption
    }
  },

  async endShoot(shootId: string): Promise<void> {
    console.log('🏁 [shootsApi.endShoot] Ending shoot:', shootId)
    
    const response = await fetch(`/api/shoots/${shootId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        action: 'complete'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ [shootsApi.endShoot] Failed to end shoot:', errorData)
      throw new Error(errorData.error || 'Failed to end shoot')
    }

    const result = await response.json()
    console.log('✅ [shootsApi.endShoot] Shoot ended successfully:', result)
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

    const formData = new FormData()
    formData.append('file', request.file)
    if (request.postIdeaId) {
      formData.append('postIdeaId', request.postIdeaId.toString())
    }
    if (request.shootId) {
      formData.append('shootId', request.shootId.toString())
    }
    if (request.notes) {
      formData.append('notes', request.notes)
    }

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload file')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to upload file')
    }

    return data.uploadedFile
  },

  async getUploadedFiles(shootId?: number, postIdeaId?: number): Promise<UploadedFile[]> {
    const params = new URLSearchParams()
    if (shootId) params.append('shootId', shootId.toString())
    if (postIdeaId) params.append('postIdeaId', postIdeaId.toString())
    
    const response = await fetch(`/api/uploads?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch uploaded files: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch uploaded files')
    }
    
    return data.files || []
  },

  async createDriveFolder(clientName: string, shootTitle: string, shootDate: string): Promise<DriveFolder> {
    const response = await fetch('/api/integrations/google-drive/folders', {
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
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create folder')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create folder')
    }

    return data.folder
  },

  async shareDriveFolder(folderId: string): Promise<string> {
    const response = await fetch('/api/integrations/google-drive/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to share folder')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to share folder')
    }

    return data.shareUrl
  }
} 