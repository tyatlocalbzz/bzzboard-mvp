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
  storageFolderId?: string
  storageFolderName?: string
  storageFolderPath?: string
  customNaming: boolean
  namingTemplate?: string
  metadata?: Record<string, unknown>
}

export interface FolderHierarchyConfig {
  useParentFolder: boolean
  parentFolderId?: string
  yearSubfolders: boolean
  namingPattern: string
} 