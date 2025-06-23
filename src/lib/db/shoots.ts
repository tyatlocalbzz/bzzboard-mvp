import { db } from './index'
import { shoots, clients, postIdeas, shootPostIdeas } from './schema'
import { eq, desc, asc, and, sql } from 'drizzle-orm'

// Types for database operations
export type NewShoot = typeof shoots.$inferInsert
export type ShootSelect = typeof shoots.$inferSelect
export type ShootStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

export interface ShootWithClient extends ShootSelect {
  client: {
    id: number
    name: string
  } | null
  postIdeasCount: number
}

export interface CreateShootInput {
  title: string
  clientId: number
  scheduledAt: Date
  duration: number
  location?: string
  notes?: string
}

// Get all shoots with client information and post ideas count
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
    .groupBy(shoots.id, clients.id, clients.name)
    .orderBy(desc(shoots.scheduledAt))

  return result
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
    .where(eq(shoots.clientId, clientId))
    .groupBy(shoots.id, clients.id, clients.name)
    .orderBy(desc(shoots.scheduledAt))

  return result
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
    .where(eq(shoots.id, id))
    .groupBy(shoots.id, clients.id, clients.name)
    .limit(1)

  return result[0] || null
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
  updates: Partial<CreateShootInput>
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

// Delete shoot
export const deleteShoot = async (id: number): Promise<boolean> => {
  // First delete related shoot_post_ideas
  await db.delete(shootPostIdeas).where(eq(shootPostIdeas.shootId, id))
  
  // Then delete the shoot
  const result = await db.delete(shoots).where(eq(shoots.id, id))
  
  return result.length > 0
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

// Add post idea to shoot
export const addPostIdeaToShoot = async (shootId: number, postIdeaId: number): Promise<void> => {
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