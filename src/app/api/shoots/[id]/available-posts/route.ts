import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getPostIdeasByClient } from '@/lib/db/post-ideas'
import { getShootById, getAssignedPostIdeaIds } from '@/lib/db/shoots'

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
    const shootId = parseInt(id)
    if (isNaN(shootId)) {
      return NextResponse.json({ error: 'Invalid shoot ID' }, { status: 400 })
    }

    // Get URL search params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // Verify shoot exists and get client info
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 })
    }

    // Get all post ideas for this client
    const allPosts = await getPostIdeasByClient(shoot.clientId)

    // Get post ideas already assigned to this shoot
    const assignedPostIds = await getAssignedPostIdeaIds(shootId)

    // Filter out already assigned posts
    let availablePosts = allPosts.filter(post => !assignedPostIds.includes(post.id))

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      availablePosts = availablePosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.caption?.toLowerCase().includes(searchLower) ||
        post.platforms.some(platform => platform.toLowerCase().includes(searchLower)) ||
        post.contentType.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status && status !== 'all') {
      availablePosts = availablePosts.filter(post => post.status === status)
    }

    return NextResponse.json({
      success: true,
      posts: availablePosts,
      totalCount: availablePosts.length,
      assignedCount: assignedPostIds.length,
      shoot: {
        id: shoot.id,
        title: shoot.title,
        client: shoot.client
      }
    })

  } catch (error) {
    console.error('Get available posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 