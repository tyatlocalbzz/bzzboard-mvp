import { db } from './index'
import { integrations } from './schema'
import { eq, and } from 'drizzle-orm'

export interface IntegrationStatus {
  connected: boolean
  email?: string
  lastSync?: string
  error?: string
  accessToken?: string
  refreshToken?: string
  expiryDate?: string
  data?: Record<string, unknown> // For storing settings and other metadata
}

export interface UserIntegrations {
  googleDrive?: IntegrationStatus
  googleCalendar?: IntegrationStatus
}

// Get all integrations for a user
export const getUserIntegrations = async (userEmail: string): Promise<UserIntegrations> => {
  try {
    console.log('🗃️ [getUserIntegrations] Querying database for user:', userEmail)
    
    const userIntegrations = await db
      .select()
      .from(integrations)
      .where(eq(integrations.userEmail, userEmail))

    console.log('🗃️ [getUserIntegrations] Raw database results:', {
      count: userIntegrations.length,
      integrations: userIntegrations.map(i => ({
        id: i.id,
        provider: i.provider,
        connected: i.connected,
        connectedEmail: i.connectedEmail,
        lastSync: i.lastSync?.toISOString(),
        error: i.error,
        hasAccessToken: !!i.accessToken,
        hasRefreshToken: !!i.refreshToken,
        expiryDate: i.expiryDate?.toISOString()
      }))
    })

    const result: UserIntegrations = {}

    for (const integration of userIntegrations) {
      const status: IntegrationStatus = {
        connected: integration.connected,
        email: integration.connectedEmail || undefined,
        lastSync: integration.lastSync?.toISOString(),
        error: integration.error || undefined,
        accessToken: integration.accessToken || undefined,
        refreshToken: integration.refreshToken || undefined,
        expiryDate: integration.expiryDate?.toISOString(),
        data: integration.metadata ? (integration.metadata as Record<string, unknown>) : undefined
      }

      console.log(`🔍 [getUserIntegrations] Processing ${integration.provider}:`, {
        connected: status.connected,
        email: status.email,
        lastSync: status.lastSync,
        error: status.error
      })

      if (integration.provider === 'google-drive') {
        result.googleDrive = status
      } else if (integration.provider === 'google-calendar') {
        result.googleCalendar = status
      }
    }

    console.log('📊 [getUserIntegrations] Final result:', result)
    return result
  } catch (error) {
    console.error('❌ [getUserIntegrations] Error fetching user integrations:', error)
    return {}
  }
}

// Update or create an integration
export const upsertIntegration = async (
  userEmail: string,
  provider: 'google-drive' | 'google-calendar',
  data: Partial<IntegrationStatus> & Record<string, unknown>
) => {
  try {
    const existingIntegration = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.userEmail, userEmail),
        eq(integrations.provider, provider)
      ))
      .limit(1)

    // Separate integration status from additional data
    const { connected, email, lastSync, error, accessToken, refreshToken, expiryDate, ...additionalData } = data

    const integrationData = {
      userEmail,
      provider,
      connected: connected ?? false,
      connectedEmail: email || null,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      error: error || null,
      lastSync: lastSync ? new Date(lastSync) : null,
      metadata: Object.keys(additionalData).length > 0 ? additionalData : null,
      updatedAt: new Date()
    }

    if (existingIntegration.length > 0) {
      // Update existing
      await db
        .update(integrations)
        .set(integrationData)
        .where(eq(integrations.id, existingIntegration[0].id))
    } else {
      // Create new
      await db
        .insert(integrations)
        .values({
          ...integrationData,
          createdAt: new Date()
        })
    }

    return true
  } catch (error) {
    console.error('❌ [UpsertIntegration] Error upserting integration:', error)
    throw error
  }
}

// Remove an integration
export const removeIntegration = async (
  userEmail: string,
  provider: 'google-drive' | 'google-calendar'
) => {
  try {
    await db
      .delete(integrations)
      .where(and(
        eq(integrations.userEmail, userEmail),
        eq(integrations.provider, provider)
      ))

    return true
  } catch (error) {
    console.error('Error removing integration:', error)
    throw error
  }
}

// Get specific integration
export const getIntegration = async (
  userEmail: string,
  provider: 'google-drive' | 'google-calendar'
): Promise<IntegrationStatus | null> => {
  try {
    const integration = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.userEmail, userEmail),
        eq(integrations.provider, provider)
      ))
      .limit(1)

    if (integration.length === 0) {
      return null
    }

    const record = integration[0]

    const result = {
      connected: record.connected,
      email: record.connectedEmail || undefined,
      lastSync: record.lastSync?.toISOString(),
      error: record.error || undefined,
      accessToken: record.accessToken || undefined,
      refreshToken: record.refreshToken || undefined,
      expiryDate: record.expiryDate?.toISOString(),
      data: record.metadata ? (record.metadata as Record<string, unknown>) : undefined
    }

    return result
  } catch (error) {
    console.error('❌ [GetIntegration] Error fetching integration:', error)
    return null
  }
} 