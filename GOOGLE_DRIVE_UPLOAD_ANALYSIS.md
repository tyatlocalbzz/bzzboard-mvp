# Google Drive Upload Functionality Analysis

## Overview
This document analyzes the Google Drive upload functionality in the Buzzboard Mobile MVP, explaining how files are uploaded, where they're stored, and how the folder structure is determined.

## 🔄 Upload Flow

### 1. Frontend Upload Initiation
**Location**: `src/components/shoots/upload-content-form.tsx` or `src/app/shoots/[id]/upload/page.tsx`

```typescript
// User selects files and clicks upload
const handleSubmit = async () => {
  // 1. Create Google Drive folder structure
  const driveFolder = await createFolder(shoot.client, shoot.title, shoot.scheduledAt)
  
  // 2. Upload files to appropriate folders
  for (const section of postIdeaSections) {
    for (const file of section.files) {
      uploadPromises.push(uploadFile(file, section.id))
    }
  }
}
```

**Logging Output:**
```
🗂️  [shootsApi.createDriveFolder] Creating Google Drive folder structure...
📋 [shootsApi.createDriveFolder] Input parameters: { clientName, shootTitle, shootDate }
```

### 2. API Layer Processing
**Location**: `src/lib/api/shoots.ts`

The `uploadFile` function handles the client-side upload logic:

```typescript
async uploadFile(request: UploadRequest, onProgress?: (progress: UploadProgress) => void)
```

**Key Logging Points:**
- **File Analysis**: Logs file name, size, type, and destination
- **Progress Simulation**: Tracks upload progress for UI feedback
- **FormData Preparation**: Shows what data is being sent to the API
- **API Response**: Logs the complete response from the upload endpoint

**Logging Output:**
```
📤 [shootsApi.uploadFile] Starting file upload...
📋 [shootsApi.uploadFile] Upload request: { fileName, fileSize, fileType, postIdeaId }
📊 [shootsApi.uploadFile] Simulating upload progress...
📈 [shootsApi.uploadFile] Progress: 50% (1024/2048 bytes)
🚀 [shootsApi.uploadFile] Sending request to /api/uploads...
```

### 3. Upload API Route
**Location**: `src/app/api/uploads/route.ts`

This is the main upload processing endpoint that:
1. Authenticates the user
2. Parses the uploaded file and metadata
3. Determines the upload destination
4. Processes the file upload
5. Saves metadata to the database

**Key Logging Points:**
- **Authentication**: Verifies user session
- **File Validation**: Ensures file and required parameters are present
- **Destination Logic**: Determines if file goes to post-idea folder or misc folder
- **Folder Structure Planning**: Shows the intended Google Drive folder hierarchy

**Logging Output:**
```
📤 [Upload API] Starting file upload request...
🔐 [Upload API] Checking authentication...
✅ [Upload API] Authentication successful: { userId, userEmail }
📋 [Upload API] Parsing form data...
📊 [Upload API] Form data parsed: { hasFile, fileName, fileSize, postIdeaId }
🎯 [Upload API] Determining upload destination...
📍 [Upload API] Upload destination: { type: 'post-idea', postIdeaId: 123 }
🗂️  [Upload API] Determining Google Drive folder structure...
📂 [Upload API] Folder structure plan: { rootFolder, shootFolder, targetFolder }
```

## 📁 Folder Structure Logic

### Hierarchy Determination
The system creates a specific folder hierarchy in Google Drive:

```
Client Name/
└── [YYYY-MM-DD] Shoot Title/
    ├── [Post Idea 1 Title]/
    │   ├── raw-files/          ← Files uploaded for this post idea
    │   └── notes.txt           ← Editor notes for this post idea
    ├── [Post Idea 2 Title]/
    │   ├── raw-files/
    │   └── notes.txt
    └── misc-files/             ← Files not tied to specific post ideas
        └── notes.txt
```

### Folder Creation Process
**Location**: `src/lib/services/google-drive.ts`

