#!/usr/bin/env tsx
/**
 * Cleanup script for orphaned calendar events
 * Run with: npx tsx src/scripts/cleanup-calendar.ts
 */

import { db } from '@/lib/db'
import { calendarEventsCache, shoots } from '@/lib/db/schema'
import { eq, sql, and, isNull } from 'drizzle-orm'

async function cleanupOrphanedCalendarEvents() {
  console.log('🧹 Starting calendar cleanup...')
  
  try {
    // Find calendar events that reference non-existent shoots
    const orphanedEvents = await db
      .select({
        id: calendarEventsCache.id,
        title: calendarEventsCache.title,
        shootId: calendarEventsCache.shootId,
        googleEventId: calendarEventsCache.googleEventId,
        userEmail: calendarEventsCache.userEmail
      })
      .from(calendarEventsCache)
      .leftJoin(shoots, and(
        eq(calendarEventsCache.shootId, shoots.id),
        isNull(shoots.deletedAt) // Only join with non-deleted shoots
      ))
      .where(
        and(
          sql`${calendarEventsCache.shootId} IS NOT NULL`,
          sql`${shoots.id} IS NULL` // Shoot doesn't exist or is deleted
        )
      )

    console.log(`📊 Found ${orphanedEvents.length} orphaned calendar events`)

    if (orphanedEvents.length === 0) {
      console.log('✅ No orphaned events to clean up')
      return
    }

    // Show what we're about to clean up
    orphanedEvents.forEach(event => {
      console.log(`🗑️  Will remove: "${event.title}" (shootId: ${event.shootId}, eventId: ${event.googleEventId})`)
    })

    // Remove orphaned events
    const deletedIds = orphanedEvents.map(event => event.id)
    await db
      .delete(calendarEventsCache)
      .where(sql`${calendarEventsCache.id} IN (${deletedIds.join(',')})`)

    console.log(`✅ Cleaned up ${orphanedEvents.length} orphaned calendar events`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupOrphanedCalendarEvents()
  .then(() => {
    console.log('🎉 Cleanup completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error)
    process.exit(1)
  }) 