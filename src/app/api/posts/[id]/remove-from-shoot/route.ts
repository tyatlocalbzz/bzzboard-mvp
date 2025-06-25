import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById } from '@/lib/db/post-ideas'
import { removePostIdeaFromShoot, getShootById, isPostIdeaAssignedToShoot } from '@/lib/db/shoots'

export async function POST(
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
    const postId = parseInt(id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const body = await request.json()
    const { shootId } = body

    if (!shootId || isNaN(parseInt(shootId))) {
      return NextResponse.json({ error: 'Valid shoot ID is required' }, { status: 400 })
    }

    const shootIdInt = parseInt(shootId)

    // Verify post exists
    const post = await getPostIdeaById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify shoot exists
    const shoot = await getShootById(shootIdInt)
    if (!shoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    // Check if post is actually assigned to this shoot
    const isAssigned = await isPostIdeaAssignedToShoot(shootIdInt, postId)
    if (!isAssigned) {
      return NextResponse.json({ 
        error: 'Post is not assigned to this shoot' 
      }, { status: 404 })
    }

    // Remove the assignment
    await removePostIdeaFromShoot(shootIdInt, postId)

    return NextResponse.json({
      success: true,
      message: `Post "${post.title}" removed from shoot "${shoot.title}" successfully`
    })

  } catch (error) {
    console.error('Remove post from shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 