// Client-side API utilities for shoots
// Centralizes all shoot-related API calls to eliminate duplication

import { shootStatusManager, ShootStatus } from "@/lib/utils/status"
import type { Shoot } from '@/lib/types/shoots'

export interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
}

export interface ExtendedPostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
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

// Shoot API functions
export const shootsApi = {
  // Fetch a single shoot with its post ideas
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

  // Fetch post ideas for a shoot
  async fetchPostIdeas(shootId: string): Promise<ExtendedPostIdea[]> {
    const response = await fetch(`/api/shoots/${shootId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch post ideas: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch post ideas')
    }
    
    // Transform the post ideas to match the extended format
    const postIdeas = data.postIdeas || []
    return postIdeas.map((postIdea: { id: number; title: string; platforms: string[]; shots?: { text: string; completed: boolean }[] }) => ({
      ...postIdea,
      shotList: postIdea.shots?.map((shot: { text: string; completed: boolean }) => shot.text) || [],
      completed: postIdea.shots?.every((shot: { text: string; completed: boolean }) => shot.completed) || false
    }))
  },

  // Change shoot status
  async changeStatus(id: string, newStatus: ShootStatus, action?: string) {
    const response = await fetch(`/api/shoots/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: newStatus,
        action
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to change shoot status: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to change shoot status')
    }
    
    return {
      success: true,
      message: data.message || `Shoot status changed to ${shootStatusManager.getLabel(newStatus)}`
    }
  },

  // Reschedule a shoot
  async reschedule(id: string, data: RescheduleData) {
    const scheduledAt = new Date(`${data.date}T${data.time}`)
    
    const response = await fetch(`/api/shoots/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduledAt: scheduledAt.toISOString()
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to reschedule shoot')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      message: result.message || 'Shoot rescheduled successfully'
    }
  },

  // Edit shoot details
  async edit(id: string, data: EditShootData) {
    const response = await fetch(`/api/shoots/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.title,
        duration: data.duration,
        location: data.location,
        notes: data.notes
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to edit shoot')
    }
    
    const result = await response.json()
    
    return {
      success: true,
      message: result.message || 'Shoot updated successfully'
    }
  },

  // End a shoot (mark as completed)
  async endShoot(id: string) {
    console.log('🏁 [shootsApi.endShoot] Ending shoot:', id)
    
    const response = await fetch(`/api/shoots/${id}`, {
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
    
    return {
      success: true,
      message: result.message || 'Shoot completed successfully'
    }
  },

  // Delete a shoot
  async delete(id: string) {
    const response = await fetch(`/api/shoots/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete shoot: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete shoot')
    }
    
    return {
      success: true,
      message: data.message || 'Shoot deleted successfully',
      calendarEventRemoved: data.calendarEventRemoved,
      recoveryNote: data.recoveryNote
    }
  }
}

// Post Ideas API functions
export const postIdeasApi = {
  // Add a new post idea to a shoot
  async add(shootId: string, data: PostIdeaData) {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        shootId: shootId // Include shoot ID to auto-assign
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create post idea')
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create post idea')
    }
    
    return {
      id: result.postIdea.id,
      ...data,
      shots: [],
      status: 'planned' as const,
      completed: false
    }
  },

  // Edit an existing post idea
  async edit(postIdeaId: string, data: PostIdeaData) {
    const response = await fetch(`/api/posts/${postIdeaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update post idea')
    }
    
    const result = await response.json()
    
    return {
      success: result.success,
      message: result.message || 'Post idea updated successfully'
    }
  },

  // Toggle post idea status
  async toggleStatus(postIdeaId: number) {
    // This would need to be implemented based on current status
    // For now, we'll implement a simple status toggle
    const response = await fetch(`/api/posts/${postIdeaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Toggle logic would need current status to determine next status
        status: 'shot' // Simplified for now
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to toggle post idea status')
    }
    
    const result = await response.json()
    
    return {
      success: result.success,
      message: result.message || 'Post idea status updated'
    }
  },

  // Helper functions for display formatting
  formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  },

  formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  },

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) {
      return `${mins}m`
    } else if (mins === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${mins}m`
    }
  }
} 