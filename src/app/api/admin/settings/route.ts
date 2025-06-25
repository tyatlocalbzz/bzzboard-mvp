import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { 
  getAllSystemSettings,
  upsertSystemSetting
} from '@/lib/db/system-settings'

// GET /api/admin/settings - Get all system settings
export async function GET() {
  try {
    // Check authentication and admin role
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const settings = await getAllSystemSettings()

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/settings - Update system setting
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Setting value is required' },
        { status: 400 }
      )
    }

    const setting = await upsertSystemSetting(key, value)

    return NextResponse.json({
      success: true,
      setting,
      message: 'Setting updated successfully'
    })
  } catch (error) {
    console.error('❌ [Admin API] Error updating setting:', error)
    
    if (error instanceof Error && error.message.includes('Setting not found')) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
} 