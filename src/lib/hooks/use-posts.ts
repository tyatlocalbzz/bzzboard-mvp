'use client'

import { useState, useEffect, useCallback } from 'react'
import { useClient } from '@/contexts/client-context'

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

export interface PostsResponse {
  success: boolean
  posts: PostIdea[]
  totalCount: number
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

export const usePosts = (initialFilters?: Partial<PostsFilters>) => {
  const [posts, setPosts] = useState<PostIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PostsFilters>({
    status: 'all',
    search: '',
    ...initialFilters
  })

  const { selectedClient } = useClient()

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

      const response = await fetch(`/api/posts?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }

      const data: PostsResponse = await response.json()
      
      if (data.success) {
        setPosts(data.posts)
      } else {
        throw new Error('Failed to fetch posts')
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [selectedClient, filters])

  const createPost = useCallback(async (data: CreatePostData): Promise<PostIdea> => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create post')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create post')
    }

    // Add to local state
    setPosts(prev => [result.post, ...prev])
    
    return result.post
  }, [])

  const updatePost = useCallback(async (id: number, data: UpdatePostData): Promise<PostIdea> => {
    const response = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update post')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update post')
    }

    // Update local state
    setPosts(prev => prev.map(post => 
      post.id === id ? result.post : post
    ))
    
    return result.post
  }, [])

  const deletePost = useCallback(async (id: number): Promise<void> => {
    const response = await fetch(`/api/posts/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete post')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete post')
    }

    // Remove from local state
    setPosts(prev => prev.filter(post => post.id !== id))
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

    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to duplicate post')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to duplicate post')
    }

    // Add to local state
    setPosts(prev => [result.post, ...prev])
    
    return result.post
  }, [])

  const assignToShoot = useCallback(async (postId: number, shootId: number): Promise<void> => {
    const response = await fetch(`/api/posts/${postId}/assign-to-shoot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shootId })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to assign post to shoot')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to assign post to shoot')
    }
  }, [])

  const updateFilters = useCallback((newFilters: Partial<PostsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ status: 'all', search: '' })
  }, [])

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return {
    posts,
    loading,
    error,
    filters,
    fetchPosts,
    createPost,
    updatePost,
    duplicatePost,
    deletePost,
    assignToShoot,
    updateFilters,
    resetFilters,
    totalCount: posts.length
  }
} 