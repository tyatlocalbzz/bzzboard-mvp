import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllPostIdeas, getPostIdeasByClient, createPostIdea } from '@/lib/db/post-ideas'
import { getClientByName } from '@/lib/db/clients'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let posts
    
    if (clientId && clientId !== 'all') {
      posts = await getPostIdeasByClient(parseInt(clientId))
    } else {
      posts = await getAllPostIdeas()
    }

    // Apply filters
    if (status && status !== 'all') {
      posts = posts.filter(post => post.status === status)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      posts = posts.filter(post => 
        post.title.toLowerCase().includes(searchLower) ||
        post.caption?.toLowerCase().includes(searchLower) ||
        post.notes?.toLowerCase().includes(searchLower)
      )
    }

    // Transform for frontend
    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      platforms: post.platforms,
      contentType: post.contentType,
      caption: post.caption,
      shotList: post.shotList || [],
      status: post.status,
      notes: post.notes,
      client: post.client,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      totalCount: transformedPosts.length
    })

  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserForAPI()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, clientName, platforms, contentType, caption, shotList, notes } = body

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!clientName) {
      return NextResponse.json({ error: 'Client is required' }, { status: 400 })
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 })
    }

    if (!contentType) {
      return NextResponse.json({ error: 'Content type is required' }, { status: 400 })
    }

    // Get client ID
    const client = await getClientByName(clientName)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create post idea
    const postIdea = await createPostIdea({
      title: title.trim(),
      clientId: client.id,
      platforms,
      contentType,
      caption: caption?.trim() || undefined,
      shotList: shotList || [],
      notes: notes?.trim() || undefined
    })

    return NextResponse.json({
      success: true,
      post: {
        id: postIdea.id,
        title: postIdea.title,
        platforms: postIdea.platforms,
        contentType: postIdea.contentType,
        caption: postIdea.caption,
        shotList: postIdea.shotList,
        status: postIdea.status,
        notes: postIdea.notes,
        client: { id: client.id, name: client.name },
        createdAt: postIdea.createdAt.toISOString(),
        updatedAt: postIdea.updatedAt.toISOString()
      },
      message: 'Post idea created successfully'
    })

  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 