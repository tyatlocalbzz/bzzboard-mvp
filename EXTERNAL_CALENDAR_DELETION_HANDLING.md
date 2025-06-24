# External Calendar Event Deletion Handling

## 🎯 **Problem Statement**

When a user deletes a shoot event from Google Calendar (instead of from the BzzBoard app), it creates data inconsistencies:

- ❌ **Stale References** - Shoot still has `googleCalendarEventId` pointing to non-existent event
- ❌ **Failed Operations** - Edit/delete operations fail when trying to access missing calendar event
- ❌ **Sync Issues** - Calendar sync may not properly detect the deletion
- ❌ **User Confusion** - App shows shoot as "synced" when it's not in calendar

## 🛠️ **Solution Architecture**

### **1. Graceful Error Handling**

#### **Calendar Service Updates**
- **`updateEvent()`** - Now handles 404 errors gracefully
- **`deleteEvent()`** - Already handled 404 errors properly
- **`verifyEventExists()`** - New method to check if event exists

```typescript
// Enhanced updateEvent with 404 handling
async updateEvent(userEmail: string, eventId: string, updates: Partial<CalendarEventBase>) {
  try {
    // ... existing logic
  } catch (error) {
    const apiError = error as { code?: number }
    if (apiError.code === 404) {
      // Event was deleted externally - clean up gracefully
      await deleteCachedEvent(userEmail, eventId, calendarId)
      return // Don't throw error
    }
    this.handleCalendarError(error, 'update event')
  }
}
```

### **2. External Deletion Detection**

#### **Sync Process Enhancement**
- Detects `cancelled` events during sync
- Calls `handleExternallyDeletedEvent()` for proper cleanup
- Updates associated shoot records

```typescript
// Enhanced sync process
if (googleEvent.status === 'cancelled') {
  console.log(`🗑️ Processing deleted event: ${googleEvent.summary}`)
  await this.handleExternallyDeletedEvent(userEmail, googleEvent.id, calendarId)
  deletedEvents++
}
```

#### **External Deletion Handler**
```typescript
async handleExternallyDeletedEvent(userEmail: string, eventId: string) {
  // 1. Remove from local cache
  await deleteCachedEvent(userEmail, eventId, calendarId)
  
  // 2. Find associated shoot
  const shoot = await getShootByCalendarEventId(eventId)
  
  // 3. Update shoot record
  if (shoot) {
    await clearCalendarSync(shoot.id) // Clear sync data
  }
}
```

### **3. Database Schema Updates**

#### **New Shoot Functions**
```typescript
// Clear calendar sync data when event deleted externally
export async function clearCalendarSync(id: number): Promise<boolean> {
  await db.update(shoots).set({
    googleCalendarEventId: null,
    googleCalendarSyncStatus: null,
    googleCalendarLastSync: null,
    googleCalendarError: 'Calendar event deleted externally',
    updatedAt: new Date()
  }).where(eq(shoots.id, id))
}

// Find shoot by calendar event ID
export async function getShootByCalendarEventId(eventId: string): Promise<ShootSelect | null> {
  return await db.select().from(shoots)
    .where(eq(shoots.googleCalendarEventId, eventId))
    .limit(1)[0] || null
}
```

### **4. Orphaned Event Cleanup**

#### **Cleanup Function**
```typescript
export async function cleanupOrphanedCalendarEvents(userEmail: string): Promise<number> {
  // 1. Get all cached events linked to shoots
  const eventsWithShoots = await getCachedEventsWithShoots(userEmail)
  
  let cleanedCount = 0
  
  // 2. Check if associated shoots still exist
  for (const event of eventsWithShoots) {
    const shoot = await getShootById(event.shootId)
    if (!shoot) {
      // Shoot deleted - remove orphaned calendar event
      await deleteCachedEvent(userEmail, event.googleEventId)
      cleanedCount++
    }
  }
  
  return cleanedCount
}
```

#### **API Endpoint Enhancement**
```typescript
// POST /api/integrations/google-calendar/sync
const { cleanup = false } = body

if (cleanup) {
  const cleanedCount = await cleanupOrphanedCalendarEvents(user.email)
  return NextResponse.json({
    success: true,
    message: `Cleaned up ${cleanedCount} orphaned calendar events`,
    cleanedCount
  })
}
```

## 🔄 **User Experience Flow**

### **Scenario: User Deletes Shoot from Google Calendar**

1. **Immediate State**
   - ✅ Event deleted from Google Calendar
   - ❌ Shoot still exists in BzzBoard with stale `googleCalendarEventId`

2. **Next Calendar Sync**
   - ✅ Sync detects `cancelled` event
   - ✅ Calls `handleExternallyDeletedEvent()`
   - ✅ Removes event from cache
   - ✅ Updates shoot: clears sync data, sets error message

3. **User Interface Updates**
   - ✅ Shoot shows as "Calendar event deleted externally"
   - ✅ User can edit/delete shoot normally
   - ✅ No more failed API calls

4. **Edit/Delete Operations**
   - ✅ Edit shoot: Won't try to update non-existent calendar event
   - ✅ Delete shoot: Won't try to delete non-existent calendar event
   - ✅ All operations work normally

## 🚀 **Usage Examples**

### **Manual Cleanup (Browser Console)**
```javascript
// Clean up orphaned events
fetch('/api/integrations/google-calendar/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cleanup: true })
}).then(r => r.json()).then(console.log)
```

### **Clear Cache (Testing)**
```javascript
// Clear entire calendar cache
fetch('/api/integrations/google-calendar/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clearCache: true })
}).then(r => r.json()).then(console.log)
```

## 📊 **Benefits**

### **Reliability**
- ✅ **No More Failed Operations** - All edit/delete operations work regardless of calendar state
- ✅ **Graceful Degradation** - System continues working when calendar events are deleted
- ✅ **Self-Healing** - Automatic cleanup during sync operations

### **User Experience**
- ✅ **Clear Status** - Users see when calendar events are deleted externally
- ✅ **No Confusion** - Shoots don't show as "synced" when they're not
- ✅ **Smooth Operations** - All app functions work normally

### **Data Integrity**
- ✅ **Consistent State** - Database reflects actual calendar state
- ✅ **Clean References** - No stale calendar event IDs
- ✅ **Audit Trail** - Error messages explain what happened

## 🔧 **Technical Implementation Details**

### **Error Codes Handled**
- **404** - Event not found (deleted externally)
- **410** - Sync token expired (handled separately)
- **401/403** - Authentication issues (handled separately)

### **Sync Status Values**
- **`null`** - No calendar integration attempted
- **`pending`** - Calendar event creation in progress
- **`synced`** - Successfully synced with calendar
- **`error`** - Sync failed (includes external deletion)

### **Error Messages**
- **"Calendar event deleted externally"** - Event was deleted from Google Calendar
- **"Failed to create calendar event"** - Creation failed during shoot scheduling
- **"Calendar sync error"** - General sync issues

## 🎯 **Future Enhancements**

1. **Webhook Integration** - Real-time detection of external deletions
2. **Conflict Resolution UI** - Allow users to choose how to handle conflicts
3. **Batch Cleanup** - Scheduled cleanup of orphaned events
4. **User Notifications** - Alert users when calendar events are deleted externally

This comprehensive solution ensures that BzzBoard remains robust and user-friendly even when calendar events are deleted outside the application. 