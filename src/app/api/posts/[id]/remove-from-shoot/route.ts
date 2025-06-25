import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById } from '@/lib/db/post-ideas'
import { removePostIdeaFromShoot, getShootById, isPostIdeaAssignedToShoot } from '@/lib/db/shoots'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

interface RemoveFromShootBody {
  shootId: string | number
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
    const postId = validateId(id, 'Post')

    const body = await getValidatedBody<RemoveFromShootBody>(request)
    const { shootId } = body

    if (!shootId) {
      return ApiErrors.badRequest('Shoot ID is required')
    }

    const shootIdInt = validateId(shootId.toString(), 'Shoot')

    // Verify post exists
    const post = await getPostIdeaById(postId)
    if (!post) {
      return ApiErrors.notFound('Post')
    }

    // Verify shoot exists
    const shoot = await getShootById(shootIdInt)
    if (!shoot) {
      return ApiErrors.notFound('Shoot')
    }

    // Check if post is actually assigned to this shoot
    const isAssigned = await isPostIdeaAssignedToShoot(shootIdInt, postId)
    if (!isAssigned) {
      return ApiErrors.notFound('Post assignment')
    }

    // Remove the assignment
    await removePostIdeaFromShoot(shootIdInt, postId)

    return ApiSuccess.ok({}, `Post "${post.title}" removed from shoot "${shoot.title}" successfully`)

  } catch (error) {
    console.error('❌ [Posts API] Remove post from shoot error:', error)
    return ApiErrors.internalError('Failed to remove post from shoot')
  }
} 