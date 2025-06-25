import { db } from './index'
import { clients, shoots, postIdeas, clientSettings, uploadedFiles, shootPostIdeas } from './schema'
import { eq, desc, sql, inArray } from 'drizzle-orm'
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

// Get single client by name
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

// Enhanced delete client with detailed dependency checking
export const deleteClient = async (
  id: number, 
  options: { cascade?: boolean } = {}
): Promise<{ 
  success: boolean; 
  message: string; 
  dependencies?: {
    shoots: number;
    postIdeas: number;
    clientSettings: number;
    uploadedFiles: number;
  }
}> => {
  console.log('🗑️ [deleteClient] Starting deletion for client ID:', id, 'options:', options)
  
  try {
    // Get dependency counts
    console.log('🔍 [deleteClient] Checking dependencies...')
    const [shootCount, postIdeaCount, clientSettingsCount, uploadedFilesCount] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(shoots)
        .where(eq(shoots.clientId, id)),
      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(postIdeas)
        .where(eq(postIdeas.clientId, id)),
      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(clientSettings)
        .where(eq(clientSettings.clientId, id)),
      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(uploadedFiles)
        .innerJoin(postIdeas, eq(uploadedFiles.postIdeaId, postIdeas.id))
        .where(eq(postIdeas.clientId, id))
    ])

    const dependencies = {
      shoots: shootCount[0].count,
      postIdeas: postIdeaCount[0].count,
      clientSettings: clientSettingsCount[0].count,
      uploadedFiles: uploadedFilesCount[0].count
    }

    console.log('📊 [deleteClient] Dependencies found:', dependencies)

    const hasDependencies = dependencies.shoots > 0 || dependencies.postIdeas > 0 || dependencies.clientSettings > 0

    // If dependencies exist and cascade is not enabled, return dependency info
    if (hasDependencies && !options.cascade) {
      console.log('⚠️ [deleteClient] Dependencies exist, cascade not enabled')
      return {
        success: false,
        message: 'Client has existing data. Use cascade option to delete all associated data.',
        dependencies
      }
    }

    // If cascade is enabled, delete all dependencies first
    if (options.cascade && hasDependencies) {
      console.log('🔄 [deleteClient] Cascade enabled, deleting dependencies...')
      try {
        // Delete in correct order to respect foreign key constraints
        
        // 1. Delete uploaded files (via post ideas)
        if (dependencies.uploadedFiles > 0) {
          console.log('🗑️ [deleteClient] Deleting uploaded files...')
          await db.delete(uploadedFiles)
            .where(
              inArray(
                uploadedFiles.postIdeaId,
                db.select({ id: postIdeas.id })
                  .from(postIdeas)
                  .where(eq(postIdeas.clientId, id))
              )
            )
        }

        // 2. Delete shoot-post idea associations
        if (dependencies.shoots > 0) {
          console.log('🗑️ [deleteClient] Deleting shoot-post idea associations...')
          await db.delete(shootPostIdeas)
            .where(
              inArray(
                shootPostIdeas.shootId,
                db.select({ id: shoots.id })
                  .from(shoots)
                  .where(eq(shoots.clientId, id))
              )
            )
        }

        // 3. Delete shoots
        if (dependencies.shoots > 0) {
          console.log('🗑️ [deleteClient] Deleting shoots...')
          await db.delete(shoots).where(eq(shoots.clientId, id))
        }

        // 4. Delete post ideas
        if (dependencies.postIdeas > 0) {
          console.log('🗑️ [deleteClient] Deleting post ideas...')
          await db.delete(postIdeas).where(eq(postIdeas.clientId, id))
        }

        // 5. Delete client settings
        if (dependencies.clientSettings > 0) {
          console.log('🗑️ [deleteClient] Deleting client settings...')
          await db.delete(clientSettings).where(eq(clientSettings.clientId, id))
        }

        console.log('✅ [deleteClient] All dependencies deleted successfully')

      } catch (error) {
        console.error('❌ [deleteClient] Error during cascade deletion:', error)
        return {
          success: false,
          message: 'Failed to delete associated data. Please try again.',
          dependencies
        }
      }
    }

    // Finally, delete the client
    console.log('🗑️ [deleteClient] Deleting client...')
    try {
      const result = await db.delete(clients).where(eq(clients.id, id))
      console.log('📊 [deleteClient] Delete result:', result)
      
      // In Drizzle ORM, successful delete returns an array with the deleted rows
      // If no rows were deleted, it returns an empty array
      const success = Array.isArray(result) ? result.length > 0 : true
      console.log('✅ [deleteClient] Deletion success:', success)
      
      return {
        success,
        message: success 
          ? options.cascade 
            ? `Client and all associated data deleted successfully (${dependencies.shoots} shoots, ${dependencies.postIdeas} post ideas, ${dependencies.uploadedFiles} files)`
            : 'Client deleted successfully'
          : 'Client not found',
        dependencies: hasDependencies ? dependencies : undefined
      }
    } catch (error) {
      console.error('❌ [deleteClient] Error deleting client:', error)
      return {
        success: false,
        message: 'Failed to delete client. Please try again.',
        dependencies
      }
    }
  } catch (error) {
    console.error('❌ [deleteClient] Unexpected error:', error)
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    }
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
  console.log('🔍 [getAllClientsAsClientData] Starting to fetch clients...')
  
  try {
    const clientsWithStats = await getAllClients()
    console.log('📊 [getAllClientsAsClientData] Raw database results:', {
      count: clientsWithStats.length,
      clients: clientsWithStats.map(c => ({ id: c.id, name: c.name, activeProjects: c.activeProjects }))
    })
    
    const result = clientsWithStats.map(clientWithStatsToClientData)
    console.log('✅ [getAllClientsAsClientData] Transformed results:', {
      count: result.length,
      clients: result.map(c => ({ id: c.id, name: c.name, type: c.type }))
    })
    
    return result
  } catch (error) {
    console.error('❌ [getAllClientsAsClientData] Database error:', error)
    throw error
  }
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