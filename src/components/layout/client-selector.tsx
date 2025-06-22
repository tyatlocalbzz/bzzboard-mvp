'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Building, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useClient } from '@/contexts/client-context'
import { ClientData } from '@/lib/types/client'

interface ClientSelectorProps {
  compact?: boolean
  className?: string
}

export const ClientSelector = ({ compact = false, className }: ClientSelectorProps) => {
  const [isMounted, setIsMounted] = useState(false)
  
  // Always call the hook - handle errors in render
  let selectedClient: ClientData | undefined
  let clients: ClientData[] = []
  let setSelectedClient: ((client: ClientData) => void) | undefined
  let hasError = false

  try {
    const context = useClient()
    selectedClient = context.selectedClient
    clients = context.clients
    setSelectedClient = context.setSelectedClient
  } catch (error) {
    console.error('ClientSelector: Failed to access client context:', error)
    hasError = true
  }

  // Ensure hydration safety
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleClientSelect = (client: ClientData) => {
    if (setSelectedClient) {
      setSelectedClient(client)
    }
  }

  // Show error state if context is not available
  if (hasError || !selectedClient) {
    return (
      <Button 
        variant="ghost" 
        className={`h-8 px-2 text-left justify-between min-w-0 max-w-[140px] ${className}`}
        disabled
        title="Client selector unavailable"
      >
        <div className="flex items-center gap-1 min-w-0">
          <Users className="h-3 w-3 text-red-500 flex-shrink-0" />
          <span className="text-xs font-medium truncate text-red-500">Error</span>
        </div>
        <ChevronDown className="h-3 w-3 text-red-400 flex-shrink-0 ml-1" />
      </Button>
    )
  }

  // Show loading state until mounted
  if (!isMounted) {
    return (
      <Button 
        variant="ghost" 
        className={`h-8 px-2 text-left justify-between min-w-0 max-w-[140px] ${className}`}
        disabled
      >
        <div className="flex items-center gap-1 min-w-0">
          <Users className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs font-medium truncate">Loading...</span>
        </div>
        <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-1" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`h-8 px-2 text-left justify-between min-w-0 max-w-[140px] ${className}`}
        >
          <div className="flex items-center gap-1 min-w-0">
            {selectedClient.type === 'all' ? (
              <Users className="h-3 w-3 text-gray-500 flex-shrink-0" />
            ) : (
              <Building className="h-3 w-3 text-gray-500 flex-shrink-0" />
            )}
            <span className="text-xs font-medium truncate">
              {compact && selectedClient.name.length > 12 
                ? `${selectedClient.name.substring(0, 12)}...`
                : selectedClient.name
              }
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">
          Client Context
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => handleClientSelect(client)}
            className={`flex items-center justify-between py-2 ${
              selectedClient.id === client.id ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {client.type === 'all' ? (
                <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
              ) : (
                <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{client.name}</div>
                {client.type === 'client' && client.activeProjects && (
                  <div className="text-xs text-gray-600">
                    {client.activeProjects} active project{client.activeProjects !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            
            {selectedClient.id === client.id && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-gray-600 justify-center">
          + Add New Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 