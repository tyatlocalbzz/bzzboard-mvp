'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientStorageSettingsForm } from './client-storage-settings-form'
import { 
  Users, 
  Settings, 
  HardDrive, 
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { ClientStorageSettings } from '@/lib/types/settings'

interface ClientWithStats {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  activeProjects: number
}

export const ClientSettingsTab = () => {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [clientSettings, setClientSettings] = useState<Record<number, ClientStorageSettings>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null)
  const [showSettingsForm, setShowSettingsForm] = useState(false)

  useEffect(() => {
    loadClientsAndSettings()
  }, [])

  const loadClientsAndSettings = async () => {
    try {
      setIsLoading(true)
      
      // Load clients and their settings in parallel
      const [clientsResponse, settingsResponse] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/client-settings')
      ])

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData.clients || [])
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        // Convert array to lookup object
        const settingsMap: Record<number, ClientStorageSettings> = {}
        settingsData.clientSettings?.forEach((setting: ClientStorageSettings) => {
          if (setting.clientId) {
            settingsMap[setting.clientId] = setting
          }
        })
        setClientSettings(settingsMap)
      }
    } catch (error) {
      console.error('Error loading clients and settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigureClient = (client: ClientWithStats) => {
    setSelectedClient(client)
    setShowSettingsForm(true)
  }

  const handleSaveSettings = (settings: ClientStorageSettings) => {
    // Update the settings in state
    if (settings.clientId) {
      setClientSettings(prev => ({
        ...prev,
        [settings.clientId!]: settings
      }))
    }
    
    // Close the form
    setShowSettingsForm(false)
    setSelectedClient(null)
  }

  const handleCancelSettings = () => {
    setShowSettingsForm(false)
    setSelectedClient(null)
  }

  const getStorageProviderBadge = (provider: string) => {
    switch (provider) {
      case 'google-drive':
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-blue-600" />
            Google Drive
          </Badge>
        )
      case 'dropbox':
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-purple-600" />
            Dropbox
          </Badge>
        )
      case 'onedrive':
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-green-600" />
            OneDrive
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-gray-600" />
            Default
          </Badge>
        )
    }
  }

  if (showSettingsForm && selectedClient) {
    return (
      <ClientStorageSettingsForm
        client={selectedClient}
        currentSettings={clientSettings[selectedClient.id] || null}
        onSave={handleSaveSettings}
        onCancel={handleCancelSettings}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading client settings...</span>
      </div>
    )
  }

  const totalClients = clients.length
  const configuredClients = Object.keys(clientSettings).length
  const unconfiguredClients = totalClients - configuredClients

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Client Storage Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure storage locations and organization preferences for each client
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{totalClients}</p>
                <p className="text-xs text-gray-600">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{configuredClients}</p>
                <p className="text-xs text-gray-600">Configured</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{unconfiguredClients}</p>
                <p className="text-xs text-gray-600">Using Defaults</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      {totalClients === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Create your first client to configure storage settings"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Client Storage Configuration
            </CardTitle>
            <CardDescription>
              Manage storage settings for each client individually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clients.map((client) => {
                const settings = clientSettings[client.id]
                const isConfigured = !!settings
                
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{client.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {isConfigured ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-green-600">Configured</span>
                                {getStorageProviderBadge(settings.storageProvider)}
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <span className="text-xs text-orange-600">Using defaults</span>
                                {getStorageProviderBadge('default')}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isConfigured && settings.storageFolderPath && (
                        <p className="text-xs text-gray-500 mt-2 font-mono">
                          📁 {settings.storageFolderPath}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureClient(client)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        {isConfigured ? 'Edit' : 'Configure'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 