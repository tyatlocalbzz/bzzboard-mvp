import { db } from './index'
import { 
  calendarSyncTokens, 
  calendarWebhookChannels, 
  calendarEventsCache,
  type CalendarSyncToken,
  type CalendarWebhookChannel,
  type NewCalendarWebhookChannel,
  type CalendarEventCache,
  type NewCalendarEventCache
} from './schema'
import { eq, and, desc, lt } from 'drizzle-orm'

// ==================== SYNC TOKENS ====================

/**
 * Get sync token for a user's calendar
 * DRY: Centralized sync token retrieval
 */
export async function getSyncToken(
  userEmail: string, 
  calendarId: string = 'primary'
): Promise<CalendarSyncToken | null> {
  try {
    const result = await db
      .select()
      .from(calendarSyncTokens)
      .where(
        and(
          eq(calendarSyncTokens.userEmail, userEmail),
          eq(calendarSyncTokens.calendarId, calendarId)
        )
      )
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('❌ [Calendar DB] Error getting sync token:', error)
    return null
  }
}

/**
 * Upsert sync token for a user's calendar
 * DRY: Centralized sync token management
 */
export async function upsertSyncToken(
  userEmail: string,
  calendarId: string = 'primary',
  syncToken: string
): Promise<CalendarSyncToken> {
  try {
    // Try to update existing token first
    const existing = await getSyncToken(userEmail, calendarId)
    
    if (existing) {
      const updated = await db
        .update(calendarSyncTokens)
        .set({
          syncToken,
          lastSync: new Date(),
          updatedAt: new Date()
        })
        .where(eq(calendarSyncTokens.id, existing.id))
        .returning()
      
      return updated[0]
    } else {
      // Create new token
      const created = await db
        .insert(calendarSyncTokens)
        .values({
          userEmail,
          calendarId,
          syncToken,
          lastSync: new Date()
        })
        .returning()
      
      return created[0]
    }
  } catch (error) {
    console.error('❌ [Calendar DB] Error upserting sync token:', error)
    throw new Error('Failed to update sync token')
  }
}

/**
 * Delete sync token (forces full resync)
 * DRY: Centralized sync token cleanup
 */
export async function deleteSyncToken(
  userEmail: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    await db
      .delete(calendarSyncTokens)
      .where(
        and(
          eq(calendarSyncTokens.userEmail, userEmail),
          eq(calendarSyncTokens.calendarId, calendarId)
        )
      )
    
    return true
  } catch (error) {
    console.error('❌ [Calendar DB] Error deleting sync token:', error)
    return false
  }
}

// ==================== WEBHOOK CHANNELS ====================

/**
 * Get active webhook channel for a user's calendar
 * DRY: Centralized webhook channel retrieval
 */
export async function getWebhookChannel(
  userEmail: string,
  calendarId: string = 'primary'
): Promise<CalendarWebhookChannel | null> {
  try {
    const result = await db
      .select()
      .from(calendarWebhookChannels)
      .where(
        and(
          eq(calendarWebhookChannels.userEmail, userEmail),
          eq(calendarWebhookChannels.calendarId, calendarId),
          eq(calendarWebhookChannels.active, true)
        )
      )
      .orderBy(desc(calendarWebhookChannels.createdAt))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('❌ [Calendar DB] Error getting webhook channel:', error)
    return null
  }
}

/**
 * Get webhook channel by channelId (for webhook processing)
 * DRY: Centralized webhook channel retrieval by ID
 */
export async function getWebhookChannelById(
  channelId: string
): Promise<CalendarWebhookChannel | null> {
  try {
    const result = await db
      .select()
      .from(calendarWebhookChannels)
      .where(eq(calendarWebhookChannels.channelId, channelId))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('❌ [Calendar DB] Error getting webhook channel by ID:', error)
    return null
  }
}

/**
 * Create new webhook channel
 * DRY: Centralized webhook channel creation
 */
export async function createWebhookChannel(
  data: Omit<NewCalendarWebhookChannel, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CalendarWebhookChannel> {
  try {
    // Following Google Calendar API best practices: always default to 'primary' calendar
    const calendarId = data.calendarId || 'primary'
    
    // Deactivate existing channels for this user/calendar
    await db
      .update(calendarWebhookChannels)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(calendarWebhookChannels.userEmail, data.userEmail),
          eq(calendarWebhookChannels.calendarId, calendarId),
          eq(calendarWebhookChannels.active, true)
        )
      )

    // Create new channel with guaranteed calendarId
    const created = await db
      .insert(calendarWebhookChannels)
      .values({
        ...data,
        calendarId
      })
      .returning()

    return created[0]
  } catch (error) {
    console.error('❌ [Calendar DB] Error creating webhook channel:', error)
    throw new Error('Failed to create webhook channel')
  }
}

/**
 * Deactivate webhook channel
 * DRY: Centralized webhook channel cleanup
 */
export async function deactivateWebhookChannel(channelId: string): Promise<boolean> {
  try {
    await db
      .update(calendarWebhookChannels)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(calendarWebhookChannels.channelId, channelId))
    
    return true
  } catch (error) {
    console.error('❌ [Calendar DB] Error deactivating webhook channel:', error)
    return false
  }
}

/**
 * Get expired webhook channels for cleanup
 * DRY: Centralized expired channel detection
 */
