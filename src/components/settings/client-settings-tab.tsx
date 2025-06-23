'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoadingButton } from '@/components/ui/loading-button'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientSelector } from '@/components/layout/client-selector'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ClientStorageSettingsForm } from '@/components/settings/client-storage-settings-form'
import { 
  User, 
  Globe, 
  MessageSquare,
  Save,
  AlertCircle,
  HardDrive,
  Settings,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube
} from 'lucide-react'
import { useClient } from '@/contexts/client-context'
import { ClientData } from '@/lib/types/client'
import { ClientStorageSettings } from '@/lib/types/settings'
import { toast } from 'sonner'

export const ClientSettingsTab = () => {
  const { selectedClient } = useClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [storageSettings, setStorageSettings] = useState<ClientStorageSettings | null>(null)
  const [showStorageDialog, setShowStorageDialog] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)

  // Load client data when selection changes
  useEffect(() => {
    if (selectedClient && selectedClient.type === 'client') {
      loadClientData(selectedClient.id)
    } else {
      setClientData(null)
      setStorageSettings(null)
    }
  }, [selectedClient])

  // Check Google Drive connection status
  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  const checkGoogleDriveStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setGoogleDriveConnected(data.integrations?.['google-drive']?.connected || false)
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error)
    }
  }

  const loadClientData = async (clientId: string) => {
    try {
      setIsLoading(true)
      
      console.log('🔍 [ClientSettings] Loading data for client:', clientId)
      
      // Load client details and storage settings in parallel
      const [clientResponse, storageResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`, { credentials: 'include' }),
        fetch(`/api/client-settings/${clientId}`, { credentials: 'include' })
      ])

      console.log('📊 [ClientSettings] Client response status:', clientResponse.status)
      console.log('📊 [ClientSettings] Storage response status:', storageResponse.status)

      if (clientResponse.ok) {
        const clientData = await clientResponse.json()
        console.log('✅ [ClientSettings] Client data loaded:', clientData)
        setClientData(clientData.client)
      } else {
        const errorText = await clientResponse.text()
        console.error('❌ [ClientSettings] Client API error:', clientResponse.status, errorText)
        toast.error(`Failed to load client: ${clientResponse.status}`)
      }

      if (storageResponse.ok) {
        const storageData = await storageResponse.json()
        console.log('✅ [ClientSettings] Storage data loaded:', storageData)
        setStorageSettings(storageData.clientSettings)
      } else {
        const errorText = await storageResponse.text()
        console.log('⚠️ [ClientSettings] Storage settings not found:', storageResponse.status, errorText)
        // No storage settings exist yet
        setStorageSettings(null)
      }
    } catch (error) {
      console.error('❌ [ClientSettings] Error loading client data:', error)
      toast.error('Failed to load client data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldChange = (field: keyof ClientData, value: string) => {
    if (!clientData) return
    
    setClientData(prev => ({
      ...prev!,
      [field]: value
    }))
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    if (!clientData) return
    
    setClientData(prev => ({
      ...prev!,
      socialMedia: {
        ...prev!.socialMedia,
        [platform]: value.trim() || undefined
      }
    }))
  }

  const validateForm = (): string | null => {
    if (!clientData?.name?.trim()) {
      return 'Client name is required'
    }

    if (clientData.primaryContactEmail && 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.primaryContactEmail)) {
      return 'Invalid email format'
    }

    if (clientData.website && 
        clientData.website.trim() && 
        !clientData.website.startsWith('http')) {
      return 'Website must start with http:// or https://'
    }

    return null
  }

  const handleSave = async () => {
    if (!clientData) return

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch(`/api/clients/${clientData.id}`, { credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: clientData.name,
          primaryContactName: clientData.primaryContactName,
          primaryContactEmail: clientData.primaryContactEmail,
          primaryContactPhone: clientData.primaryContactPhone,
          website: clientData.website,
          socialMedia: clientData.socialMedia,
          notes: clientData.notes
        })
      })

      if (response.ok) {
        toast.success('Client settings saved successfully!')
        // Reload to get fresh data
        await loadClientData(clientData.id)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save client settings')
    } finally {
      setIsSaving(false)
    }
  }

  const getStorageProviderBadge = (provider?: string) => {
    switch (provider) {
      case 'google-drive':
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-blue-600" />
            Google Drive
            {googleDriveConnected && <span className="ml-1 text-green-600">✓</span>}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <HardDrive className="h-3 w-3 mr-1 text-gray-600" />
            Default Storage
          </Badge>
        )
    }
  }

  // Show empty state if no client selected or "All Clients" selected
  if (!selectedClient || selectedClient.type === 'all') {
    return (
      <div className="space-y-6">
        {/* Header with Client Selector */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
            <p className="text-sm text-gray-600">
              Select a client to configure their details and storage settings
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Select Client:</Label>
            <ClientSelector className="max-w-[200px]" />
          </div>
        </div>

        <EmptyState
          icon={User}
          title="Select a client"
          description="Choose a client from the dropdown above to configure their settings"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header with Client Selector */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
            <p className="text-sm text-gray-600">
              Configure client details and storage settings
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Client:</Label>
            <ClientSelector className="max-w-[200px]" />
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading client settings...</span>
        </div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
            <p className="text-sm text-gray-600">
              Configure client details and storage settings
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Client:</Label>
            <ClientSelector className="max-w-[200px]" />
          </div>
        </div>

        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Failed to load client data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Client Selector */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
          <p className="text-sm text-gray-600">
            Configure {clientData.name}&apos;s details and storage settings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-gray-700">Client:</Label>
          <ClientSelector className="max-w-[200px]" />
        </div>
      </div>

      <Separator />

      {/* Client Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
        </div>
        <p className="text-sm text-gray-600">
          Basic information and contact details for {clientData.name}
        </p>

        <div className="space-y-4">
          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-sm font-medium">
              Client Name *
            </Label>
            <Input
              id="clientName"
              value={clientData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          {/* Primary Contact Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Primary Contact</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-sm">
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  value={clientData.primaryContactName || ''}
                  onChange={(e) => handleFieldChange('primaryContactName', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-sm">
                  Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={clientData.primaryContactPhone || ''}
                  onChange={(e) => handleFieldChange('primaryContactPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-sm">
                Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={clientData.primaryContactEmail || ''}
                onChange={(e) => handleFieldChange('primaryContactEmail', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              Website
            </Label>
            <Input
              id="website"
              value={clientData.website || ''}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Social Media Handles */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              Social Media Handles
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Instagram */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Instagram className="h-3 w-3 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  value={clientData.socialMedia?.instagram || ''}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  placeholder="@username"
                />
              </div>

              {/* Facebook */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Facebook className="h-3 w-3 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  value={clientData.socialMedia?.facebook || ''}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  placeholder="PageName or @username"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Linkedin className="h-3 w-3 text-blue-700" />
                  LinkedIn
                </Label>
                <Input
                  value={clientData.socialMedia?.linkedin || ''}
                  onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                  placeholder="company/companyname"
                />
              </div>

              {/* Twitter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Twitter className="h-3 w-3 text-blue-500" />
                  Twitter
                </Label>
                <Input
                  value={clientData.socialMedia?.twitter || ''}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  placeholder="@username"
                />
              </div>

              {/* TikTok */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <div className="h-3 w-3 bg-black rounded-sm flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">T</span>
                  </div>
                  TikTok
                </Label>
                <Input
                  value={clientData.socialMedia?.tiktok || ''}
                  onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                  placeholder="@username"
                />
              </div>

              {/* YouTube */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Youtube className="h-3 w-3 text-red-600" />
                  YouTube
                </Label>
                <Input
                  value={clientData.socialMedia?.youtube || ''}
                  onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                  placeholder="@channelname"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={clientData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional notes about this client..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Storage Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Storage Settings</h3>
        </div>
        <p className="text-sm text-gray-600">
          Configure where {clientData.name}&apos;s content will be stored
        </p>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Storage Provider</span>
              {getStorageProviderBadge(storageSettings?.storageProvider)}
            </div>
            {storageSettings?.storageFolderPath ? (
              <p className="text-xs text-gray-500 font-mono">
                📁 {storageSettings.storageFolderPath}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Using default storage location
              </p>
            )}
          </div>
          
          <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Storage Settings for {clientData.name}</DialogTitle>
                <DialogDescription>
                  Configure storage provider and folder organization
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {clientData && (
                  <ClientStorageSettingsForm
                    client={{
                      id: parseInt(clientData.id),
                      name: clientData.name,
                      email: clientData.primaryContactEmail || null,
                      phone: clientData.primaryContactPhone || null,
                      notes: clientData.notes || null,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      activeProjects: clientData.activeProjects || 0
                    }}
                    currentSettings={storageSettings}
                    onSave={(newSettings: ClientStorageSettings) => {
                      setStorageSettings(newSettings)
                      setShowStorageDialog(false)
                      toast.success('Storage settings saved successfully!')
                    }}
                    onCancel={() => setShowStorageDialog(false)}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Save Changes</h3>
        <LoadingButton
          onClick={handleSave}
          loading={isSaving}
          className="w-full h-12"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Client Settings
        </LoadingButton>
      </div>
    </div>
  )
} 