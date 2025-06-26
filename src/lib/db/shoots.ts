import { db } from './index'
import { shoots, clients, postIdeas, shootPostIdeas } from './schema'
import { eq, desc, asc, and, sql, isNull } from 'drizzle-orm'
import type { ShootStatus, ShootWithClient, CreateShootInput } from '@/lib/types/shoots'

// Types for database operations
export type NewShoot = typeof shoots.$inferInsert
export type ShootSelect = typeof shoots.$inferSelect

// Re-export consolidated types from main types file
export type { ShootStatus, ShootWithClient, CreateShootInput }

// Type helper to ensure proper typing from database results
interface DatabaseShootResult {
  id: number
  title: string
  clientId: number
  scheduledAt: Date
  duration: number
  location: string | null
  notes: string | null
  status: string
  startedAt: Date | null
  completedAt: Date | null
  googleCalendarEventId: string | null
  googleCalendarSyncStatus: string | null
  googleCalendarLastSync: Date | null
  googleCalendarError: string | null
  deletedAt: Date | null
  deletedBy: number | null
  createdAt: Date
  updatedAt: Date
  client: { id: number; name: string } | null
  postIdeasCount: number
}

const transformShootResult = (row: DatabaseShootResult): ShootWithClient => ({
  ...row,
  status: row.status as ShootStatus,
  googleCalendarSyncStatus: row.googleCalendarSyncStatus as 'pending' | 'synced' | 'error' | null
})

