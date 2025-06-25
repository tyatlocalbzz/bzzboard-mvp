import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById, updatePostIdea, deletePostIdea } from '@/lib/db/post-ideas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const postIdeaId = parseInt(id)
    if (isNaN(postIdeaId)) {
      return NextResponse.json({ error: 'Invalid post idea ID' }, { status: 400 })
    }

    // Get post details
    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 })
    }

    // Transform for frontend
    const transformedPostIdea = {
      id: postIdea.id,
      title: postIdea.title,
      platforms: postIdea.platforms,
      contentType: postIdea.contentType,
      caption: postIdea.caption,
      shotList: postIdea.shotList || [],
      status: postIdea.status,
      notes: postIdea.notes,
      client: postIdea.client,
      createdAt: postIdea.createdAt,
      updatedAt: postIdea.updatedAt
    }

    return NextResponse.json({
      success: true,
      postIdea: transformedPostIdea
    })

  } catch (error) {
    console.error('Get post idea error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const postIdeaId = parseInt(id)
    if (isNaN(postIdeaId)) {
      return NextResponse.json({ error: 'Invalid post idea ID' }, { status: 400 })
    }

    const body = await request.json()
    const { title, platforms, contentType, caption, shotList, notes } = body

    const updates: {
      title?: string
      platforms?: string[]
      contentType?: 'photo' | 'video' | 'reel' | 'story'
      caption?: string
      shotList?: string[]
      notes?: string
    } = {}

    if (title) updates.title = title
    if (platforms) updates.platforms = platforms
    if (contentType) updates.contentType = contentType
    if (caption !== undefined) updates.caption = caption
    if (shotList) updates.shotList = shotList
    if (notes !== undefined) updates.notes = notes

    // Verify post exists
    const existingPostIdea = await getPostIdeaById(postIdeaId)
    if (!existingPostIdea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 })
    }

    // Update post idea
    const updatedPostIdea = await updatePostIdea(postIdeaId, updates)
    
    if (!updatedPostIdea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Post idea updated successfully',
      postIdea: {
        id: updatedPostIdea.id,
        title: updatedPostIdea.title,
        platforms: updatedPostIdea.platforms,
        contentType: updatedPostIdea.contentType,
        caption: updatedPostIdea.caption,
        shotList: updatedPostIdea.shotList || [],
        status: updatedPostIdea.status,
        notes: updatedPostIdea.notes
      }
    })

  } catch (error) {
    console.error('Update post idea error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params
    const postIdeaId = parseInt(id)
    if (isNaN(postIdeaId)) {
      return NextResponse.json({ error: 'Invalid post idea ID' }, { status: 400 })
    }

    // Delete post idea
    const result = await deletePostIdea(postIdeaId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.message.includes('not found') ? 404 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Delete post idea error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 