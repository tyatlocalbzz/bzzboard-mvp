import { db } from './index'
import { postIdeas, clients, shootPostIdeas } from './schema'
import { eq, desc } from 'drizzle-orm'

// Types for database operations
export type NewPostIdea = typeof postIdeas.$inferInsert
export type PostIdeaSelect = typeof postIdeas.$inferSelect
export type PostIdeaStatus = 'planned' | 'shot' | 'uploaded'
export type ContentType = 'photo' | 'video' | 'reel' | 'story'

export interface PostIdeaWithClient extends PostIdeaSelect {
  client: {
    id: number
    name: string
  } | null
}

export interface CreatePostIdeaInput {
  title: string
  clientId: number
  platforms: string[]
  contentType: ContentType
  caption?: string
  shotList?: string[]
  notes?: string
}

// Get all post ideas with client information
export const getAllPostIdeas = async (): Promise<PostIdeaWithClient[]> => {
  const result = await db
    .select({
      id: postIdeas.id,
      clientId: postIdeas.clientId,
      title: postIdeas.title,
      platforms: postIdeas.platforms,
      contentType: postIdeas.contentType,
      caption: postIdeas.caption,
      shotList: postIdeas.shotList,
      status: postIdeas.status,
      notes: postIdeas.notes,
      createdAt: postIdeas.createdAt,
      updatedAt: postIdeas.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
    })
    .from(postIdeas)
    .leftJoin(clients, eq(postIdeas.clientId, clients.id))
    .orderBy(desc(postIdeas.createdAt))

  return result
}

// Get post ideas by client ID
export const getPostIdeasByClient = async (clientId: number): Promise<PostIdeaWithClient[]> => {
  const result = await db
    .select({
      id: postIdeas.id,
      clientId: postIdeas.clientId,
      title: postIdeas.title,
      platforms: postIdeas.platforms,
      contentType: postIdeas.contentType,
      caption: postIdeas.caption,
      shotList: postIdeas.shotList,
      status: postIdeas.status,
      notes: postIdeas.notes,
      createdAt: postIdeas.createdAt,
      updatedAt: postIdeas.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
    })
    .from(postIdeas)
    .leftJoin(clients, eq(postIdeas.clientId, clients.id))
    .where(eq(postIdeas.clientId, clientId))
    .orderBy(desc(postIdeas.createdAt))

  return result
}

// Get single post idea by ID
export const getPostIdeaById = async (id: number): Promise<PostIdeaWithClient | null> => {
  const result = await db
    .select({
      id: postIdeas.id,
      clientId: postIdeas.clientId,
      title: postIdeas.title,
      platforms: postIdeas.platforms,
      contentType: postIdeas.contentType,
      caption: postIdeas.caption,
      shotList: postIdeas.shotList,
      status: postIdeas.status,
      notes: postIdeas.notes,
      createdAt: postIdeas.createdAt,
      updatedAt: postIdeas.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
    })
    .from(postIdeas)
    .leftJoin(clients, eq(postIdeas.clientId, clients.id))
    .where(eq(postIdeas.id, id))
    .limit(1)

  return result[0] || null
}

// Create new post idea
export const createPostIdea = async (postIdeaData: CreatePostIdeaInput): Promise<PostIdeaSelect> => {
  const [newPostIdea] = await db
    .insert(postIdeas)
    .values({
      title: postIdeaData.title,
      clientId: postIdeaData.clientId,
      platforms: postIdeaData.platforms,
      contentType: postIdeaData.contentType,
      caption: postIdeaData.caption,
      shotList: postIdeaData.shotList || [],
      notes: postIdeaData.notes,
      status: 'planned',
    })
    .returning()

  return newPostIdea
}

// Update post idea
export const updatePostIdea = async (
  id: number,
  updates: Partial<CreatePostIdeaInput>
): Promise<PostIdeaSelect | null> => {
  const [updatedPostIdea] = await db
    .update(postIdeas)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(postIdeas.id, id))
    .returning()

  return updatedPostIdea || null
}

// Update post idea status
export const updatePostIdeaStatus = async (
  id: number,
  status: PostIdeaStatus
): Promise<PostIdeaSelect | null> => {
  const [updatedPostIdea] = await db
    .update(postIdeas)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(postIdeas.id, id))
    .returning()

  return updatedPostIdea || null
}

// Delete post idea
export const deletePostIdea = async (id: number): Promise<{ success: boolean; message: string }> => {
  // Check if post idea is linked to any shoots
  const shootLinks = await db
    .select()
    .from(shootPostIdeas)
    .where(eq(shootPostIdeas.postIdeaId, id))
    .limit(1)

  if (shootLinks.length > 0) {
    return {
      success: false,
      message: 'Cannot delete post idea that is linked to shoots. Remove from shoots first.'
    }
  }

  // Safe to delete
  const result = await db.delete(postIdeas).where(eq(postIdeas.id, id))
  
  return {
    success: result.length > 0,
    message: result.length > 0 ? 'Post idea deleted successfully' : 'Post idea not found'
  }
}

// Get post ideas by status
export const getPostIdeasByStatus = async (status: PostIdeaStatus): Promise<PostIdeaWithClient[]> => {
  const result = await db
    .select({
      id: postIdeas.id,
      clientId: postIdeas.clientId,
      title: postIdeas.title,
      platforms: postIdeas.platforms,
      contentType: postIdeas.contentType,
      caption: postIdeas.caption,
      shotList: postIdeas.shotList,
      status: postIdeas.status,
      notes: postIdeas.notes,
      createdAt: postIdeas.createdAt,
      updatedAt: postIdeas.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
    })
    .from(postIdeas)
    .leftJoin(clients, eq(postIdeas.clientId, clients.id))
    .where(eq(postIdeas.status, status))
    .orderBy(desc(postIdeas.createdAt))

  return result
} 