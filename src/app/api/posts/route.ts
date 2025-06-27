import { NextRequest } from 'next/server'
import { getAllPostIdeas, getPostIdeasByClient, createPostIdea } from '@/lib/db/post-ideas'
import { getClientByName } from '@/lib/db/clients'
import { ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface PostFilters {
  clientId?: string
  status?: string
  search?: string
}

interface CreatePostBody {
  title: string
  clientName: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string[]
  notes?: string
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

    const { searchParams } = new URL(request.url)
    const filters: PostFilters = {
      clientId: searchParams.get('clientId') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined
    }

    // Fetch posts based on client filter
    let posts = filters.clientId && filters.clientId !== 'all' 
      ? await getPostIdeasByClient(parseInt(filters.clientId))
      : await getAllPostIdeas()

    // Apply additional filters
    if (filters.status && filters.status !== 'all') {
      posts = posts.filter(post => post.status === filters.status)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      posts = posts.filter(post => 
        post.title.toLowerCase().includes(searchLower) ||
        post.caption?.toLowerCase().includes(searchLower) ||
        post.notes?.toLowerCase().includes(searchLower)
      )
    }

    // Transform for frontend consistency
    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      platforms: post.platforms,
      contentType: post.contentType,
      caption: post.caption,
      shotList: post.shotList || [],
      status: post.status,
      notes: post.notes,
      client: post.client,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    }))

    return ApiSuccess.ok({
      posts: transformedPosts,
      totalCount: transformedPosts.length
    })

  } catch (error) {
    console.error('❌ [Posts API] Get posts error:', error)
    return ApiErrors.internalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) return ApiErrors.unauthorized()

    const body: CreatePostBody = await request.json()
    const { title, clientName, platforms, contentType, caption, shotList, notes } = body

    // Validation with specific error messages
    if (!title?.trim()) {
      return ApiErrors.badRequest('Title is required')
    }
    if (!clientName) {
      return ApiErrors.badRequest('Client is required')
    }
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return ApiErrors.badRequest('At least one platform is required')
    }
    if (!contentType) {
      return ApiErrors.badRequest('Content type is required')
    }

    // Get client ID
    const client = await getClientByName(clientName)
    if (!client) {
      return ApiErrors.notFound('Client')
    }

    // Create post idea
    const postIdea = await createPostIdea({
      title: title.trim(),
      clientId: client.id,
      platforms,
      contentType,
      caption: caption?.trim() || undefined,
      shotList: shotList || [],
      notes: notes?.trim() || undefined
    })

    const responseData = {
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      caption: postIdea.caption,
      shotList: postIdea.shotList,
      status: postIdea.status,
      notes: postIdea.notes,
      client: { id: client.id, name: client.name },
      createdAt: postIdea.createdAt.toISOString(),
      updatedAt: postIdea.updatedAt.toISOString()
    }

    return ApiSuccess.created({ post: responseData }, 'Post idea created successfully')

  } catch (error) {
    console.error('❌ [Posts API] Create post error:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique')) {
        return ApiErrors.conflict('A post with this title already exists')
      }
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return ApiErrors.badRequest('Invalid client reference')
      }
    }
    
    return ApiErrors.internalError('Failed to create post idea')
  }
} 