'use client'

import { useState, useMemo, useCallback } from 'react'
import { useClient } from '@/contexts/client-context'
import { useApiData, useApiMutation } from './use-api-data'
import type { PostDependencies } from '@/lib/types/client'

export interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  status: 'planned' | 'shot' | 'uploaded'
  notes?: string
  client: {
    id: number
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface PostsFilters {
  status: 'all' | 'planned' | 'shot' | 'uploaded'
  search: string
}

export interface CreatePostData {
  title: string
  clientName: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
}

export type UpdatePostData = CreatePostData

interface PostsApiResponse {
  posts: PostIdea[]
}

export const usePosts = (initialFilters: Partial<PostsFilters> = {}) => {
  const { selectedClient } = useClient()
  
  // Make filters stateful to prevent recreation on every render
  const [filters, setFilters] = useState<PostsFilters>(() => ({
    status: 'all',
    search: '',
    ...initialFilters
  }))

  // Build endpoint with parameters
  const endpoint = useMemo(() => {
    const params = new URLSearchParams()
    
    // Add client filter
    if (selectedClient.type === 'client') {
      params.append('clientId', selectedClient.id.toString())
    } else {
      params.append('clientId', 'all')
    }

    // Add other filters
    if (filters.status !== 'all') {
      params.append('status', filters.status)
    }
    if (filters.search.trim()) {
      params.append('search', filters.search.trim())
    }

    return `/api/posts?${params.toString()}`
  }, [selectedClient, filters])

  // Transform function to handle both API response formats
  const transform = useCallback((data: unknown) => {
    const result = data as { 
      success?: boolean;
      posts?: unknown[]; 
      data?: { posts?: unknown[] } 
    }
    
    // Handle standardized API format: { success: true, data: { posts: [...] } }
    if (result.success && result.data?.posts) {
      return { posts: Array.isArray(result.data.posts) ? result.data.posts as PostIdea[] : [] }
    }
    // Handle legacy format: { posts: [...] }
    else if (result.posts) {
      return { posts: Array.isArray(result.posts) ? result.posts as PostIdea[] : [] }
    } 
    // Handle direct posts array (fallback)
    else if (Array.isArray(result)) {
      return { posts: result as PostIdea[] }
    }
    else {
      console.error('Unexpected Posts API response format:', result)
      return { posts: [] }
    }
  }, [])

  // Use standardized API data hook
  const { data, isLoading, error, refresh, updateData } = useApiData<PostsApiResponse>({
    endpoint,
    dependencies: [selectedClient, filters],
    transform
  })

  // Mutation hooks
  const createMutation = useApiMutation<PostIdea, CreatePostData>('/api/posts', 'POST')
  const updateMutation = useApiMutation<PostIdea, UpdatePostData & { id: number }>(
    (variables) => `/api/posts/${variables.id}`, 
    'PUT'
  )
  const deleteMutation = useApiMutation<{ deletedItems?: { shoots: number; files: number } }, { id: number; cascade?: boolean }>(
    (variables) => `/api/posts/${variables.id}`, 
    'DELETE'
  )
  const assignMutation = useApiMutation<void, { postId: number; shootId: number }>(
    (variables) => `/api/posts/${variables.postId}/assign-to-shoot`, 
    'POST'
  )

  // Wrapped mutation functions with optimistic updates
  const createPost = useCallback(async (postData: CreatePostData): Promise<PostIdea> => {
    const response = await createMutation.mutate(postData)
    
    // Handle standardized API response format
    // useApiMutation already extracts data from { success: true, data: {...} }
    const result = (response as { post?: PostIdea })?.post || response as PostIdea
    
    // Add to local state
    updateData(prev => prev ? {
      posts: [result, ...prev.posts]
    } : { posts: [result] })
    
    return result
  }, [createMutation, updateData])

  const updatePost = useCallback(async (id: number, postData: UpdatePostData): Promise<PostIdea> => {
    const response = await updateMutation.mutate({ ...postData, id })
    
    // Handle standardized API response format
    const result = (response as { postIdea?: PostIdea })?.postIdea || response as PostIdea
    
    // Update local state
    updateData(prev => prev ? {
      posts: prev.posts.map(p => p.id === id ? result : p)
    } : null)
    
    return result
  }, [updateMutation, updateData])

  const deletePost = useCallback(async (id: number, cascade: boolean = false): Promise<{ deletedItems?: { shoots: number; files: number } }> => {
    const result = await deleteMutation.mutate({ id, cascade })
    
    // Remove from local state
    updateData(prev => prev ? {
      posts: prev.posts.filter(p => p.id !== id)
    } : null)
    
    return result || {}
  }, [deleteMutation, updateData])

  const fetchPostDependencies = useCallback(async (id: number): Promise<PostDependencies | null> => {
    try {
      const response = await fetch(`/api/posts/${id}/dependencies`)
      if (!response.ok) {
        throw new Error('Failed to fetch dependencies')
      }
      const data = await response.json()
      return data.success ? data.data.dependencies : null
    } catch (error) {
      console.error('Error fetching post dependencies:', error)
      return null
    }
  }, [])

  const duplicatePost = useCallback(async (originalPost: PostIdea, newClientName?: string): Promise<PostIdea> => {
    const duplicateData: CreatePostData = {
      title: `${originalPost.title} (Copy)`,
      clientName: newClientName || originalPost.client?.name || '',
      platforms: [...originalPost.platforms],
      contentType: originalPost.contentType,
      caption: originalPost.caption,
      shotList: [...originalPost.shotList],
      notes: originalPost.notes
    }
    
    return createPost(duplicateData)
  }, [createPost])

  const assignToShoot = useCallback(async (postId: number, shootId: number): Promise<void> => {
    await assignMutation.mutate({ postId, shootId })
  }, [assignMutation])

  // Proper filter update functions
  const updateFilters = useCallback((newFilters: Partial<PostsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ status: 'all', search: '' })
  }, [])

  return {
    posts: data?.posts || [],
    loading: isLoading,
    error,
    filters,
    fetchPosts: refresh,
    createPost,
    updatePost,
    duplicatePost,
    deletePost,
    fetchPostDependencies,
    assignToShoot,
    updateFilters,
    resetFilters,
    totalCount: data?.posts?.length || 0
  }
} 