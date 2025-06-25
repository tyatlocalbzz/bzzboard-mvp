import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { 
  getAllSystemPlatforms,
  createSystemPlatform,
  updateSystemPlatformStatus,
  deleteSystemPlatform
} from '@/lib/db/system-settings'

// GET /api/admin/platforms - Get all platforms
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

    const platforms = await getAllSystemPlatforms()

    return NextResponse.json({
      success: true,
      platforms
    })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching platforms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    )
  }
}

// POST /api/admin/platforms - Create new platform
export async function POST(request: NextRequest) {
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
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Platform name is required' },
        { status: 400 }
      )
    }

    const platform = await createSystemPlatform(name)

    return NextResponse.json({
      success: true,
      platform,
      message: 'Platform created successfully'
    })
  } catch (error) {
    console.error('❌ [Admin API] Error creating platform:', error)
    
    // Handle duplicate name error
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Platform name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create platform' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/platforms - Update platform status
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
    const { id, enabled } = body

    if (typeof id !== 'number' || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Valid platform ID and enabled status required' },
        { status: 400 }
      )
    }

    const platform = await updateSystemPlatformStatus(id, enabled)

    return NextResponse.json({
      success: true,
      platform,
      message: `Platform ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('❌ [Admin API] Error updating platform:', error)
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/platforms - Delete platform
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return NextResponse.json(
        { error: 'Platform ID is required' },
        { status: 400 }
      )
    }

    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid platform ID' },
        { status: 400 }
      )
    }

    await deleteSystemPlatform(id)

    return NextResponse.json({
      success: true,
      message: 'Platform deleted successfully'
    })
  } catch (error) {
    console.error('❌ [Admin API] Error deleting platform:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete default platform')) {
        return NextResponse.json(
          { error: 'Cannot delete default platform' },
          { status: 400 }
        )
      }
      if (error.message.includes('Platform not found')) {
        return NextResponse.json(
          { error: 'Platform not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    )
  }
} 