The `GoogleDriveService` class handles the actual Google Drive API interactions:

1. **`createShootFolder()`**: Creates the main shoot folder structure
2. **`createPostIdeaFolder()`**: Creates folders for specific post ideas
3. **`createMiscFolder()`**: Creates folder for miscellaneous files
4. **`findOrCreateFolder()`**: Helper that searches for existing folders or creates new ones

**Logging Output:**
```
🗂️  [GoogleDriveService] Creating shoot folder structure...
📋 Input parameters: { clientName, shootTitle, shootDate }
🔍 Step 1: Finding or creating client folder: ClientName
✅ Client folder created/found: { id, name, webViewLink }
🔍 Step 2: Creating shoot folder inside client folder...
✅ Shoot folder created/found: { id, name, webViewLink, parentId }
```

## 🎯 Upload Destination Logic

### Post Idea Files
When `postIdeaId` is provided:
- Files go to: `Client/[Date] Shoot/Post Idea Title/raw-files/`
- Editor notes saved as: `Client/[Date] Shoot/Post Idea Title/notes.txt`

### Miscellaneous Files
When no `postIdeaId` is provided:
- Files go to: `Client/[Date] Shoot/misc-files/`
- Editor notes saved as: `Client/[Date] Shoot/misc-files/notes.txt`

## 🔍 File Processing Details

### File Upload Process
1. **File Validation**: Check file exists and has valid metadata
2. **Destination Determination**: Based on `postIdeaId` parameter
3. **Folder Structure Creation**: Ensure all necessary folders exist
4. **File Upload**: Upload to the appropriate `raw-files` folder
5. **Metadata Storage**: Save file information to database
6. **Notes Creation**: Create editor notes file if notes provided

### Database Storage
**Table**: `uploaded_files`
**Schema**:
```sql
- id: serial PRIMARY KEY
- post_idea_id: integer (references post_ideas.id)
- shoot_id: integer (references shoots.id)
- file_name: varchar(255)
- file_path: varchar(500) -- Google Drive web view link
- file_size: integer -- Size in bytes
- mime_type: varchar(100)
- google_drive_id: varchar(255) -- Google Drive file ID
- uploaded_at: timestamp
```

## 🚀 How to Use the Logging

### Development Testing
1. Open browser dev tools console
2. Navigate to upload page
3. Select files and start upload
4. Watch the detailed logging flow

### Key Log Patterns to Watch For
- **🔐 Authentication**: Ensure user is properly authenticated
- **📋 File Parsing**: Verify files are being read correctly
- **🎯 Destination Logic**: Confirm files go to correct folders
- **📂 Folder Creation**: Track Google Drive folder structure creation
- **✅ Success Indicators**: Look for completion messages

### Error Debugging
- **❌ Error Markers**: All errors are prefixed with ❌
- **🔍 Error Details**: Additional context provided for debugging
- **Stack Traces**: Full error stack traces in development mode

## 🔧 Current Implementation Status

### ✅ Implemented (Mock)
- File upload API endpoint
- Folder structure logic
- Progress tracking
- Database schema
- Comprehensive logging

### 🚧 Pending (Real Implementation)
- Actual Google Drive API integration
- Real file upload to Google Drive
- Database persistence
- Error handling for Google API failures
- OAuth token refresh logic

## 🎯 Next Steps for Real Implementation

1. **Complete Google OAuth Setup**
   - Fix redirect URI mismatch
   - Test Google Drive connection

2. **Replace Mock Services**
   - Implement real `GoogleDriveService` 
   - Connect to actual Google Drive API
   - Handle real file uploads

3. **Database Integration**
   - Uncomment database save operations
   - Add proper error handling
   - Implement file metadata storage

4. **Error Handling**
   - Add retry logic for failed uploads
   - Handle Google API rate limits
   - Implement upload resume functionality

The comprehensive logging system is now in place to help debug and monitor the upload process once the real Google Drive integration is implemented! 