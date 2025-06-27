import { useCallback } from 'react'
import { useApiData } from './use-api-data'
import type { Shoot, ExtendedPostIdeaWithFiles, UploadedFileWithLinks } from '@/lib/types/shoots'

interface ShootDataResponse {
  shoot: Shoot
  postIdeas: ExtendedPostIdeaWithFiles[]
  miscFiles: UploadedFileWithLinks[]
}

interface UseShootDataOptions {
  shootId: string
  loadPostIdeas?: boolean
  onError?: (error: string) => void
}

interface UseShootDataReturn {
  shoot: Shoot | null
  postIdeas: ExtendedPostIdeaWithFiles[]
  miscFiles: UploadedFileWithLinks[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateShoot: (updates: Partial<Shoot>) => void
  updatePostIdea: (id: number, updates: Partial<ExtendedPostIdeaWithFiles>) => void
}

/**
 * Enhanced shoot data hook with uploaded files support
 * Now handles ExtendedPostIdeaWithFiles and miscFiles from the API
 * Follows standardized API patterns and provides uploaded files data
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
    
    // Handle standardized API response: { success: true, data: { shoot, postIdeas, miscFiles } }
    const response = data as { 
      success?: boolean; 
      data?: { 
        shoot: Shoot; 
        postIdeas?: ExtendedPostIdeaWithFiles[];
        miscFiles?: UploadedFileWithLinks[];
      };
      shoot?: Shoot; 
      postIdeas?: ExtendedPostIdeaWithFiles[];
      miscFiles?: UploadedFileWithLinks[];
    }
    
    // Extract the actual data - handle both formats for compatibility
    let result: { 
      shoot: Shoot; 
      postIdeas?: ExtendedPostIdeaWithFiles[];
      miscFiles?: UploadedFileWithLinks[];
    }
    
    if (response.success && response.data) {
      // Standardized format: { success: true, data: { shoot, postIdeas, miscFiles } }
      result = response.data
      console.log('🔄 [useShootData] Using standardized format from response.data')
    } else if (response.shoot) {
      // Legacy format: { shoot, postIdeas, miscFiles }
      result = { 
        shoot: response.shoot, 
        postIdeas: response.postIdeas,
        miscFiles: response.miscFiles
      }
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
    
    // Post ideas are now already in the correct ExtendedPostIdeaWithFiles format
    // No transformation needed since the API handles this
    const finalResult = {
      shoot: result.shoot,
      postIdeas: result.postIdeas || [],
      miscFiles: result.miscFiles || []
    }
    
    console.log('✅ [useShootData] Transform completed:', finalResult)
    return finalResult
  }, []) // Empty dependencies to make transform stable

  const { data, isLoading, error, refresh, updateData } = useApiData<ShootDataResponse>({
    endpoint,
    dependencies: [shootId], // Remove loadPostIdeas from dependencies to prevent loops
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

  const updatePostIdea = useCallback((id: number, updates: Partial<ExtendedPostIdeaWithFiles>) => {
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
    miscFiles: data?.miscFiles || [],
    isLoading,
    error,
    refresh,
    updateShoot,
    updatePostIdea
  }
} 