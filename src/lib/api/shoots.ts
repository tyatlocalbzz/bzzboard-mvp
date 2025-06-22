// Centralized API functions for shoot-related operations
// This eliminates duplication of mock API functions across multiple files

import type { Shot, PostIdea, Shoot, ActiveShootData, PostIdeaData } from '@/lib/types/shoots'

// Mock API functions - replace with real API calls when backend is ready

export const shootsApi = {
  async fetchShoot(id: string): Promise<Shoot> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock validation
    if (!id) {
      throw new Error('Shoot ID is required')
    }
    
    // Mock shoot data
    return {
      id: parseInt(id),
      title: "Acme Corp Q1 Content",
      client: "Acme Corporation",
      scheduledAt: "2024-01-15T10:00:00Z",
      duration: 120,
      location: "Downtown Studio",
      status: "scheduled",
      notes: "Bring extra lighting equipment",
      postIdeasCount: 3
    }
  },

  async fetchPostIdeas(shootId: string): Promise<PostIdea[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Mock validation
    if (!shootId) {
      throw new Error('Shoot ID is required')
    }
    
    // Mock post ideas data
    const mockShots: Shot[] = [
      { id: 1, text: "Hero product shot", completed: false, postIdeaId: 1 },
      { id: 2, text: "Behind the scenes setup", completed: true, postIdeaId: 1 },
      { id: 3, text: "Team reaction shot", completed: false, postIdeaId: 1, notes: "Get genuine reactions" },
      { id: 4, text: "Wide establishing shot", completed: false, postIdeaId: 2 },
      { id: 5, text: "Close-up detail work", completed: false, postIdeaId: 2 },
      { id: 6, text: "Customer using product", completed: false, postIdeaId: 3 },
    ]

    return [
      {
        id: 1,
        title: "Product Launch Announcement",
        platforms: ["Instagram", "LinkedIn"],
        contentType: "photo",
        shots: mockShots.filter(shot => shot.postIdeaId === 1),
        caption: "Exciting product launch content"
      },
      {
        id: 2,
        title: "BTS Video Content",
        platforms: ["Instagram", "Facebook"],
        contentType: "video",
        shots: mockShots.filter(shot => shot.postIdeaId === 2)
      },
      {
        id: 3,
        title: "Customer Testimonial",
        platforms: ["LinkedIn", "YouTube"],
        contentType: "video",
        shots: mockShots.filter(shot => shot.postIdeaId === 3)
      }
    ]
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
  }
} 