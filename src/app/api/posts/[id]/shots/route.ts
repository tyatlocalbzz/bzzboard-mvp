import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById, updatePostIdea } from '@/lib/db/post-ideas'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

interface AddShotBody {
  text: string
  notes?: string
}

interface UpdateShotBody {
  shotId: number
  text: string
  notes?: string
}

export async function POST(
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

    const body = await getValidatedBody<AddShotBody>(request)
    const { text, notes } = body

    if (!text?.trim()) {
      return ApiErrors.badRequest('Shot text is required')
    }

    // Get current post idea
    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return ApiErrors.notFound('Post idea')
    }

    // Add new shot to the shot list
    const currentShotList = postIdea.shotList || []
    const newShotList = [...currentShotList, text.trim()]

    // Update post idea with new shot list
    const updatedPostIdea = await updatePostIdea(postIdeaId, {
      shotList: newShotList
    })

    if (!updatedPostIdea) {
      return ApiErrors.internalError('Failed to add shot')
    }

    // Return the new shot with an ID (index-based)
    const shotId = newShotList.length - 1
    const newShot = {
      id: shotId,
      text: text.trim(),
      notes: notes?.trim() || undefined,
      completed: false,
      postIdeaId: postIdeaId
    }

    return ApiSuccess.ok({
      shot: newShot,
      shotList: newShotList
    }, 'Shot added successfully')

  } catch (error) {
    console.error('❌ [Posts API] Add shot error:', error)
    return ApiErrors.internalError('Failed to add shot')
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

    const body = await getValidatedBody<UpdateShotBody>(request)
    const { shotId, text, notes } = body

    if (shotId === undefined || shotId < 0) {
      return ApiErrors.badRequest('Valid shot ID is required')
    }

    if (!text?.trim()) {
      return ApiErrors.badRequest('Shot text is required')
    }

    // Get current post idea
    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return ApiErrors.notFound('Post idea')
    }

    // Update shot in the shot list
    const currentShotList = postIdea.shotList || []
    if (shotId >= currentShotList.length) {
      return ApiErrors.notFound('Shot')
    }

    const updatedShotList = [...currentShotList]
    updatedShotList[shotId] = text.trim()

    // Update post idea with modified shot list
    const updatedPostIdea = await updatePostIdea(postIdeaId, {
      shotList: updatedShotList
    })

    if (!updatedPostIdea) {
      return ApiErrors.internalError('Failed to update shot')
    }

    // Return the updated shot
    const updatedShot = {
      id: shotId,
      text: text.trim(),
      notes: notes?.trim() || undefined,
      completed: false, // This would need to be tracked separately if needed
      postIdeaId: postIdeaId
    }

    return ApiSuccess.ok({
      shot: updatedShot,
      shotList: updatedShotList
    }, 'Shot updated successfully')

  } catch (error) {
    console.error('❌ [Posts API] Update shot error:', error)
    return ApiErrors.internalError('Failed to update shot')
  }
} 