'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, Building, Users, UserPlus } from 'lucide-react'
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
import { AddClientWizard } from '@/components/clients/add-client-wizard'

interface ClientSelectorProps {
  compact?: boolean
  className?: string
}

export const ClientSelector = ({ compact = false, className }: ClientSelectorProps) => {
  const [isMounted, setIsMounted] = useState(false)
  const [showAddClientWizard, setShowAddClientWizard] = useState(false)
  
  // Always call the hook - React hooks must be called unconditionally
  const contextData = useClient()
  
  // Check if context data is available (handle context provider errors)
  const hasValidContext = contextData && contextData.selectedClient && contextData.clients

  // Ensure hydration safety
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Memoize the clients data from context to prevent reference changes
  const stableClientsData = useMemo(() => {
    if (!hasValidContext) return []
    return contextData.clients
  }, [hasValidContext, contextData.clients])

  // Memoize clients array based on actual data changes, not reference changes
  const memoizedClients = useMemo(() => {
    // Create a stable representation by serializing the essential data
    return stableClientsData.map(client => ({
      id: client.id,
      name: client.name,
      type: client.type,
      activeProjects: client.activeProjects
    }))
  }, [stableClientsData])

  // Debug logging for clients list changes
  useEffect(() => {
    if (memoizedClients && memoizedClients.length > 0) {
      console.log('📋 [ClientSelector] Clients list updated:', {
        count: memoizedClients.length,
        clients: memoizedClients.map(c => ({ id: c.id, name: c.name, type: c.type }))
      })
    }
  }, [memoizedClients])

  const handleClientSelect = (client: ClientData) => {
    console.log('🔄 [ClientSelector] Selecting client:', client.name, 'ID:', client.id)
    if (contextData?.setSelectedClient) {
      contextData.setSelectedClient(client)
    }
  }

  // Show error state if context is not available
  if (!hasValidContext) {
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={`h-8 px-2 text-left justify-between min-w-0 max-w-[140px] ${className}`}
          >
            <div className="flex items-center gap-1 min-w-0">
              {contextData.selectedClient.type === 'all' ? (
                <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-xs font-medium truncate">
                {compact && contextData.selectedClient.name.length > 12 
                  ? `${contextData.selectedClient.name.substring(0, 12)}...`
                  : contextData.selectedClient.name
                }
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Client Context
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {memoizedClients.map((client) => (
            <DropdownMenuItem
              key={client.id}
              onClick={() => handleClientSelect(client)}
              className={`flex items-center justify-between py-2 ${
                contextData.selectedClient.id === client.id ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {client.type === 'all' ? (
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{client.name}</div>
                  {client.type === 'client' && client.activeProjects && (
                    <div className="text-xs text-muted-foreground">
                      {client.activeProjects} active project{client.activeProjects !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
              
              {contextData.selectedClient.id === client.id && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-xs text-primary justify-center cursor-pointer"
            onClick={() => setShowAddClientWizard(true)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add New Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Add Client Wizard - Controlled externally */}
      <AddClientWizard
        open={showAddClientWizard}
        onOpenChange={setShowAddClientWizard}
        onSuccess={(newClient) => {
          console.log('New client created:', newClient.name)
          setShowAddClientWizard(false)
        }}
      >
        <div />
      </AddClientWizard>
    </>
  )
} 