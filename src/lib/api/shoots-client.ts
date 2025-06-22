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
    await new Promise(resolve => setTimeout(resolve, 800))
    console.log('Rescheduling shoot:', id, data)
    return { success: true }
  },

  // Edit shoot details
  async edit(id: string, data: EditShootData) {
    await new Promise(resolve => setTimeout(resolve, 800))
    console.log('Editing shoot:', id, data)
    return { success: true }
  },

  // Delete a shoot
  async delete(id: string) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Deleting shoot:', id)
    return { success: true }
  }
}

// Post Ideas API functions
export const postIdeasApi = {
  // Add a new post idea to a shoot
  async add(shootId: string, data: PostIdeaData) {
    await new Promise(resolve => setTimeout(resolve, 600))
    console.log('Adding post idea:', shootId, data)
    return { 
      id: Math.floor(Math.random() * 1000000),
      ...data,
      shots: [],
      status: 'planned' as const,
      completed: false
    }
  },

  // Edit an existing post idea
  async edit(postIdeaId: string, data: PostIdeaData) {
    await new Promise(resolve => setTimeout(resolve, 600))
    console.log('Editing post idea:', postIdeaId, data)
    return { success: true }
  },

  // Toggle post idea status (planned/shot/uploaded)
  async toggleStatus(postIdeaId: number) {
    await new Promise(resolve => setTimeout(resolve, 400))
    console.log('Toggling post idea status:', postIdeaId)
    return { success: true }
  }
}

// Utility functions for date/time formatting
export const formatUtils = {
  formatDate(dateString: string): string {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  },

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  },

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
} 