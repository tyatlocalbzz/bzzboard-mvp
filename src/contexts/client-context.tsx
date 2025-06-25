'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ClientData, ClientContextType, DEFAULT_CLIENT } from '@/lib/types/client'

const ClientContext = createContext<ClientContextType | undefined>(undefined)

interface ClientProviderProps {
  children: ReactNode
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
  const [selectedClient, setSelectedClientState] = useState<ClientData>(DEFAULT_CLIENT)
  const [clients, setClients] = useState<ClientData[]>([DEFAULT_CLIENT])
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  // Fetch clients data directly in the provider
  const fetchClients = useCallback(async () => {
    if (status !== 'authenticated') {
      setClients([DEFAULT_CLIENT])
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/clients')

      if (response.ok) {
        const result = await response.json()

        if (result.success && result.data?.clients) {
          const apiClients = result.data.clients
          const allClients = [DEFAULT_CLIENT, ...apiClients]
          setClients(allClients)
        }
      }
    } catch (error) {
      console.error('❌ [ClientProvider] Fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  // Fetch clients when session status changes
  useEffect(() => {
    fetchClients()
  }, [status, fetchClients])

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
        console.error('❌ [ClientProvider] Failed to update URL with client selection:', error)
        // Continue without URL update if it fails
      }
    }
  }, [isMounted, router, searchParams])

  const refreshClients = useCallback(async () => {
    await fetchClients()
  }, [fetchClients])

  const value: ClientContextType = {
    selectedClient,
    setSelectedClient,
    clients,
    isLoading,
    refresh: refreshClients,
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