import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useApiData } from './use-api-data'
import { ClientData, DEFAULT_CLIENT } from '@/lib/types/client'

interface UseClientsReturn {
  clients: ClientData[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Reusable hook for client data management
 * Replaces manual API logic in ClientContext with standardized patterns
 * Handles authentication states and provides consistent error handling
 */
export const useClients = (): UseClientsReturn => {
  const { status } = useSession()

  // Transform function to handle API response and add default client
  const transform = useCallback((apiResponse: unknown) => {
    console.log('🔄 [useClients] Transform input:', apiResponse)
    
    // Handle new standardized API format: { success: true, data: { clients: [...] } }
    const result = (apiResponse as { data?: { clients?: ClientData[] } }).data
    const apiClients = result?.clients || []
    
    console.log('📊 [useClients] API clients received:', {
      count: apiClients.length,
      clients: apiClients.map((c: ClientData) => ({ id: c.id, name: c.name, type: c.type }))
    })
    
    // Always include the "All Clients" option as the first item
    // Filter out any existing "All Clients" entries from API response to avoid duplicates
    const realClients = apiClients.filter((client: ClientData) => client.type !== 'all')
    const clients = [DEFAULT_CLIENT, ...realClients]
    
    console.log('✅ [useClients] Successfully loaded', clients.length, 'clients (including All Clients option)')
    return clients
  }, [])

  // Error callback for consistent error handling
  const onError = useCallback((error: string) => {
    console.error('❌ [useClients] Error fetching clients:', error)
  }, [])

  // Use standardized API data hook with conditional fetching
  const { data: clients, isLoading, error, refresh } = useApiData<ClientData[]>({
    endpoint: '/api/clients',
    autoFetch: status === 'authenticated', // Only fetch when authenticated
    dependencies: [status],
    transform,
    onError
  })

  // Return default client array for unauthenticated users or when data is null
  const effectiveClients = status === 'unauthenticated' || !clients ? [DEFAULT_CLIENT] : clients

  return {
    clients: effectiveClients,
    isLoading: status === 'loading' || (status === 'authenticated' && isLoading),
    error,
    refresh
  }
} 