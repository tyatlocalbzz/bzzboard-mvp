import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeasByClient } from '@/lib/db/post-ideas'
import { getShootById, getAssignedPostIdeaIds } from '@/lib/db/shoots'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  validateId
} from '@/lib/api/api-helpers'

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
    const shootId = validateId(id, 'Shoot')

    // Get URL search params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // Verify shoot exists and get client info
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return ApiErrors.notFound('Shoot')
    }

    // Get all post ideas for this client
    const allPosts = await getPostIdeasByClient(shoot.clientId)

    // Get post ideas already assigned to this shoot
    const assignedPostIds = await getAssignedPostIdeaIds(shootId)

    // Filter out already assigned posts
    let availablePosts = allPosts.filter(post => !assignedPostIds.includes(post.id))

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      availablePosts = availablePosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.caption?.toLowerCase().includes(searchLower) ||
        post.platforms.some(platform => platform.toLowerCase().includes(searchLower)) ||
        post.contentType.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status && status !== 'all') {
      availablePosts = availablePosts.filter(post => post.status === status)
    }

    return ApiSuccess.ok({
      posts: availablePosts,
      totalCount: availablePosts.length,
      assignedCount: assignedPostIds.length,
      shoot: {
        id: shoot.id,
        title: shoot.title,
        client: shoot.client
      }
    })

  } catch (error) {
    console.error('❌ [Shoots API] Get available posts error:', error)
    return ApiErrors.internalError('Failed to fetch available posts')
  }
} 