import { db } from './index'
import { postIdeas, clients, shootPostIdeas, uploadedFiles, shoots } from './schema'
import { eq, desc, and, inArray, sql, isNull } from 'drizzle-orm'

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

// ============================================================================
// DEPENDENCY ANALYSIS AND CASCADE DELETE FUNCTIONS
// ============================================================================

export interface PostDependencies {
  shoots: {
    id: number
    title: string
    scheduledAt: string
    status: string
    client: string
  }[]
  uploadedFiles: number
  hasShootDependencies: boolean
  hasFileDependencies: boolean
}

/**
 * Get all dependencies for a post idea to show in delete confirmation
 */
export const getPostIdeaDependencies = async (id: number): Promise<PostDependencies | null> => {
  try {
    console.log('🔍 [getPostIdeaDependencies] Analyzing dependencies for post:', id)
    
    // Check if post exists first
    const existingPost = await db
      .select({ id: postIdeas.id, title: postIdeas.title })
      .from(postIdeas)
      .where(eq(postIdeas.id, id))
      .limit(1)

    if (existingPost.length === 0) {
      console.warn('⚠️ [getPostIdeaDependencies] Post not found:', id)
      return null
    }

    // Get shoots this post is linked to
    const shootDependencies = await db
      .select({
        shootId: shoots.id,
        shootTitle: shoots.title,
        scheduledAt: shoots.scheduledAt,
        status: shoots.status,
        clientName: clients.name
      })
      .from(shootPostIdeas)
      .innerJoin(shoots, eq(shootPostIdeas.shootId, shoots.id))
      .innerJoin(clients, eq(shoots.clientId, clients.id))
      .where(and(
        eq(shootPostIdeas.postIdeaId, id),
        isNull(shoots.deletedAt) // Only count non-deleted shoots
      ))
      .orderBy(desc(shoots.scheduledAt))

    // Get uploaded files count
    const uploadedFilesResult = await db
      .select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`
      })
      .from(uploadedFiles)
      .where(eq(uploadedFiles.postIdeaId, id))

    const fileCount = Number(uploadedFilesResult[0]?.count || 0)

    const dependencies: PostDependencies = {
      shoots: shootDependencies.map(dep => ({
        id: dep.shootId,
        title: dep.shootTitle,
        scheduledAt: dep.scheduledAt.toISOString(),
        status: dep.status,
        client: dep.clientName
      })),
      uploadedFiles: fileCount,
      hasShootDependencies: shootDependencies.length > 0,
      hasFileDependencies: fileCount > 0
    }

    console.log('📊 [getPostIdeaDependencies] Dependencies found:', {
      postId: id,
      shootCount: dependencies.shoots.length,
      fileCount: dependencies.uploadedFiles,
      hasShootDeps: dependencies.hasShootDependencies,
      hasFileDeps: dependencies.hasFileDependencies
    })

    return dependencies
  } catch (error) {
    console.error('❌ [getPostIdeaDependencies] Error:', error)
    throw error
  }
}

/**
 * Cascade delete post idea - removes from shoots and deletes uploaded files first
 */
export const cascadeDeletePostIdea = async (id: number): Promise<{ success: boolean; message: string; deletedItems: { shoots: number; files: number } }> => {
  try {
    console.log('🗑️ [cascadeDeletePostIdea] Starting cascade delete for post:', id)
    
    // Check if post exists
    const existingPost = await db
      .select({ id: postIdeas.id, title: postIdeas.title })
      .from(postIdeas)
      .where(eq(postIdeas.id, id))
      .limit(1)

    if (existingPost.length === 0) {
      return {
        success: false,
        message: 'Post idea not found',
        deletedItems: { shoots: 0, files: 0 }
      }
    }

    const post = existingPost[0]
    console.log('📝 [cascadeDeletePostIdea] Deleting post:', { id: post.id, title: post.title })

    // Step 1: Get current dependencies for logging
    const dependencies = await getPostIdeaDependencies(id)
    const shootCount = dependencies?.shoots.length || 0
    const fileCount = dependencies?.uploadedFiles || 0

    // Step 2: Remove from all shoots
    let removedFromShoots = 0
    if (shootCount > 0) {
      console.log('🔗 [cascadeDeletePostIdea] Removing from shoots...')
      const shootRemovalResult = await db
        .delete(shootPostIdeas)
        .where(eq(shootPostIdeas.postIdeaId, id))
        .returning({ shootId: shootPostIdeas.shootId })
      
      removedFromShoots = shootRemovalResult.length
      console.log('✅ [cascadeDeletePostIdea] Removed from shoots:', removedFromShoots)
    }

    // Step 3: Delete uploaded files
    let deletedFiles = 0
    if (fileCount > 0) {
      console.log('📁 [cascadeDeletePostIdea] Deleting uploaded files...')
      const fileDeleteResult = await db
        .delete(uploadedFiles)
        .where(eq(uploadedFiles.postIdeaId, id))
        .returning({ id: uploadedFiles.id })
      
      deletedFiles = fileDeleteResult.length
      console.log('✅ [cascadeDeletePostIdea] Deleted files:', deletedFiles)
    }

    // Step 4: Delete the post idea itself
    console.log('🗑️ [cascadeDeletePostIdea] Deleting post idea...')
    await db.delete(postIdeas).where(eq(postIdeas.id, id))
    
    console.log('✅ [cascadeDeletePostIdea] Cascade delete completed successfully')
    
    return {
      success: true,
      message: `Post "${post.title}" and all associated data deleted successfully`,
      deletedItems: {
        shoots: removedFromShoots,
        files: deletedFiles
      }
    }
  } catch (error) {
    console.error('❌ [cascadeDeletePostIdea] Error:', error)
    return {
      success: false,
      message: 'Failed to delete post idea and associated data',
      deletedItems: { shoots: 0, files: 0 }
    }
  }
}

/**
 * Enhanced delete post idea with cascade support
 */
export const deletePostIdeaEnhanced = async (id: number, cascade: boolean = false): Promise<{ success: boolean; message: string; deletedItems?: { shoots: number; files: number } }> => {
  try {
    console.log('🗑️ [deletePostIdeaEnhanced] Delete request:', { id, cascade })
    
    // If cascade delete requested, use cascade function
    if (cascade) {
      return await cascadeDeletePostIdea(id)
    }

    // Otherwise, use original logic (check for dependencies first)
    const existingPost = await db
      .select({ id: postIdeas.id, title: postIdeas.title })
      .from(postIdeas)
      .where(eq(postIdeas.id, id))
      .limit(1)

    if (existingPost.length === 0) {
      return {
        success: false,
        message: 'Post idea not found'
      }
    }

    // Check if post idea is linked to any shoots
    const shootLinks = await db
      .select({ shootId: shootPostIdeas.shootId })
      .from(shootPostIdeas)
      .where(eq(shootPostIdeas.postIdeaId, id))
      .limit(1)

    if (shootLinks.length > 0) {
      return {
        success: false,
        message: 'Cannot delete post idea that is linked to shoots. Remove from shoots first or use cascade delete.'
      }
    }

    // Safe to delete (no dependencies)
    await db.delete(postIdeas).where(eq(postIdeas.id, id))
    
    return {
      success: true,
      message: 'Post idea deleted successfully'
    }
  } catch (error) {
    console.error('❌ [deletePostIdeaEnhanced] Error:', error)
    return {
      success: false,
      message: 'Failed to delete post idea'
    }
  }
}

// Keep original function for backward compatibility
export const deletePostIdea = async (id: number): Promise<{ success: boolean; message: string }> => {
  const result = await deletePostIdeaEnhanced(id, false)
  return {
    success: result.success,
    message: result.message
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

// ============================================================================
// AUTOMATIC STATUS UPDATE FUNCTIONS
// ============================================================================

/**
 * Update post statuses to 'shot' when a shoot is completed
 * Only updates posts that are currently 'planned'
 */
export const updatePostStatusesOnShootCompletion = async (shootId: number): Promise<{ updatedCount: number; postIds: number[] }> => {
  try {
    console.log('🎯 [updatePostStatusesOnShootCompletion] Processing shoot:', shootId)
    
    // Get all post ideas assigned to this shoot that are currently 'planned'
    const plannedPosts = await db
      .select({
        postIdeaId: shootPostIdeas.postIdeaId,
        postTitle: postIdeas.title,
        currentStatus: postIdeas.status
      })
      .from(shootPostIdeas)
      .innerJoin(postIdeas, eq(shootPostIdeas.postIdeaId, postIdeas.id))
      .where(and(
        eq(shootPostIdeas.shootId, shootId),
        eq(postIdeas.status, 'planned')
      ))

    console.log('📋 [updatePostStatusesOnShootCompletion] Found planned posts:', {
      count: plannedPosts.length,
      posts: plannedPosts.map(p => ({ id: p.postIdeaId, title: p.postTitle }))
    })

    if (plannedPosts.length === 0) {
      return { updatedCount: 0, postIds: [] }
    }

    // Update all planned posts to 'shot'
    const postIds = plannedPosts.map(p => p.postIdeaId)
    const result = await db
      .update(postIdeas)
      .set({
        status: 'shot',
        updatedAt: new Date(),
      })
      .where(and(
        inArray(postIdeas.id, postIds),
        eq(postIdeas.status, 'planned') // Double-check status to prevent race conditions
      ))
      .returning({ id: postIdeas.id, title: postIdeas.title })

    console.log('✅ [updatePostStatusesOnShootCompletion] Updated posts:', {
      count: result.length,
      posts: result.map(p => ({ id: p.id, title: p.title }))
    })

    return { 
      updatedCount: result.length, 
      postIds: result.map(p => p.id) 
    }
  } catch (error) {
    console.error('❌ [updatePostStatusesOnShootCompletion] Error:', error)
    throw error
  }
}

/**
 * Update post status to 'uploaded' when files are uploaded for it
 * Only updates if the post is currently 'shot'
 */
export const updatePostStatusOnFileUpload = async (postIdeaId: number): Promise<{ updated: boolean; previousStatus: PostIdeaStatus | null }> => {
  try {
    console.log('📤 [updatePostStatusOnFileUpload] Processing post:', postIdeaId)
    
    // Get current post status
    const currentPost = await db
      .select({
        id: postIdeas.id,
        title: postIdeas.title,
        status: postIdeas.status
      })
      .from(postIdeas)
      .where(eq(postIdeas.id, postIdeaId))
      .limit(1)

    if (currentPost.length === 0) {
      console.warn('⚠️ [updatePostStatusOnFileUpload] Post not found:', postIdeaId)
      return { updated: false, previousStatus: null }
    }

    const post = currentPost[0]
    console.log('📊 [updatePostStatusOnFileUpload] Current post status:', {
      id: post.id,
      title: post.title,
      status: post.status
    })

    // Only update if currently 'shot' (don't downgrade from 'uploaded' or upgrade from 'planned')
    if (post.status !== 'shot') {
      console.log('ℹ️ [updatePostStatusOnFileUpload] Post status not eligible for update:', post.status)
      return { updated: false, previousStatus: post.status }
    }

    // Update to 'uploaded'
    const result = await db
      .update(postIdeas)
      .set({
        status: 'uploaded',
        updatedAt: new Date(),
      })
      .where(and(
        eq(postIdeas.id, postIdeaId),
        eq(postIdeas.status, 'shot') // Double-check to prevent race conditions
      ))
      .returning({ id: postIdeas.id, title: postIdeas.title })

    const updated = result.length > 0
    console.log('✅ [updatePostStatusOnFileUpload] Update result:', {
      updated,
      post: updated ? result[0] : null
    })

    return { 
      updated, 
      previousStatus: post.status 
    }
  } catch (error) {
    console.error('❌ [updatePostStatusOnFileUpload] Error:', error)
    throw error
  }
}

/**
 * Bulk update post statuses to 'uploaded' when multiple files are uploaded
 * Only updates posts that are currently 'shot'
 */
export const updatePostStatusesOnBulkFileUpload = async (postIdeaIds: number[]): Promise<{ updatedCount: number; postIds: number[] }> => {
  try {
    console.log('📤 [updatePostStatusesOnBulkFileUpload] Processing posts:', postIdeaIds)
    
    if (postIdeaIds.length === 0) {
      return { updatedCount: 0, postIds: [] }
    }

    // Get current statuses
    const currentPosts = await db
      .select({
        id: postIdeas.id,
        title: postIdeas.title,
        status: postIdeas.status
      })
      .from(postIdeas)
      .where(inArray(postIdeas.id, postIdeaIds))

    const eligiblePosts = currentPosts.filter(p => p.status === 'shot')
    console.log('📊 [updatePostStatusesOnBulkFileUpload] Eligible posts:', {
      total: currentPosts.length,
      eligible: eligiblePosts.length,
      posts: eligiblePosts.map(p => ({ id: p.id, title: p.title, status: p.status }))
    })

    if (eligiblePosts.length === 0) {
      return { updatedCount: 0, postIds: [] }
    }

    // Update eligible posts to 'uploaded'
    const eligibleIds = eligiblePosts.map(p => p.id)
    const result = await db
      .update(postIdeas)
      .set({
        status: 'uploaded',
        updatedAt: new Date(),
      })
      .where(and(
        inArray(postIdeas.id, eligibleIds),
        eq(postIdeas.status, 'shot') // Double-check to prevent race conditions
      ))
      .returning({ id: postIdeas.id, title: postIdeas.title })

    console.log('✅ [updatePostStatusesOnBulkFileUpload] Updated posts:', {
      count: result.length,
      posts: result.map(p => ({ id: p.id, title: p.title }))
    })

    return { 
      updatedCount: result.length, 
      postIds: result.map(p => p.id) 
    }
  } catch (error) {
    console.error('❌ [updatePostStatusesOnBulkFileUpload] Error:', error)
    throw error
  }
}

/**
 * Check and update post status based on uploaded files
 * This is a utility function to sync status with actual file uploads
 */
export const syncPostStatusWithUploads = async (postIdeaId: number): Promise<{ currentStatus: PostIdeaStatus; hasFiles: boolean; updated: boolean }> => {
  try {
    console.log('🔄 [syncPostStatusWithUploads] Syncing post:', postIdeaId)
    
    // Get current post status and check for uploaded files
    const result = await db
      .select({
        postId: postIdeas.id,
        postTitle: postIdeas.title,
        postStatus: postIdeas.status,
        fileCount: sql<number>`COUNT(${uploadedFiles.id})`
      })
      .from(postIdeas)
      .leftJoin(uploadedFiles, eq(uploadedFiles.postIdeaId, postIdeas.id))
      .where(eq(postIdeas.id, postIdeaId))
      .groupBy(postIdeas.id, postIdeas.title, postIdeas.status)
      .limit(1)

    if (result.length === 0) {
      throw new Error(`Post idea ${postIdeaId} not found`)
    }

    const { postStatus, fileCount } = result[0]
    const hasFiles = fileCount > 0

    console.log('📊 [syncPostStatusWithUploads] Current state:', {
      postId: postIdeaId,
      currentStatus: postStatus,
      fileCount,
      hasFiles
    })

    let updated = false

    // If has files but status is 'shot', update to 'uploaded'
    if (hasFiles && postStatus === 'shot') {
      const updateResult = await updatePostStatusOnFileUpload(postIdeaId)
      updated = updateResult.updated
      console.log('📤 [syncPostStatusWithUploads] Status updated to uploaded:', updated)
    }

    return {
      currentStatus: updated ? 'uploaded' : postStatus,
      hasFiles,
      updated
    }
  } catch (error) {
    console.error('❌ [syncPostStatusWithUploads] Error:', error)
    throw error
  }
} 