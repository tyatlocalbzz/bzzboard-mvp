'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClientData, ClientContextType, DEFAULT_CLIENT } from '@/lib/types/client'

// API function to fetch clients
const fetchClients = async (): Promise<ClientData[]> => {
  try {
    console.log('🔄 [ClientContext] Fetching clients from API...')
    const response = await fetch('/api/clients', { credentials: 'include' })
    
    console.log('📡 [ClientContext] API response status:', response.status)
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('🔒 [ClientContext] Authentication required - user not signed in')
        // Return default client for unauthenticated users
        return [DEFAULT_CLIENT]
      }
      
      console.error('❌ [ClientContext] Failed to fetch clients:', response.status, response.statusText)
      // Return default clients on other errors
      return [DEFAULT_CLIENT]
    }
    
    const data = await response.json()
    console.log('📊 [ClientContext] API response data:', { success: data.success, clientCount: data.clients?.length || 0 })
    
    if (!data.success) {
      console.error('❌ [ClientContext] API returned error:', data.error)
      // Return default clients on API error
      return [DEFAULT_CLIENT]
    }
    
    const apiClients = data.clients || []
    
    // Always include the "All Clients" option as the first item
    // Filter out any existing "All Clients" entries from API response to avoid duplicates
    const realClients = apiClients.filter((client: ClientData) => client.type !== 'all')
    const clients = [DEFAULT_CLIENT, ...realClients]
    
    console.log('✅ [ClientContext] Successfully loaded', clients.length, 'clients (including All Clients option)')
    return clients
    
  } catch (error) {
    console.error('❌ [ClientContext] Network or parsing error:', error)
    // Return default clients on network/parsing errors
    return [DEFAULT_CLIENT]
  }
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

interface ClientProviderProps {
  children: ReactNode
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
  const [selectedClient, setSelectedClientState] = useState<ClientData>(DEFAULT_CLIENT)
  const [clients, setClients] = useState<ClientData[]>([DEFAULT_CLIENT])
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load clients from API
  useEffect(() => {
    const loadClients = async () => {
      try {
        const fetchedClients = await fetchClients()
        
        // Always include the "All Clients" option as the first item
        // Filter out any existing "All Clients" entries from API response to avoid duplicates
        const realClients = fetchedClients.filter(client => client.type !== 'all')
        const allClients = [DEFAULT_CLIENT, ...realClients]
        
        console.log('✅ [ClientContext] Setting clients list:', allClients.map(c => ({ id: c.id, name: c.name, type: c.type })))
        setClients(allClients)
      } catch (error) {
        console.error('Error loading clients:', error)
        // Keep default clients on error
        setClients([DEFAULT_CLIENT])
      }
    }

    loadClients()
  }, [])

  // Initialize from URL params after mounting
  useEffect(() => {
    setIsMounted(true)
    const clientId = searchParams.get('client')
    if (clientId) {
      const client = clients.find((c: ClientData) => c.id === clientId)
      if (client) {
        setSelectedClientState(client)
      }
    }
  }, [searchParams, clients])

  const setSelectedClient = useCallback((client: ClientData) => {
    setSelectedClientState(client)
    
    // Update URL with client selection (only after mounted)
    if (isMounted) {
      try {
        const current = new URLSearchParams(Array.from(searchParams.entries()))
        
        if (client.id === DEFAULT_CLIENT.id) {
          current.delete('client')
        } else {
          current.set('client', client.id)
        }
        
        const search = current.toString()
        const query = search ? `?${search}` : ''
        
        // Use replace to avoid adding to browser history
        router.replace(`${window.location.pathname}${query}`, { scroll: false })
      } catch (error) {
        console.error('Failed to update URL with client selection:', error)
        // Continue without URL update if it fails
      }
    }
  }, [isMounted, router, searchParams])

  const value: ClientContextType = {
    selectedClient,
    setSelectedClient,
    clients,
  }

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  )
}

export const useClient = () => {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider')
  }
  return context
} 