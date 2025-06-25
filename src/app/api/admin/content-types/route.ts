import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { 
  getAllSystemContentTypes,
  createSystemContentType,
  updateSystemContentTypeStatus,
  deleteSystemContentType
} from '@/lib/db/system-settings'

// GET /api/admin/content-types - Get all content types
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

    const contentTypes = await getAllSystemContentTypes()

    return NextResponse.json({
      success: true,
      contentTypes
    })
  } catch (error) {
    console.error('❌ [Admin API] Error fetching content types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content types' },
      { status: 500 }
    )
  }
}

// POST /api/admin/content-types - Create new content type
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
    const { name, value } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Content type name is required' },
        { status: 400 }
      )
    }

    if (!value || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json(
        { error: 'Content type value is required' },
        { status: 400 }
      )
    }

    // Validate value format (lowercase, no spaces)
    const cleanValue = value.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9-]+$/.test(cleanValue)) {
      return NextResponse.json(
        { error: 'Content type value must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const contentType = await createSystemContentType(name, cleanValue)

    return NextResponse.json({
      success: true,
      contentType,
      message: 'Content type created successfully'
    })
  } catch (error) {
    console.error('❌ [Admin API] Error creating content type:', error)
    
    // Handle duplicate name/value error
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Content type name or value already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create content type' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/content-types - Update content type status
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
        { error: 'Valid content type ID and enabled status required' },
        { status: 400 }
      )
    }

    const contentType = await updateSystemContentTypeStatus(id, enabled)

    return NextResponse.json({
      success: true,
      contentType,
      message: `Content type ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('❌ [Admin API] Error updating content type:', error)
    return NextResponse.json(
      { error: 'Failed to update content type' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/content-types - Delete content type
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
        { error: 'Content type ID is required' },
        { status: 400 }
      )
    }

    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid content type ID' },
        { status: 400 }
      )
    }

    await deleteSystemContentType(id)

    return NextResponse.json({
      success: true,
      message: 'Content type deleted successfully'
    })
  } catch (error) {
    console.error('❌ [Admin API] Error deleting content type:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete default content type')) {
        return NextResponse.json(
          { error: 'Cannot delete default content type' },
          { status: 400 }
        )
      }
      if (error.message.includes('Content type not found')) {
        return NextResponse.json(
          { error: 'Content type not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete content type' },
      { status: 500 }
    )
  }
} 