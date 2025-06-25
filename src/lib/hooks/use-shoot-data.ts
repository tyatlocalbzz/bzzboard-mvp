import { useCallback } from 'react'
import { useApiData } from './use-api-data'
import type { Shoot } from '@/lib/types/shoots'

interface ExtendedPostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: string
  caption?: string
  shotList: string[]
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
  notes?: string
}

interface ShootDataResponse {
  shoot: Shoot
  postIdeas: ExtendedPostIdea[]
}

interface UseShootDataOptions {
  shootId: string
  loadPostIdeas?: boolean
  onError?: (error: string) => void
}

interface UseShootDataReturn {
  shoot: Shoot | null
  postIdeas: ExtendedPostIdea[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateShoot: (updates: Partial<Shoot>) => void
  updatePostIdea: (id: number, updates: Partial<ExtendedPostIdea>) => void
}

/**
 * Refactored shoot data hook using standardized API pattern
 * Eliminates ~80 lines of duplicate code by using the generic useApiData hook
 */
export const useShootData = ({ 
  shootId, 
  loadPostIdeas = true,
  onError 
}: UseShootDataOptions): UseShootDataReturn => {
  const endpoint = `/api/shoots/${shootId}`
  
  // Transform function to separate shoot and post ideas data - use useCallback for functions
  const transform = useCallback((data: unknown) => {
    const result = data as { shoot: Shoot; postIdeas?: unknown[] }
    
    if (!loadPostIdeas) {
      return {
        shoot: result.shoot,
        postIdeas: []
      }
    }
    
    // Transform post ideas to match extended format
    const transformedPostIdeas = (result.postIdeas || []).map((item: unknown) => {
      const postIdea = item as { 
        id: number; 
        title: string; 
        platforms: string[]; 
        contentType: string;
        caption?: string;
        notes?: string;
        status: 'planned' | 'shot' | 'uploaded';
        shots?: { text: string; completed: boolean }[] 
      }
      
      return {
        ...postIdea,
        shotList: postIdea.shots?.map((shot: { text: string; completed: boolean }) => shot.text) || [],
        completed: postIdea.shots?.every((shot: { text: string; completed: boolean }) => shot.completed) || false
      }
    })
    
    return {
      shoot: result.shoot,
      postIdeas: transformedPostIdeas
    }
  }, [loadPostIdeas])

  // Memoize onError callback to prevent infinite loops
  const memoizedOnError = useCallback((error: string) => {
    onError?.(error)
  }, [onError])

  const { data, isLoading, error, refresh, updateData } = useApiData<ShootDataResponse>({
    endpoint,
    dependencies: [shootId, loadPostIdeas],
    transform,
    onError: memoizedOnError
  })

  // Memoize convenience update functions to prevent recreation
  const updateShoot = useCallback((updates: Partial<Shoot>) => {
    updateData(prev => prev ? {
      ...prev,
      shoot: { ...prev.shoot, ...updates }
    } : null)
  }, [updateData])

  const updatePostIdea = useCallback((id: number, updates: Partial<ExtendedPostIdea>) => {
    updateData(prev => prev ? {
      ...prev,
      postIdeas: prev.postIdeas.map(idea => 
        idea.id === id ? { ...idea, ...updates } : idea
      )
    } : null)
  }, [updateData])

  return {
    shoot: data?.shoot || null,
    postIdeas: data?.postIdeas || [],
    isLoading,
    error,
    refresh,
    updateShoot,
    updatePostIdea
  }
} 