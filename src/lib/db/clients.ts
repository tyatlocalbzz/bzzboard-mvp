import { db } from './index'
import { clients, shoots, postIdeas } from './schema'
import { eq, desc, sql } from 'drizzle-orm'

// Types for database operations
export type NewClient = typeof clients.$inferInsert
export type ClientSelect = typeof clients.$inferSelect

export interface ClientWithStats extends ClientSelect {
  activeProjects: number
}

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
  notes?: string
}

// Get all clients with project counts
export const getAllClients = async (): Promise<ClientWithStats[]> => {
  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
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
      email: clientData.email,
      phone: clientData.phone,
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