// Get all active (non-deleted) shoots with client information and post ideas count
export const getAllShoots = async (): Promise<ShootWithClient[]> => {
  const result = await db
    .select({
      id: shoots.id,
      title: shoots.title,
      clientId: shoots.clientId,
      scheduledAt: shoots.scheduledAt,
      duration: shoots.duration,
      location: shoots.location,
      notes: shoots.notes,
      status: shoots.status,
      startedAt: shoots.startedAt,
      completedAt: shoots.completedAt,
      // Google Calendar integration fields
      googleCalendarEventId: shoots.googleCalendarEventId,
      googleCalendarSyncStatus: shoots.googleCalendarSyncStatus,
      googleCalendarLastSync: shoots.googleCalendarLastSync,
      googleCalendarError: shoots.googleCalendarError,
      // Soft delete fields
      deletedAt: shoots.deletedAt,
      deletedBy: shoots.deletedBy,
      createdAt: shoots.createdAt,
      updatedAt: shoots.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
      postIdeasCount: sql<number>`cast(count(${shootPostIdeas.id}) as int)`,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(shootPostIdeas, eq(shoots.id, shootPostIdeas.shootId))
    .where(isNull(shoots.deletedAt)) // Only return non-deleted shoots
    .groupBy(shoots.id, clients.id, clients.name)
    .orderBy(desc(shoots.scheduledAt))

  return result.map(transformShootResult)
}

// Get shoots by client ID
export const getShootsByClient = async (clientId: number): Promise<ShootWithClient[]> => {
  const result = await db
    .select({
      id: shoots.id,
      title: shoots.title,
      clientId: shoots.clientId,
      scheduledAt: shoots.scheduledAt,
      duration: shoots.duration,
      location: shoots.location,
      notes: shoots.notes,
      status: shoots.status,
      startedAt: shoots.startedAt,
      completedAt: shoots.completedAt,
      // Google Calendar integration fields
      googleCalendarEventId: shoots.googleCalendarEventId,
      googleCalendarSyncStatus: shoots.googleCalendarSyncStatus,
      googleCalendarLastSync: shoots.googleCalendarLastSync,
      googleCalendarError: shoots.googleCalendarError,
      // Soft delete fields
      deletedAt: shoots.deletedAt,
      deletedBy: shoots.deletedBy,
      createdAt: shoots.createdAt,
      updatedAt: shoots.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
      postIdeasCount: sql<number>`cast(count(${shootPostIdeas.id}) as int)`,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(shootPostIdeas, eq(shoots.id, shootPostIdeas.shootId))
    .where(and(
      eq(shoots.clientId, clientId),
      isNull(shoots.deletedAt) // Only return non-deleted shoots
    ))
    .groupBy(shoots.id, clients.id, clients.name)
    .orderBy(desc(shoots.scheduledAt))

  return result.map(transformShootResult)
}

// Get single shoot by ID with client information
export const getShootById = async (id: number): Promise<ShootWithClient | null> => {
  const result = await db
    .select({
      id: shoots.id,
      title: shoots.title,
      clientId: shoots.clientId,
      scheduledAt: shoots.scheduledAt,
      duration: shoots.duration,
      location: shoots.location,
      notes: shoots.notes,
      status: shoots.status,
      startedAt: shoots.startedAt,
      completedAt: shoots.completedAt,
      // Google Calendar integration fields
      googleCalendarEventId: shoots.googleCalendarEventId,
      googleCalendarSyncStatus: shoots.googleCalendarSyncStatus,
      googleCalendarLastSync: shoots.googleCalendarLastSync,
      googleCalendarError: shoots.googleCalendarError,
      // Soft delete fields
      deletedAt: shoots.deletedAt,
      deletedBy: shoots.deletedBy,
      createdAt: shoots.createdAt,
      updatedAt: shoots.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
      postIdeasCount: sql<number>`cast(count(${shootPostIdeas.id}) as int)`,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(shootPostIdeas, eq(shoots.id, shootPostIdeas.shootId))
    .where(and(
      eq(shoots.id, id),
      isNull(shoots.deletedAt) // Only return non-deleted shoots
    ))
    .groupBy(shoots.id, clients.id, clients.name)
    .limit(1)

  return result[0] ? transformShootResult(result[0]) : null
}

// Create new shoot
export const createShoot = async (shootData: CreateShootInput): Promise<ShootSelect> => {
  const [newShoot] = await db
    .insert(shoots)
    .values({
      title: shootData.title,
      clientId: shootData.clientId,
      scheduledAt: shootData.scheduledAt,
      duration: shootData.duration,
      location: shootData.location,
      notes: shootData.notes,
      status: 'scheduled',
    })
    .returning()

  return newShoot
}

// Update shoot status
export const updateShootStatus = async (
  id: number, 
  status: ShootStatus,
  timestamps?: { startedAt?: Date; completedAt?: Date }
): Promise<ShootSelect | null> => {
  const updateData: Partial<NewShoot> = {
    status,
    updatedAt: new Date(),
  }

  if (timestamps?.startedAt) {
    updateData.startedAt = timestamps.startedAt
  }

  if (timestamps?.completedAt) {
    updateData.completedAt = timestamps.completedAt
  }

  const [updatedShoot] = await db
    .update(shoots)
    .set(updateData)
    .where(eq(shoots.id, id))
    .returning()

  return updatedShoot || null
}

// Update shoot details
export const updateShoot = async (
  id: number,
  updates: Partial<CreateShootInput & {
    googleCalendarEventId?: string | null
    googleCalendarSyncStatus?: 'pending' | 'synced' | 'error' | null
    googleCalendarLastSync?: Date | null
    googleCalendarError?: string | null
  }>
): Promise<ShootSelect | null> => {
  const [updatedShoot] = await db
    .update(shoots)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(shoots.id, id))
    .returning()

  return updatedShoot || null
}

// Soft delete shoot
export const deleteShoot = async (id: number, deletedBy?: number): Promise<boolean> => {
  try {
    const result = await db
      .update(shoots)
      .set({
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        updatedAt: new Date()
      })
      .where(and(
        eq(shoots.id, id),
        isNull(shoots.deletedAt) // Only delete if not already deleted
      ))
      .returning()
    
    return result.length > 0
  } catch (error) {
    console.error('❌ [DB] Error soft deleting shoot:', error)
    throw new Error('Failed to delete shoot from database')
  }
}

// Hard delete shoot (for permanent cleanup)
export const hardDeleteShoot = async (id: number): Promise<boolean> => {
  try {
    // First delete related shoot_post_ideas
    await db.delete(shootPostIdeas).where(eq(shootPostIdeas.shootId, id))
    
    // Then delete the shoot
    const result = await db.delete(shoots).where(eq(shoots.id, id))
    
    return result.length > 0
  } catch (error) {
    console.error('❌ [DB] Error hard deleting shoot:', error)
    throw new Error('Failed to permanently delete shoot from database')
  }
}

// Restore soft deleted shoot
export const restoreShoot = async (id: number): Promise<boolean> => {
  try {
    const result = await db
      .update(shoots)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date()
      })
      .where(eq(shoots.id, id))
      .returning()
    
    return result.length > 0
  } catch (error) {
    console.error('❌ [DB] Error restoring shoot:', error)
    throw new Error('Failed to restore shoot')
  }
}

// Get deleted shoots (for recovery interface)
export const getDeletedShoots = async (): Promise<ShootWithClient[]> => {
  const result = await db
    .select({
      id: shoots.id,
      title: shoots.title,
      clientId: shoots.clientId,
      scheduledAt: shoots.scheduledAt,
      duration: shoots.duration,
      location: shoots.location,
      notes: shoots.notes,
      status: shoots.status,
      startedAt: shoots.startedAt,
      completedAt: shoots.completedAt,
      // Google Calendar integration fields
      googleCalendarEventId: shoots.googleCalendarEventId,
      googleCalendarSyncStatus: shoots.googleCalendarSyncStatus,
      googleCalendarLastSync: shoots.googleCalendarLastSync,
      googleCalendarError: shoots.googleCalendarError,
      // Soft delete fields
      deletedAt: shoots.deletedAt,
      deletedBy: shoots.deletedBy,
      createdAt: shoots.createdAt,
      updatedAt: shoots.updatedAt,
      client: {
        id: clients.id,
        name: clients.name,
      },
      postIdeasCount: sql<number>`cast(count(${shootPostIdeas.id}) as int)`,
    })
    .from(shoots)
    .leftJoin(clients, eq(shoots.clientId, clients.id))
    .leftJoin(shootPostIdeas, eq(shoots.id, shootPostIdeas.shootId))
    .where(sql`${shoots.deletedAt} IS NOT NULL`) // Only return deleted shoots
    .groupBy(shoots.id, clients.id, clients.name)
    .orderBy(desc(shoots.deletedAt))

  return result.map(transformShootResult)
}

// Get post ideas for a shoot with their shot lists
export const getPostIdeasForShoot = async (shootId: number) => {
  const result = await db
    .select({
      id: postIdeas.id,
      title: postIdeas.title,
      platforms: postIdeas.platforms,
      contentType: postIdeas.contentType,
      caption: postIdeas.caption,
      shotList: postIdeas.shotList,
      status: postIdeas.status,
      notes: postIdeas.notes,
      completed: shootPostIdeas.completed,
      completedAt: shootPostIdeas.completedAt,
    })
    .from(shootPostIdeas)
    .innerJoin(postIdeas, eq(shootPostIdeas.postIdeaId, postIdeas.id))
    .where(eq(shootPostIdeas.shootId, shootId))
    .orderBy(asc(postIdeas.createdAt))

  return result
}

// Check if post idea is already assigned to shoot
export const isPostIdeaAssignedToShoot = async (shootId: number, postIdeaId: number): Promise<boolean> => {
  const result = await db
    .select()
    .from(shootPostIdeas)
    .where(and(
      eq(shootPostIdeas.shootId, shootId),
      eq(shootPostIdeas.postIdeaId, postIdeaId)
    ))
    .limit(1)

  return result.length > 0
}

// Get post ideas that are already assigned to a specific shoot
export const getAssignedPostIdeaIds = async (shootId: number): Promise<number[]> => {
  const result = await db
    .select({
      postIdeaId: shootPostIdeas.postIdeaId
    })
    .from(shootPostIdeas)
    .where(eq(shootPostIdeas.shootId, shootId))

  return result.map(row => row.postIdeaId)
}

// Add post idea to shoot with duplicate check
export const addPostIdeaToShoot = async (shootId: number, postIdeaId: number): Promise<void> => {
  // Check if already assigned
  const isAlreadyAssigned = await isPostIdeaAssignedToShoot(shootId, postIdeaId)
  if (isAlreadyAssigned) {
    throw new Error('Post idea is already assigned to this shoot')
  }

  await db.insert(shootPostIdeas).values({
    shootId,
    postIdeaId,
    completed: false,
  })
}

// Remove post idea from shoot
export const removePostIdeaFromShoot = async (shootId: number, postIdeaId: number): Promise<void> => {
  await db
    .delete(shootPostIdeas)
    .where(and(
      eq(shootPostIdeas.shootId, shootId),
      eq(shootPostIdeas.postIdeaId, postIdeaId)
    ))
}

// Toggle shot completion in shoot
export const toggleShotCompletion = async (
  shootId: number, 
  postIdeaId: number, 
  completed: boolean
): Promise<void> => {
  await db
    .update(shootPostIdeas)
    .set({
      completed,
      completedAt: completed ? new Date() : null,
    })
    .where(and(
      eq(shootPostIdeas.shootId, shootId),
      eq(shootPostIdeas.postIdeaId, postIdeaId)
    ))
}

// Clear calendar sync data when calendar event is deleted externally
export const clearCalendarSync = async (id: number): Promise<boolean> => {
  try {
    const result = await db
      .update(shoots)
      .set({
        googleCalendarEventId: null,
        googleCalendarSyncStatus: null,
        googleCalendarLastSync: null,
        googleCalendarError: 'Calendar event deleted externally',
        updatedAt: new Date()
      })
      .where(eq(shoots.id, id))
      .returning()
    
    return result.length > 0
  } catch (error) {
    console.error('❌ [DB] Error clearing calendar sync data:', error)
    return false
  }
}

// Get shoots by Google Calendar event ID (for webhook processing)
export const getShootByCalendarEventId = async (eventId: string): Promise<ShootSelect | null> => {
  try {
    const result = await db
      .select()
      .from(shoots)
      .where(and(
        eq(shoots.googleCalendarEventId, eventId),
        isNull(shoots.deletedAt) // Only return non-deleted shoots
      ))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('❌ [DB] Error getting shoot by calendar event ID:', error)
    return null
  }
} 