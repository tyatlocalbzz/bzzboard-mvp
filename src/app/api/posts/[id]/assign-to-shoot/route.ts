import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById } from '@/lib/db/post-ideas'
import { addPostIdeaToShoot, getShootById } from '@/lib/db/shoots'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

interface AssignToShootBody {
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

    const body = await getValidatedBody<AssignToShootBody>(request)
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

    // Add post to shoot (includes duplicate check)
    try {
      await addPostIdeaToShoot(shootIdInt, postId)
    } catch (error) {
      // Handle duplicate assignment errors
      if (error instanceof Error && (
        error.message.includes('already assigned') ||
        error.message.includes('unique') || 
        error.message.includes('duplicate')
      )) {
        return ApiErrors.conflict('Post is already assigned to this shoot')
      }
      throw error
    }

    return ApiSuccess.ok({}, `Post "${post.title}" assigned to shoot "${shoot.title}" successfully`)

  } catch (error) {
    console.error('❌ [Posts API] Assign post to shoot error:', error)
    return ApiErrors.internalError('Failed to assign post to shoot')
  }
} 