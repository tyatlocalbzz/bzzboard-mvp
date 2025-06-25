import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById, updatePostIdea } from '@/lib/db/post-ideas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const postIdeaId = parseInt(id)
    if (isNaN(postIdeaId)) {
      return NextResponse.json({ error: 'Invalid post idea ID' }, { status: 400 })
    }

    const body = await request.json()
    const { text, notes } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Shot text is required' }, { status: 400 })
    }

    // Get current post idea
    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 })
    }

    // Add new shot to the shot list
    const currentShotList = postIdea.shotList || []
    const newShotList = [...currentShotList, text.trim()]

    // Update post idea with new shot list
    const updatedPostIdea = await updatePostIdea(postIdeaId, {
      shotList: newShotList
    })

    if (!updatedPostIdea) {
      return NextResponse.json({ error: 'Failed to add shot' }, { status: 500 })
    }

    // Return the new shot with an ID (index-based)
    const shotId = newShotList.length - 1
    const newShot = {
      id: shotId,
      text: text.trim(),
      notes: notes?.trim() || undefined,
      completed: false,
      postIdeaId: postIdeaId
    }

    return NextResponse.json({
      success: true,
      message: 'Shot added successfully',
      shot: newShot,
      shotList: newShotList
    })

  } catch (error) {
    console.error('Add shot error:', error)
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
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const postIdeaId = parseInt(id)
    if (isNaN(postIdeaId)) {
      return NextResponse.json({ error: 'Invalid post idea ID' }, { status: 400 })
    }

    const body = await request.json()
    const { shotId, text, notes } = body

    if (shotId === undefined || shotId < 0) {
      return NextResponse.json({ error: 'Valid shot ID is required' }, { status: 400 })
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Shot text is required' }, { status: 400 })
    }

    // Get current post idea
    const postIdea = await getPostIdeaById(postIdeaId)
    if (!postIdea) {
      return NextResponse.json({ error: 'Post idea not found' }, { status: 404 })
    }

    // Update shot in the shot list
    const currentShotList = postIdea.shotList || []
    if (shotId >= currentShotList.length) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 })
    }

    const updatedShotList = [...currentShotList]
    updatedShotList[shotId] = text.trim()

    // Update post idea with modified shot list
    const updatedPostIdea = await updatePostIdea(postIdeaId, {
      shotList: updatedShotList
    })

    if (!updatedPostIdea) {
      return NextResponse.json({ error: 'Failed to update shot' }, { status: 500 })
    }

    // Return the updated shot
    const updatedShot = {
      id: shotId,
      text: text.trim(),
      notes: notes?.trim() || undefined,
      completed: false, // This would need to be tracked separately if needed
      postIdeaId: postIdeaId
    }

    return NextResponse.json({
      success: true,
      message: 'Shot updated successfully',
      shot: updatedShot,
      shotList: updatedShotList
    })

  } catch (error) {
    console.error('Update shot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 