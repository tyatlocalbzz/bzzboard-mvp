import { NextRequest } from 'next/server'
import { 
  getAllSystemContentTypes,
  createSystemContentType,
  updateSystemContentTypeStatus,
  deleteSystemContentType
} from '@/lib/db/system-settings'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface CreateContentTypeBody {
  name: string
  value: string
}

interface UpdateContentTypeBody {
  id: number
  enabled: boolean
}

// GET /api/admin/content-types - Get all content types
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

    const contentTypes = await getAllSystemContentTypes()
    return ApiSuccess.ok({ contentTypes })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching content types:', error)
    return ApiErrors.internalError('Failed to fetch content types')
  }
}

// POST /api/admin/content-types - Create new content type
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

    const body = await getValidatedBody<CreateContentTypeBody>(request)
    const { name, value } = body

    if (!name?.trim()) {
      return ApiErrors.badRequest('Content type name is required')
    }

    if (!value?.trim()) {
      return ApiErrors.badRequest('Content type value is required')
    }

    // Validate value format (lowercase, no spaces)
    const cleanValue = value.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9-]+$/.test(cleanValue)) {
      return ApiErrors.badRequest('Content type value must contain only lowercase letters, numbers, and hyphens')
    }

    const contentType = await createSystemContentType(name.trim(), cleanValue)

    return ApiSuccess.created({
      contentType
    }, 'Content type created successfully')
  } catch (error) {
    console.error('❌ [Admin API] Error creating content type:', error)
    
    // Handle duplicate name/value error
    if (error instanceof Error && error.message.includes('unique')) {
      return ApiErrors.conflict('Content type name or value already exists')
    }

    return ApiErrors.internalError('Failed to create content type')
  }
}

// PATCH /api/admin/content-types - Update content type status
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

    const body = await getValidatedBody<UpdateContentTypeBody>(request)
    const { id, enabled } = body

    if (typeof id !== 'number' || typeof enabled !== 'boolean') {
      return ApiErrors.badRequest('Valid content type ID and enabled status required')
    }

    const contentType = await updateSystemContentTypeStatus(id, enabled)

    return ApiSuccess.ok({
      contentType
    }, `Content type ${enabled ? 'enabled' : 'disabled'} successfully`)
  } catch (error) {
    console.error('❌ [Admin API] Error updating content type:', error)
    return ApiErrors.internalError('Failed to update content type')
  }
}

// DELETE /api/admin/content-types - Delete content type
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
      return ApiErrors.badRequest('Content type ID is required')
    }

    const id = validateId(idParam, 'Content type')
    await deleteSystemContentType(id)

    return ApiSuccess.ok({}, 'Content type deleted successfully')
  } catch (error) {
    console.error('❌ [Admin API] Error deleting content type:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete default content type')) {
        return ApiErrors.badRequest('Cannot delete default content type')
      }
      if (error.message.includes('Content type not found')) {
        return ApiErrors.notFound('Content type')
      }
    }

    return ApiErrors.internalError('Failed to delete content type')
  }
} 