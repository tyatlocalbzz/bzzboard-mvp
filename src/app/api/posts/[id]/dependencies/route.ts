import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaDependencies } from '@/lib/db/post-ideas'
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
    const postIdeaId = validateId(id, 'Post idea')

    const dependencies = await getPostIdeaDependencies(postIdeaId)
    
    if (!dependencies) {
      return ApiErrors.notFound('Post idea')
    }

    return ApiSuccess.ok({ dependencies }, 'Dependencies retrieved successfully')

  } catch (error) {
    console.error('❌ [Posts Dependencies API] Error:', error)
    return ApiErrors.internalError('Failed to fetch post dependencies')
  }
} 