import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeasForShoot } from '@/lib/db/shoots'
import { syncPostStatusWithUploads } from '@/lib/db/post-ideas'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  validateId
} from '@/lib/api/api-helpers'

/**
 * Bulk sync all post statuses for a shoot
 * This endpoint syncs all post ideas in a shoot with their uploaded files
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
    const shootId = validateId(id, 'Shoot')

    console.log('🔄 [Shoot Sync API] Bulk syncing post statuses for shoot:', shootId)

    // Get all post ideas for this shoot
    const postIdeas = await getPostIdeasForShoot(shootId)
    console.log('📋 [Shoot Sync API] Found post ideas:', {
      count: postIdeas.length,
      posts: postIdeas.map(p => ({ id: p.id, title: p.title, status: p.status }))
    })

    if (postIdeas.length === 0) {
      return ApiSuccess.ok({
        shootId,
        totalPosts: 0,
        syncedPosts: 0,
        updatedPosts: 0,
        results: []
      }, 'No post ideas found for this shoot')
    }

    // Sync each post individually to get detailed results
    const syncResults = []
    let totalUpdated = 0

    for (const postIdea of postIdeas) {
      try {
        const result = await syncPostStatusWithUploads(postIdea.id)
        syncResults.push({
          postId: postIdea.id,
          title: postIdea.title,
          previousStatus: postIdea.status,
          currentStatus: result.currentStatus,
          hasFiles: result.hasFiles,
          updated: result.updated
        })
        
        if (result.updated) {
          totalUpdated++
        }
      } catch (error) {
        console.error('❌ [Shoot Sync API] Failed to sync post:', postIdea.id, error)
        syncResults.push({
          postId: postIdea.id,
          title: postIdea.title,
          previousStatus: postIdea.status,
          currentStatus: postIdea.status,
          hasFiles: false,
          updated: false,
          error: 'Sync failed'
        })
      }
    }

    console.log('✅ [Shoot Sync API] Bulk sync completed:', {
      shootId,
      totalPosts: postIdeas.length,
      syncedPosts: syncResults.length,
      updatedPosts: totalUpdated
    })

    return ApiSuccess.ok({
      shootId,
      totalPosts: postIdeas.length,
      syncedPosts: syncResults.length,
      updatedPosts: totalUpdated,
      results: syncResults
    }, `Bulk sync completed: ${totalUpdated} posts updated`)

  } catch (error) {
    console.error('❌ [Shoot Sync API] Error in bulk sync:', error)
    return ApiErrors.internalError('Failed to sync post statuses')
  }
} 