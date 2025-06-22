import { db } from './index'
import { clientSettings, clients } from './schema'
import { eq, and } from 'drizzle-orm'
import { ClientStorageSettings } from '@/lib/types/settings'

// Types for database operations
export type NewClientSettings = typeof clientSettings.$inferInsert
export type ClientSettingsSelect = typeof clientSettings.$inferSelect

export interface ClientSettingsWithClient extends ClientSettingsSelect {
  clientName: string
}

// Get client settings by client ID and user email
export const getClientSettings = async (
  clientId: number, 
  userEmail: string
): Promise<ClientSettingsSelect | null> => {
  const result = await db
    .select()
    .from(clientSettings)
    .where(and(
      eq(clientSettings.clientId, clientId),
      eq(clientSettings.userEmail, userEmail)
    ))
    .limit(1)

  return result[0] || null
}

// Get all client settings for a user
export const getAllClientSettings = async (
  userEmail: string
): Promise<ClientSettingsWithClient[]> => {
  const result = await db
    .select({
      id: clientSettings.id,
      clientId: clientSettings.clientId,
      userEmail: clientSettings.userEmail,
      storageProvider: clientSettings.storageProvider,
      storageFolderId: clientSettings.storageFolderId,
      storageFolderName: clientSettings.storageFolderName,
      storageFolderPath: clientSettings.storageFolderPath,
      customNaming: clientSettings.customNaming,
      namingTemplate: clientSettings.namingTemplate,
      metadata: clientSettings.metadata,
      createdAt: clientSettings.createdAt,
      updatedAt: clientSettings.updatedAt,
      clientName: clients.name,
    })
    .from(clientSettings)
    .innerJoin(clients, eq(clientSettings.clientId, clients.id))
    .where(eq(clientSettings.userEmail, userEmail))

  return result
}

// Create or update client settings
export const upsertClientSettings = async (
  clientId: number,
  userEmail: string,
  settings: Partial<ClientStorageSettings>
): Promise<ClientSettingsSelect> => {
  // Check if settings already exist
  const existing = await getClientSettings(clientId, userEmail)
  
  if (existing) {
    // Update existing settings
    const [updated] = await db
      .update(clientSettings)
      .set({
        storageProvider: settings.storageProvider,
        storageFolderId: settings.storageFolderId,
        storageFolderName: settings.storageFolderName,
        storageFolderPath: settings.storageFolderPath,
        customNaming: settings.customNaming || false,
        namingTemplate: settings.namingTemplate,
        metadata: settings.metadata,
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientSettings.clientId, clientId),
        eq(clientSettings.userEmail, userEmail)
      ))
      .returning()

    return updated
  } else {
    // Create new settings
    const [created] = await db
      .insert(clientSettings)
      .values({
        clientId,
        userEmail,
        storageProvider: settings.storageProvider || 'google-drive',
        storageFolderId: settings.storageFolderId,
        storageFolderName: settings.storageFolderName,
        storageFolderPath: settings.storageFolderPath,
        customNaming: settings.customNaming || false,
        namingTemplate: settings.namingTemplate,
        metadata: settings.metadata,
      })
      .returning()

    return created
  }
}

// Delete client settings
export const deleteClientSettings = async (
  clientId: number,
  userEmail: string
): Promise<boolean> => {
  const result = await db
    .delete(clientSettings)
    .where(and(
      eq(clientSettings.clientId, clientId),
      eq(clientSettings.userEmail, userEmail)
    ))

  return result.length > 0
}

// Convert database record to ClientStorageSettings interface
export const toClientStorageSettings = (
  dbRecord: ClientSettingsWithClient
): ClientStorageSettings => {
  return {
    clientId: dbRecord.clientId,
    clientName: dbRecord.clientName,
    storageProvider: dbRecord.storageProvider as 'google-drive' | 'dropbox' | 'onedrive' | 'local',
    storageFolderId: dbRecord.storageFolderId || undefined,
    storageFolderName: dbRecord.storageFolderName || undefined,
    storageFolderPath: dbRecord.storageFolderPath || undefined,
    customNaming: Boolean(dbRecord.customNaming),
    namingTemplate: dbRecord.namingTemplate || undefined,
    metadata: dbRecord.metadata as Record<string, unknown> || undefined,
  }
} 