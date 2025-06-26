/**
 * Unified Shoots API Client
 * Consolidates all shoot-related API operations into a single, consistent interface
 * Eliminates duplication between multiple API client files
 */

import { shootStatusManager } from "@/lib/utils/status"
import type { 
  Shoot, 
  ShootStatus, 
  Shot, 
  ActiveShootData, 
  UploadedFile, 
  UploadRequest,
  DriveFolder,
  ExtendedPostIdea
} from '@/lib/types/shoots'

// ============================================================================
// TYPES
// ============================================================================

export interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string[]
  notes?: string
}

export interface RescheduleData {
  date: string
  time: string
}

export interface EditShootData {
  title: string
  client: string
  duration: number
  location: string
  notes?: string
}

export interface ShootApiResponse {
  success: boolean
  message?: string
  warning?: string
  info?: string
  calendarEventRemoved?: boolean
  recoveryNote?: string
}

// ============================================================================
// CORE API UTILITIES
// ============================================================================

class ApiRequest {
  private static async request<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      let errorMessage = `Request failed: ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // If parsing fails, use the default error message
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    if ('success' in data && !data.success) {
      throw new Error(data.error || 'Request failed')
    }

    return data
  }

  static get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  static post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  static patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  static delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' })
  }

  static upload<T>(url: string, formData: FormData): Promise<T> {
    return fetch(url, {
      method: 'POST',
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const data = await response.json()
      
      if ('success' in data && !data.success) {
        throw new Error(data.error || 'Upload failed')
      }
      
      return data
    })
  }
}

// ============================================================================
// SHOOTS API
// ============================================================================

export const ShootsApi = {
  // -------------------------
  // BASIC SHOOT OPERATIONS
  // -------------------------

  async fetchShoot(id: string): Promise<Shoot> {
    const data = await ApiRequest.get<{ shoot: Shoot }>(`/api/shoots/${id}`)
    return data.shoot
  },

  async fetchPostIdeas(shootId: string): Promise<ExtendedPostIdea[]> {
    const data = await ApiRequest.get<{ postIdeas: ExtendedPostIdea[] }>(`/api/shoots/${shootId}`)
    const postIdeas = data.postIdeas || []
    
    // Transform to ensure consistent format with proper typing
    return postIdeas.map((postIdea: {
      id: number
      title: string
      platforms: string[]
      contentType: string
      caption?: string
      notes?: string
      status?: string
      shots?: { text: string; completed: boolean }[]
    }) => ({
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType as 'photo' | 'video' | 'reel' | 'story',
      caption: postIdea.caption,
      shotList: postIdea.shots?.map(shot => shot.text) || [],
      notes: postIdea.notes,
      status: (postIdea.status || 'planned') as 'planned' | 'shot' | 'uploaded',
      completed: postIdea.shots?.every(shot => shot.completed) || false
    }))
  },

  async fetchActiveShootData(shootId: string): Promise<ActiveShootData> {
    console.log('🔍 fetchActiveShootData called with shootId:', shootId)
    
    try {
      const [shoot, postIdeas] = await Promise.all([
        this.fetchShoot(shootId),
        this.fetchPostIdeas(shootId)
      ])

      console.log('📊 Active shoot data fetched:', { shoot, postIdeas })

      // Override shoot status for active shoot
      const activeShoot: Shoot = {
        ...shoot,
        status: "active",
        startedAt: shoot.startedAt || new Date().toISOString()
      }

      // Transform ExtendedPostIdea to PostIdea format for ActiveShootData
      const transformedPostIdeas = postIdeas.map(postIdea => ({
        id: postIdea.id,
        title: postIdea.title,
        platforms: postIdea.platforms,
        contentType: postIdea.contentType as 'photo' | 'video' | 'reel' | 'story',
        shots: postIdea.shotList.map((shotText, index) => ({
          id: index + 1,
          text: shotText,
          completed: postIdea.completed || false,
          postIdeaId: postIdea.id,
          notes: undefined
        })),
        caption: postIdea.caption
      }))

      return { 
        shoot: activeShoot, 
        postIdeas: transformedPostIdeas
      }
    } catch (error) {
      console.error('❌ Error in fetchActiveShootData:', error)
      throw error
    }
  },

  // -------------------------
  // STATUS MANAGEMENT
  // -------------------------

  async changeStatus(
    id: string, 
    newStatus: ShootStatus, 
    action?: string
  ): Promise<ShootApiResponse> {
    const data = await ApiRequest.patch<ShootApiResponse>(`/api/shoots/${id}`, {
      status: newStatus,
      action
    })

    return {
      success: true,
      message: data.message || `Shoot status changed to ${shootStatusManager.getLabel(newStatus)}`
    }
  },

  async startShoot(id: string): Promise<ShootApiResponse> {
    return this.changeStatus(id, 'active', 'start')
  },

  async completeShoot(id: string): Promise<ShootApiResponse> {
    return this.changeStatus(id, 'completed', 'complete')
  },

  async cancelShoot(id: string): Promise<ShootApiResponse> {
    return this.changeStatus(id, 'cancelled')
  },

  // -------------------------
  // SHOOT MODIFICATIONS
  // -------------------------

  async reschedule(id: string, data: RescheduleData): Promise<ShootApiResponse> {
    const scheduledAt = new Date(`${data.date}T${data.time}`)
    
    const result = await ApiRequest.patch<ShootApiResponse>(`/api/shoots/${id}`, {
      scheduledAt: scheduledAt.toISOString()
    })

    return {
      success: true,
      message: result.message || 'Shoot rescheduled successfully'
    }
  },

  async editShoot(id: string, data: EditShootData): Promise<ShootApiResponse> {
    const result = await ApiRequest.patch<ShootApiResponse>(`/api/shoots/${id}`, {
      title: data.title,
      duration: data.duration,
      location: data.location,
      notes: data.notes
    })

    return {
      success: true,
      message: result.message || 'Shoot updated successfully'
    }
  },

  async deleteShoot(id: string): Promise<ShootApiResponse> {
    const data = await ApiRequest.delete<ShootApiResponse>(`/api/shoots/${id}`)
    
    return {
      success: true,
      message: data.message || 'Shoot deleted successfully',
      calendarEventRemoved: data.calendarEventRemoved,
      recoveryNote: data.recoveryNote
    }
  },

  // -------------------------
  // POST IDEAS MANAGEMENT
  // -------------------------

  async addPostIdea(shootId: string, data: PostIdeaData): Promise<ExtendedPostIdea> {
    const result = await ApiRequest.post<{ postIdea: { id: number } }>('/api/posts', {
      ...data,
      shootId: shootId // Include shoot ID to auto-assign
    })
    
    return {
      id: result.postIdea.id,
      ...data,
      shotList: data.shotList || [],
      status: 'planned' as const,
      completed: false
    }
  },

  async editPostIdea(postIdeaId: string, data: PostIdeaData): Promise<ShootApiResponse> {
    const result = await ApiRequest.patch<ShootApiResponse>(`/api/posts/${postIdeaId}`, data)
    
    return {
      success: result.success,
      message: result.message || 'Post idea updated successfully'
    }
  },

  async togglePostIdeaStatus(postIdeaId: number): Promise<ShootApiResponse> {
    const result = await ApiRequest.patch<ShootApiResponse>(`/api/posts/${postIdeaId}`, {
      status: 'shot' // Simplified for now
    })
    
    return {
      success: result.success,
      message: result.message || 'Post idea status updated'
    }
  },

  // -------------------------
  // SHOTS MANAGEMENT
  // -------------------------

  async addShot(postIdeaId: number, text: string, notes?: string): Promise<Shot> {
    const data = await ApiRequest.post<{ shot: Shot }>(`/api/posts/${postIdeaId}/shots`, {
      text,
      notes
    })
    
    return data.shot
  },

  async toggleShot(shotId: number): Promise<void> {
    // For now, shots are stored as simple strings in the shotList array
    // This would require additional database structure to track shot completion
    console.log('Toggling shot:', shotId)
    // Implementation would depend on enhanced shot tracking system
  },

  async editShot(shotId: number, text: string, notes?: string): Promise<void> {
    // This would require knowing which post idea the shot belongs to
    // and updating the shotList array at the specific index
    console.log('Editing shot:', { shotId, text, notes })
    throw new Error('Shot editing requires post idea context - use editPostIdea API instead')
  },

  // -------------------------
  // UPLOAD OPERATIONS
  // -------------------------

  async uploadFile(request: UploadRequest): Promise<UploadedFile> {
    console.log('📤 Starting file upload...', {
      fileName: request.file.name,
      fileSize: request.file.size,
      postIdeaId: request.postIdeaId,
      shootId: request.shootId,
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

    const data = await ApiRequest.upload<{ uploadedFile: UploadedFile }>('/api/uploads', formData)
    return data.uploadedFile
  },

  async getUploadedFiles(shootId?: number, postIdeaId?: number): Promise<UploadedFile[]> {
    const params = new URLSearchParams()
    if (shootId) params.append('shootId', shootId.toString())
    if (postIdeaId) params.append('postIdeaId', postIdeaId.toString())
    
    const data = await ApiRequest.get<{ files: UploadedFile[] }>(`/api/uploads?${params}`)
    return data.files || []
  },

  // -------------------------
  // GOOGLE DRIVE INTEGRATION
  // -------------------------

  async createDriveFolder(
    clientName: string, 
    shootTitle: string, 
    shootDate: string
  ): Promise<DriveFolder> {
    const data = await ApiRequest.post<{ folder: DriveFolder }>('/api/integrations/google-drive/folders', {
      clientName,
      shootTitle,
      shootDate
    })

    return data.folder
  },

  async shareDriveFolder(folderId: string): Promise<string> {
    const data = await ApiRequest.post<{ shareUrl: string }>('/api/integrations/google-drive/share', {
      folderId
    })
    
    return data.shareUrl
  }
}

// Backward compatibility exports
export const shootsApi = ShootsApi
export const postIdeasApi = {
  add: ShootsApi.addPostIdea,
  edit: ShootsApi.editPostIdea,
  toggleStatus: ShootsApi.togglePostIdeaStatus
}

// Default export
export default ShootsApi 