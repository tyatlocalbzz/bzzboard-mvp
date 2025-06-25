import { NextRequest } from 'next/server'
import { 
  getAllSystemPlatforms,
  createSystemPlatform,
  updateSystemPlatformStatus,
  deleteSystemPlatform
} from '@/lib/db/system-settings'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface CreatePlatformBody {
  name: string
}

interface UpdatePlatformBody {
  id: number
  enabled: boolean
}

// GET /api/admin/platforms - Get all platforms
export async function GET() {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    const platforms = await getAllSystemPlatforms()
    return ApiSuccess.ok({ platforms })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching platforms:', error)
    return ApiErrors.internalError('Failed to fetch platforms')
  }
}

// POST /api/admin/platforms - Create new platform
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    const body = await getValidatedBody<CreatePlatformBody>(request)
    const { name } = body

    if (!name?.trim()) {
      return ApiErrors.badRequest('Platform name is required')
    }

    const platform = await createSystemPlatform(name.trim())

    return ApiSuccess.created({
      platform
    }, 'Platform created successfully')
  } catch (error) {
    console.error('❌ [Admin API] Error creating platform:', error)
    
    // Handle duplicate name error
    if (error instanceof Error && error.message.includes('unique')) {
      return ApiErrors.conflict('Platform name already exists')
    }

    return ApiErrors.internalError('Failed to create platform')
  }
}

// PATCH /api/admin/platforms - Update platform status
export async function PATCH(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    const body = await getValidatedBody<UpdatePlatformBody>(request)
    const { id, enabled } = body

    if (typeof id !== 'number' || typeof enabled !== 'boolean') {
      return ApiErrors.badRequest('Valid platform ID and enabled status required')
    }

    const platform = await updateSystemPlatformStatus(id, enabled)

    return ApiSuccess.ok({
      platform
    }, `Platform ${enabled ? 'enabled' : 'disabled'} successfully`)
  } catch (error) {
    console.error('❌ [Admin API] Error updating platform:', error)
    return ApiErrors.internalError('Failed to update platform')
  }
}

// DELETE /api/admin/platforms - Delete platform
export async function DELETE(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }
    if (user.role !== 'admin') {
      return ApiErrors.forbidden()
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return ApiErrors.badRequest('Platform ID is required')
    }

    const id = validateId(idParam, 'Platform')
    await deleteSystemPlatform(id)

    return ApiSuccess.ok({}, 'Platform deleted successfully')
  } catch (error) {
    console.error('❌ [Admin API] Error deleting platform:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete default platform')) {
        return ApiErrors.badRequest('Cannot delete default platform')
      }
      if (error.message.includes('Platform not found')) {
        return ApiErrors.notFound('Platform')
      }
    }

    return ApiErrors.internalError('Failed to delete platform')
  }
} 