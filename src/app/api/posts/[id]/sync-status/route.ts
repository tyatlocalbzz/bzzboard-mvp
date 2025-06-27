import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { syncPostStatusWithUploads } from '@/lib/db/post-ideas'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  validateId
} from '@/lib/api/api-helpers'

/**
 * Sync post status with uploaded files
 * This endpoint can be used to manually sync a post's status based on uploaded files
 * Useful for fixing inconsistencies or after bulk operations
 */
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

    console.log('🔄 [Post Sync API] Syncing post status:', postIdeaId)

    // Sync the post status with uploaded files
    const result = await syncPostStatusWithUploads(postIdeaId)

    console.log('✅ [Post Sync API] Sync completed:', {
      postId: postIdeaId,
      currentStatus: result.currentStatus,
      hasFiles: result.hasFiles,
      updated: result.updated
    })

    return ApiSuccess.ok({
      postId: postIdeaId,
      currentStatus: result.currentStatus,
      hasFiles: result.hasFiles,
      updated: result.updated,
      message: result.updated 
        ? `Post status updated to '${result.currentStatus}' based on uploaded files`
        : `Post status is already correct: '${result.currentStatus}'`
    }, 'Post status sync completed')

  } catch (error) {
    console.error('❌ [Post Sync API] Error syncing post status:', error)
    return ApiErrors.internalError('Failed to sync post status')
  }
} 