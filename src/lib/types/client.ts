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

// Centralized mock client data
export const mockClients: ClientData[] = [
  { id: 'all', name: 'All Clients', type: 'all' },
  { id: '1', name: 'Acme Corp', type: 'client', activeProjects: 3 },
  { id: '2', name: 'TechStart Inc', type: 'client', activeProjects: 5 },
  { id: '3', name: 'Local Bistro', type: 'client', activeProjects: 2 },
  { id: '4', name: 'Fitness Plus', type: 'client', activeProjects: 1 },
]

export const DEFAULT_CLIENT = mockClients[0] 