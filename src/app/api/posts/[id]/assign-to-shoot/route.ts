import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeaById } from '@/lib/db/post-ideas'
import { addPostIdeaToShoot, getShootById } from '@/lib/db/shoots'

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

    // Add post to shoot (includes duplicate check)
    try {
      await addPostIdeaToShoot(shootIdInt, postId)
    } catch (error) {
      // If there's a duplicate assignment error
      if (error instanceof Error && error.message.includes('already assigned')) {
        return NextResponse.json({ 
          error: 'Post is already assigned to this shoot' 
        }, { status: 409 })
      }
      // If there's a unique constraint violation from database
      if (error instanceof Error && (error.message.includes('unique') || error.message.includes('duplicate'))) {
        return NextResponse.json({ 
          error: 'Post is already assigned to this shoot' 
        }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Post "${post.title}" assigned to shoot "${shoot.title}" successfully`
    })

  } catch (error) {
    console.error('Assign post to shoot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 