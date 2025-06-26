import { useCallback } from 'react'
import { useApiData } from './use-api-data'
import type { Shoot, ExtendedPostIdea } from '@/lib/types/shoots'

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
 * Uses centralized types to eliminate duplication and improve maintainability
 * Eliminates ~80 lines of duplicate code by using the generic useApiData hook
 */
export const useShootData = ({ 
  shootId, 
  loadPostIdeas = true,
  onError 
}: UseShootDataOptions): UseShootDataReturn => {
  const endpoint = `/api/shoots/${shootId}`
  
  // Stable transform function to prevent infinite loops
  const transform = useCallback((data: unknown) => {
    console.log('🔄 [useShootData] Transform called with data:', data)
    
    // Handle standardized API response: { success: true, data: { shoot, postIdeas } }
    const response = data as { 
      success?: boolean; 
      data?: { shoot: Shoot; postIdeas?: unknown[] };
      shoot?: Shoot; 
      postIdeas?: unknown[] 
    }
    
    // Extract the actual data - handle both formats for compatibility
    let result: { shoot: Shoot; postIdeas?: unknown[] }
    
    if (response.success && response.data) {
      // Standardized format: { success: true, data: { shoot, postIdeas } }
      result = response.data
      console.log('🔄 [useShootData] Using standardized format from response.data')
    } else if (response.shoot) {
      // Legacy format: { shoot, postIdeas }
      result = { shoot: response.shoot, postIdeas: response.postIdeas }
      console.log('🔄 [useShootData] Using legacy format from response root')
    } else {
      console.error('❌ [useShootData] Unexpected API response format:', response)
      throw new Error('Invalid API response format')
    }
    
    console.log('🔄 [useShootData] Extracted result:', result)
    
    if (!result.shoot) {
      console.error('❌ [useShootData] No shoot data found in response')
      throw new Error('No shoot data found')
    }
    
    // Transform post ideas to match ExtendedPostIdea interface
    // This makes the transform function stable (no dependencies)
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
      } as ExtendedPostIdea
    })
    
    const finalResult = {
      shoot: result.shoot,
      // Filter post ideas based on loadPostIdeas flag in the return, not in transform
      postIdeas: transformedPostIdeas
    }
    
    console.log('✅ [useShootData] Transform completed:', finalResult)
    return finalResult
  }, []) // Empty dependencies to make transform stable

  const { data, isLoading, error, refresh, updateData } = useApiData<ShootDataResponse>({
    endpoint,
    dependencies: [shootId, loadPostIdeas],
    transform,
    onError: onError // Pass onError directly - useApiData will handle memoization
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
    postIdeas: loadPostIdeas ? (data?.postIdeas || []) : [],
    isLoading,
    error,
    refresh,
    updateShoot,
    updatePostIdea
  }
} 