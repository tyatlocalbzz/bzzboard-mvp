import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById, updatePostIdea, deletePostIdea } from '@/lib/db/post-ideas'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

interface UpdatePostBody {
  title?: string
  platforms?: string[]
  contentType?: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string[]
  notes?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    const postIdeaId = validateId(id, 'Post idea')

    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return ApiErrors.notFound('Post idea')
    }

    // Transform for frontend
    const transformedPostIdea = {
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      caption: postIdea.caption,
      shotList: postIdea.shotList || [],
      status: postIdea.status,
      notes: postIdea.notes,
      client: postIdea.client,
      createdAt: postIdea.createdAt,
      updatedAt: postIdea.updatedAt
    }

    return ApiSuccess.ok({ postIdea: transformedPostIdea })

  } catch (error) {
    console.error('❌ [Posts API] Get post idea error:', error)
    return ApiErrors.internalError('Failed to fetch post idea')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    const postIdeaId = validateId(id, 'Post idea')

    const body = await getValidatedBody<UpdatePostBody>(request)
    const { title, platforms, contentType, caption, shotList, notes } = body

    const updates: UpdatePostBody = {}
    if (title) updates.title = title
    if (platforms) updates.platforms = platforms
    if (contentType) updates.contentType = contentType
    if (caption !== undefined) updates.caption = caption
    if (shotList) updates.shotList = shotList
    if (notes !== undefined) updates.notes = notes

    // Verify post exists
    const existingPostIdea = await getPostIdeaById(postIdeaId)
    if (!existingPostIdea) {
      return ApiErrors.notFound('Post idea')
    }

    // Update post idea
    const updatedPostIdea = await updatePostIdea(postIdeaId, updates)
    
    if (!updatedPostIdea) {
      return ApiErrors.notFound('Post idea')
    }

    const postIdeaData = {
      id: updatedPostIdea.id,
      title: updatedPostIdea.title,
      platforms: updatedPostIdea.platforms,
      contentType: updatedPostIdea.contentType,
      caption: updatedPostIdea.caption,
      shotList: updatedPostIdea.shotList || [],
      status: updatedPostIdea.status,
      notes: updatedPostIdea.notes
    }

    return ApiSuccess.ok({ postIdea: postIdeaData }, 'Post idea updated successfully')

  } catch (error) {
    console.error('❌ [Posts API] Update post idea error:', error)
    return ApiErrors.internalError('Failed to update post idea')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    const postIdeaId = validateId(id, 'Post idea')

    const result = await deletePostIdea(postIdeaId)

    if (!result.success) {
      if (result.message.includes('not found')) {
        return ApiErrors.notFound('Post idea')
      }
      return ApiErrors.badRequest(result.message)
    }

    return ApiSuccess.ok({}, result.message)

  } catch (error) {
    console.error('❌ [Posts API] Delete post idea error:', error)
    return ApiErrors.internalError('Failed to delete post idea')
  }
} 