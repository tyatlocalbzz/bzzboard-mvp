export interface GoogleDriveSettings {
  parentFolderId?: string
  parentFolderName?: string
  parentFolderPath?: string
  autoCreateYearFolders?: boolean
  folderNamingPattern?: 'client-only' | 'year-client' | 'custom'
  customNamingTemplate?: string
}

export interface UserSettings {
  googleDrive?: GoogleDriveSettings
  // Other settings can be added here
}

export interface ClientStorageSettings {
  clientId: number
  clientName: string
  storageProvider: 'google-drive' | 'dropbox' | 'onedrive' | 'local'
  
  // Legacy single folder structure (maintained for backward compatibility)
  storageFolderId?: string
  storageFolderName?: string
  storageFolderPath?: string
  
  // New two-tier folder structure
  clientRootFolderId?: string
  clientRootFolderName?: string
  clientRootFolderPath?: string
  contentFolderId?: string
  contentFolderName?: string
  contentFolderPath?: string
  
  // Custom naming settings
  customNaming?: boolean
  namingTemplate?: string
  
  // Additional metadata
  metadata?: Record<string, unknown>
}

export interface FolderHierarchyConfig {
  useParentFolder: boolean
  parentFolderId?: string
  yearSubfolders: boolean
  namingPattern: string
} 