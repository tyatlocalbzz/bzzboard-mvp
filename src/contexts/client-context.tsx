'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClientData, ClientContextType, mockClients, DEFAULT_CLIENT } from '@/lib/types/client'

const ClientContext = createContext<ClientContextType | undefined>(undefined)

interface ClientProviderProps {
  children: ReactNode
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
  const [selectedClient, setSelectedClientState] = useState<ClientData>(DEFAULT_CLIENT)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize from URL params after mounting
  useEffect(() => {
    setIsMounted(true)
    const clientId = searchParams.get('client')
    if (clientId) {
      const client = mockClients.find(c => c.id === clientId)
      if (client) {
        setSelectedClientState(client)
      }
    }
  }, [searchParams])

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
    clients: mockClients,
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