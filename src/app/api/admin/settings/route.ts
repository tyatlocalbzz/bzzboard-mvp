import { NextRequest } from 'next/server'
import { 
  getAllSystemSettings,
  upsertSystemSetting,
  ensureDefaultSettings
} from '@/lib/db/system-settings'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedBody 
} from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

interface UpdateSettingBody {
  key: string
  value: string
  type?: string
  description?: string
}

// GET /api/admin/settings - Get all system settings
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

    // Ensure default settings exist
    await ensureDefaultSettings()

    const settings = await getAllSystemSettings()
    
    // Debug logging
    console.log('🔧 [API] Admin settings GET - timezone setting:', settings.find(s => s.key === 'default_timezone'))

    return ApiSuccess.ok({ settings })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching settings:', error)
    return ApiErrors.internalError('Failed to fetch settings')
  }
}

// PATCH /api/admin/settings - Update system setting
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

    const body = await getValidatedBody<UpdateSettingBody>(request)
    const { key, value } = body

    console.log('🔧 [API] Admin settings PATCH request:', { key, value, body })

    if (!key || typeof key !== 'string') {
      return ApiErrors.badRequest('Setting key is required')
    }

    if (value === undefined || value === null) {
      return ApiErrors.badRequest('Setting value is required')
    }

    const { type = 'string', description } = body
    const setting = await upsertSystemSetting(key, value, type, description)
    
    console.log('🔧 [API] Admin settings PATCH result:', setting)

    return ApiSuccess.ok({
      setting
    }, 'Setting updated successfully')
  } catch (error) {
    console.error('❌ [Admin API] Error updating setting:', error)
    
    if (error instanceof Error && error.message.includes('Setting not found')) {
      return ApiErrors.notFound('Setting')
    }

    return ApiErrors.internalError('Failed to update setting')
  }
} 