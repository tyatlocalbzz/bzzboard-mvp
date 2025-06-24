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
}

// Default client for "All Clients" view
export const DEFAULT_CLIENT: ClientData = { id: 'all', name: 'All Clients', type: 'all' } 