# Automatic Post Status Updates

## Overview

The BzzBoard MVP now includes automatic post status updates based on shoot completion and file uploads. This eliminates the need for manual status management and ensures post statuses accurately reflect the current state of content production.

## Status Flow

```
planned → shot → uploaded
```

### Status Definitions

- **`planned`**: Post idea created and assigned to a shoot
- **`shot`**: Shoot has been completed (content captured)
- **`uploaded`**: Files have been uploaded for the post idea

## Automatic Update Triggers

### 1. Shoot Completion → Posts Status: `planned` → `shot`

**When:** A shoot status is changed to `'completed'`
**What:** All post ideas assigned to that shoot with status `'planned'` are automatically updated to `'shot'`
**Where:** `src/lib/db/shoots.ts` - `updateShootStatus()` function

```typescript
// Automatic trigger in updateShootStatus()
if (updatedShoot && status === 'completed') {
  const result = await updatePostStatusesOnShootCompletion(id)
  // Updates all 'planned' posts to 'shot'
}
```

### 2. File Upload → Post Status: `shot` → `uploaded`

**When:** A file is uploaded for a specific post idea
**What:** The post idea status is automatically updated from `'shot'` to `'uploaded'`
**Where:** `src/app/api/uploads/route.ts` - POST endpoint

```typescript
// Automatic trigger in uploads API
if (postIdeaId) {
  const statusResult = await updatePostStatusOnFileUpload(parseInt(postIdeaId))
  // Updates post from 'shot' to 'uploaded'
}
```

## Database Functions

### Core Functions (`src/lib/db/post-ideas.ts`)

#### `updatePostStatusesOnShootCompletion(shootId: number)`
- Updates all `'planned'` posts in a shoot to `'shot'` when shoot is completed
- Returns: `{ updatedCount: number; postIds: number[] }`
- Race condition safe with double-checking

#### `updatePostStatusOnFileUpload(postIdeaId: number)`
- Updates a single post from `'shot'` to `'uploaded'` when files are uploaded
- Returns: `{ updated: boolean; previousStatus: PostIdeaStatus | null }`
- Only updates if current status is `'shot'`

#### `updatePostStatusesOnBulkFileUpload(postIdeaIds: number[])`
- Bulk updates multiple posts to `'uploaded'` when multiple files are uploaded
- Returns: `{ updatedCount: number; postIds: number[] }`
- Filters to only update posts with status `'shot'`

#### `syncPostStatusWithUploads(postIdeaId: number)`
- Utility function to sync a post's status with its uploaded files
- Returns: `{ currentStatus: PostIdeaStatus; hasFiles: boolean; updated: boolean }`
- Used for manual sync and consistency checks

## API Endpoints

### Manual Sync Endpoints

#### `POST /api/posts/[id]/sync-status`
Manually sync a single post's status with its uploaded files.

**Response:**
```json
{
  "success": true,
  "data": {
    "postId": 123,
    "currentStatus": "uploaded",
    "hasFiles": true,
    "updated": true,
    "message": "Post status updated to 'uploaded' based on uploaded files"
  }
}
```

#### `POST /api/shoots/[id]/sync-statuses`
Bulk sync all post statuses for a shoot.

**Response:**
```json
{
  "success": true,
  "data": {
    "shootId": 456,
    "totalPosts": 5,
    "syncedPosts": 5,
    "updatedPosts": 2,
    "results": [
      {
        "postId": 123,
        "title": "Instagram Post",
        "previousStatus": "shot",
        "currentStatus": "uploaded",
        "hasFiles": true,
        "updated": true
      }
    ]
  }
}
```

## Safety Features

### Race Condition Prevention
- All update functions use double-checking with database constraints
- Status updates only proceed if the current status matches expected state

### Error Handling
- Automatic updates are non-blocking (won't fail the main operation)
- Comprehensive logging for debugging
- Graceful fallback if status update fails

### Status Validation
- Posts can only move forward in the status flow
- No downgrading from `'uploaded'` to `'shot'`
- No skipping from `'planned'` directly to `'uploaded'`

## Implementation Details

### Integration Points

1. **Shoot Status Updates** (`src/lib/db/shoots.ts`)
   ```typescript
   // Integrated into updateShootStatus()
   const result = await updatePostStatusesOnShootCompletion(id)
   ```

2. **File Uploads** (`src/app/api/uploads/route.ts`)
   ```typescript
   // Integrated into POST endpoint
   const statusResult = await updatePostStatusOnFileUpload(parseInt(postIdeaId))
   ```

### Database Schema
- Uses existing `post_ideas.status` column with enum: `'planned' | 'shot' | 'uploaded'`
- Leverages `shoot_post_ideas` table for shoot-post relationships
- Utilizes `uploaded_files` table for file-post relationships

## Monitoring & Debugging

### Logging
All automatic updates include comprehensive logging:
```
🎯 [updatePostStatusesOnShootCompletion] Processing shoot: 123
📋 [updatePostStatusesOnShootCompletion] Found planned posts: 3
✅ [updatePostStatusesOnShootCompletion] Updated posts: 3
```

### Manual Sync Tools
Use the sync endpoints for:
- Fixing inconsistencies after bulk operations
- Verifying status accuracy
- Debugging status flow issues

## Usage Examples

### Typical Workflow
1. Create post ideas → Status: `'planned'`
2. Assign to shoot → Status remains: `'planned'`
3. Complete shoot → Status auto-updates: `'shot'`
4. Upload files → Status auto-updates: `'uploaded'`

### Manual Sync (if needed)
```bash
# Sync single post
curl -X POST /api/posts/123/sync-status

# Sync all posts in shoot
curl -X POST /api/shoots/456/sync-statuses
```

## Benefits

1. **Eliminates Manual Work**: No need to manually update post statuses
2. **Ensures Accuracy**: Status always reflects actual state
3. **Improves Workflow**: Clear visibility into content production progress
4. **Reduces Errors**: Automatic updates prevent human mistakes
5. **Maintains Consistency**: Standardized status flow across all posts

## Future Enhancements

Potential improvements for future iterations:
- Email notifications on status changes
- Webhook integration for external systems
- Custom status workflows per client
- Automated status rollback capabilities
- Integration with calendar events for automatic shoot completion 