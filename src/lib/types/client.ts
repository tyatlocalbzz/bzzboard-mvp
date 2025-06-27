export interface ClientData {
  id: string
  name: string
  type: 'all' | 'client'
  activeProjects?: number
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

export interface ClientContextType {
  selectedClient: ClientData
  setSelectedClient: (client: ClientData) => void
  clients: ClientData[]
  isLoading?: boolean
  refresh?: () => Promise<void>
}

// Default client for "All Clients" view
export const DEFAULT_CLIENT: ClientData = { id: 'all', name: 'All Clients', type: 'all' }

// Post dependencies for delete confirmation
export interface PostDependencies {
  shoots: {
    id: number
    title: string
    scheduledAt: string
    status: string
    client: string
  }[]
  uploadedFiles: number
  hasShootDependencies: boolean
  hasFileDependencies: boolean
} 