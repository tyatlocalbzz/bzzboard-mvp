import { db } from './index'
import { clients, shoots, postIdeas } from './schema'
import { eq, desc, sql } from 'drizzle-orm'
import { ClientData } from '@/lib/types/client'

// Types for database operations
export type NewClient = typeof clients.$inferInsert
export type ClientSelect = typeof clients.$inferSelect

export interface ClientWithStats extends ClientSelect {
  activeProjects: number
}

export interface CreateClientInput {
  name: string
  primaryContactName?: string
  primaryContactEmail?: string
  primaryContactPhone?: string
  website?: string
  socialMedia?: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  notes?: string
}

// Get all clients with project counts
export const getAllClients = async (): Promise<ClientWithStats[]> => {
  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      primaryContactName: clients.primaryContactName,
      primaryContactEmail: clients.primaryContactEmail,
      primaryContactPhone: clients.primaryContactPhone,
      website: clients.website,
      socialMedia: clients.socialMedia,
      notes: clients.notes,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      activeProjects: sql<number>`cast(count(distinct ${shoots.id}) as int)`,
    })
    .from(clients)
    .leftJoin(shoots, eq(clients.id, shoots.clientId))
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt))

  return result
}

// Get single client by ID
export const getClientById = async (id: number): Promise<ClientSelect | null> => {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1)

  return result[0] || null
}

// Get client by name
export const getClientByName = async (name: string): Promise<ClientSelect | null> => {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.name, name))
    .limit(1)

  return result[0] || null
}

// Create new client
export const createClient = async (clientData: CreateClientInput): Promise<ClientSelect> => {
  const [newClient] = await db
    .insert(clients)
    .values({
      name: clientData.name,
      primaryContactName: clientData.primaryContactName,
      primaryContactEmail: clientData.primaryContactEmail,
      primaryContactPhone: clientData.primaryContactPhone,
      website: clientData.website,
      socialMedia: clientData.socialMedia || {},
      notes: clientData.notes,
    })
    .returning()

  return newClient
}

// Update client
export const updateClient = async (
  id: number,
  updates: Partial<CreateClientInput>
): Promise<ClientSelect | null> => {
  const [updatedClient] = await db
    .update(clients)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id))
    .returning()

  return updatedClient || null
}

// Delete client (only if no associated shoots/post ideas)
export const deleteClient = async (id: number): Promise<{ success: boolean; message: string }> => {
  // Check if client has any shoots
  const shootCount = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(shoots)
    .where(eq(shoots.clientId, id))

  if (shootCount[0].count > 0) {
    return {
      success: false,
      message: 'Cannot delete client with existing shoots. Please delete all shoots first.'
    }
  }

  // Check if client has any post ideas
  const postIdeaCount = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(postIdeas)
    .where(eq(postIdeas.clientId, id))

  if (postIdeaCount[0].count > 0) {
    return {
      success: false,
      message: 'Cannot delete client with existing post ideas. Please delete all post ideas first.'
    }
  }

  // Safe to delete
  const result = await db.delete(clients).where(eq(clients.id, id))
  
  return {
    success: result.length > 0,
    message: result.length > 0 ? 'Client deleted successfully' : 'Client not found'
  }
}

/**
 * Convert database ClientSelect to frontend ClientData
 * Handles ID type conversion (number -> string)
 */
export const toClientData = (dbClient: ClientSelect, activeProjects?: number): ClientData => ({
  id: dbClient.id.toString(),
  name: dbClient.name,
  type: 'client' as const,
  activeProjects: activeProjects || 0,
  primaryContactName: dbClient.primaryContactName || undefined,
  primaryContactEmail: dbClient.primaryContactEmail || undefined,
  primaryContactPhone: dbClient.primaryContactPhone || undefined,
  website: dbClient.website || undefined,
  socialMedia: dbClient.socialMedia as ClientData['socialMedia'] || {},
  notes: dbClient.notes || undefined
})

/**
 * Convert ClientWithStats to ClientData
 */
export const clientWithStatsToClientData = (dbClient: ClientWithStats): ClientData => 
  toClientData(dbClient, dbClient.activeProjects)

/**
 * Get all clients as ClientData array (for frontend consumption)
 */
export const getAllClientsAsClientData = async (): Promise<ClientData[]> => {
  const clientsWithStats = await getAllClients()
  return clientsWithStats.map(clientWithStatsToClientData)
}

/**
 * Get single client as ClientData (for frontend consumption)
 */
export const getClientByIdAsClientData = async (id: number): Promise<ClientData | null> => {
  const client = await getClientById(id)
  if (!client) return null
  
  // Get active projects count for this client
  const activeProjectsResult = await db
    .select({ count: sql<number>`cast(count(distinct ${shoots.id}) as int)` })
    .from(shoots)
    .where(eq(shoots.clientId, id))
  
  const activeProjects = activeProjectsResult[0]?.count || 0
  
  return toClientData(client, activeProjects)
} 