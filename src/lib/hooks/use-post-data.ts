import { useCallback } from 'react'
import { useApiData, useApiMutation } from './use-api-data'
import type { PostIdea } from './use-posts'

interface UsePostDataOptions {
  postId: string
  onError?: (error: string) => void
}

interface UsePostDataReturn {
  post: PostIdea | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updatePost: (updates: Partial<PostIdea>) => void
  deletePost: () => Promise<void>
  isDeleting: boolean
}

/**
 * Enhanced post data hook for individual post management
 * Follows established patterns with standardized API integration
 * Provides CRUD operations with optimistic updates
 */
export const usePostData = ({ 
  postId, 
  onError 
}: UsePostDataOptions): UsePostDataReturn => {
  const endpoint = `/api/posts/${postId}`
  
  // Stable transform function to prevent infinite loops
  const transform = useCallback((data: unknown) => {
    console.log('🔄 [usePostData] Transform called with data:', data)
    
    // Handle standardized API response: { success: true, data: { postIdea: {...} } }
    const response = data as { 
      success?: boolean; 
      data?: { postIdea: PostIdea };
      postIdea?: PostIdea;
    }
    
    // Extract the post data - handle both formats for compatibility
    let postIdea: PostIdea | undefined
    
    if (response.success && response.data?.postIdea) {
      // Standardized format: { success: true, data: { postIdea: {...} } }
      postIdea = response.data.postIdea
      console.log('🔄 [usePostData] Using standardized format from response.data')
    } else if (response.postIdea) {
      // Legacy format: { postIdea: {...} }
      postIdea = response.postIdea
      console.log('🔄 [usePostData] Using legacy format from response root')
    } else {
      console.error('❌ [usePostData] Unexpected API response format:', response)
      throw new Error('Invalid API response format')
    }
    
    console.log('🔄 [usePostData] Extracted post:', postIdea)
    
    if (!postIdea) {
      console.error('❌ [usePostData] No post data found in response')
      throw new Error('No post data found')
    }
    
    console.log('✅ [usePostData] Transform completed:', postIdea)
    return postIdea
  }, []) // Empty dependencies to make transform stable

  const { data: post, isLoading, error, refresh, updateData } = useApiData<PostIdea>({
    endpoint,
    dependencies: [postId],
    transform,
    onError: onError // Pass onError directly - useApiData will handle memoization
  })

  // Delete mutation
  const deleteMutation = useApiMutation<void, { id: string }>(
    (variables) => `/api/posts/${variables.id}`, 
    'DELETE'
  )

  // Memoize convenience update function to prevent recreation
  const updatePost = useCallback((updates: Partial<PostIdea>) => {
    updateData(prev => prev ? { ...prev, ...updates } : null)
  }, [updateData])

  // Delete function with proper error handling
  const deletePost = useCallback(async (): Promise<void> => {
    if (!post) {
      console.warn('⚠️ [usePostData] Delete attempted before post data loaded')
      throw new Error('Post not loaded')
    }
    
    try {
      await deleteMutation.mutate({ id: postId })
      console.log('✅ [usePostData] Post deleted successfully')
    } catch (error) {
      console.error('❌ [usePostData] Failed to delete post:', error)
      throw error
    }
  }, [post, postId, deleteMutation])

  return {
    post,
    isLoading,
    error,
    refresh,
    updatePost,
    deletePost,
    isDeleting: deleteMutation.isLoading
  }
} 