export async function getExpiredWebhookChannels(): Promise<CalendarWebhookChannel[]> {
  try {
    const now = new Date()
    
    const result = await db
      .select()
      .from(calendarWebhookChannels)
      .where(
        and(
          eq(calendarWebhookChannels.active, true),
          lt(calendarWebhookChannels.expiration, now)
        )
      )

    return result
  } catch (error) {
    console.error('❌ [Calendar DB] Error getting expired channels:', error)
    return []
  }
}

// ==================== EVENT CACHE ====================

/**
 * Get cached events for a user's calendar
 * DRY: Centralized event cache retrieval
 */
export async function getCachedEvents(
  userEmail: string,
  calendarId: string = 'primary',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _startTime?: Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _endTime?: Date
): Promise<CalendarEventCache[]> {
  try {
    const result = await db
      .select()
      .from(calendarEventsCache)
      .where(
        and(
          eq(calendarEventsCache.userEmail, userEmail),
          eq(calendarEventsCache.calendarId, calendarId)
        )
      )
      .orderBy(calendarEventsCache.startTime)

    return result
  } catch (error) {
    console.error('❌ [Calendar DB] Error getting cached events:', error)
    return []
  }
}

/**
 * Upsert event in cache
 * DRY: Centralized event cache management
 */
export async function upsertCachedEvent(
  data: Omit<NewCalendarEventCache, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CalendarEventCache> {
  try {
    // Following Google Calendar API best practices: always default to 'primary' calendar
    const calendarId = data.calendarId || 'primary'
    
    // Try to find existing event
    const existing = await db
      .select()
      .from(calendarEventsCache)
      .where(
        and(
          eq(calendarEventsCache.userEmail, data.userEmail),
          eq(calendarEventsCache.calendarId, calendarId),
          eq(calendarEventsCache.googleEventId, data.googleEventId)
        )
      )
      .limit(1)

    if (existing[0]) {
      // Update existing
      const updated = await db
        .update(calendarEventsCache)
        .set({
          ...data,
          calendarId,
          updatedAt: new Date()
        })
        .where(eq(calendarEventsCache.id, existing[0].id))
        .returning()

      return updated[0]
    } else {
      // Create new with guaranteed calendarId
      const created = await db
        .insert(calendarEventsCache)
        .values({
          ...data,
          calendarId
        })
        .returning()

      return created[0]
    }
  } catch (error) {
    console.error('❌ [Calendar DB] Error upserting cached event:', error)
    throw new Error('Failed to update event cache')
  }
}

/**
 * Delete cached event
 * DRY: Centralized event cache cleanup
 */
export async function deleteCachedEvent(
  userEmail: string,
  googleEventId: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    await db
      .delete(calendarEventsCache)
      .where(
        and(
          eq(calendarEventsCache.userEmail, userEmail),
          eq(calendarEventsCache.calendarId, calendarId),
          eq(calendarEventsCache.googleEventId, googleEventId)
        )
      )
    
    return true
  } catch (error) {
    console.error('❌ [Calendar DB] Error deleting cached event:', error)
    return false
  }
}

/**
 * Link cached event to a shoot
 * DRY: Centralized shoot-event linking
 */
export async function linkEventToShoot(
  googleEventId: string,
  shootId: number,
  userEmail: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    await db
      .update(calendarEventsCache)
      .set({ 
        shootId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(calendarEventsCache.userEmail, userEmail),
          eq(calendarEventsCache.calendarId, calendarId),
          eq(calendarEventsCache.googleEventId, googleEventId)
        )
      )
    
    return true
  } catch (error) {
    console.error('❌ [Calendar DB] Error linking event to shoot:', error)
    return false
  }
}

/**
 * Clear event cache for a user (for full resync)
 * DRY: Centralized cache cleanup
 */
export async function clearEventCache(
  userEmail: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    await db
      .delete(calendarEventsCache)
      .where(
        and(
          eq(calendarEventsCache.userEmail, userEmail),
          eq(calendarEventsCache.calendarId, calendarId)
        )
      )
    
    return true
  } catch (error) {
    console.error('❌ [Calendar DB] Error clearing event cache:', error)
    return false
  }
}

// ==================== CONFLICT DETECTION ====================

/**
 * Check for scheduling conflicts
 * DRY: Centralized conflict detection logic
 */
export async function checkSchedulingConflicts(
  userEmail: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string,
  calendarId: string = 'primary'
): Promise<CalendarEventCache[]> {
  try {
    // This is a simplified conflict check - in production you'd want more sophisticated overlap detection
    const conflicts = await db
      .select()
      .from(calendarEventsCache)
      .where(
        and(
          eq(calendarEventsCache.userEmail, userEmail),
          eq(calendarEventsCache.calendarId, calendarId),
          // Add time overlap conditions here
          excludeEventId ? 
            and(eq(calendarEventsCache.googleEventId, excludeEventId)) : 
            undefined
        )
      )

    // Filter for actual time conflicts (simplified)
    return conflicts.filter(event => {
      if (excludeEventId && event.googleEventId === excludeEventId) {
        return false
      }
      
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      
      // Check for overlap
      return (startTime < eventEnd && endTime > eventStart)
    })
  } catch (error) {
    console.error('❌ [Calendar DB] Error checking conflicts:', error)
    return []
  }
} 