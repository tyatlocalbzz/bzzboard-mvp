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
import { MobileInput } from '@/components/ui/mobile-input'
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
import { clientValidation, validateField } from '@/lib/validation/client-validation'
import { useAdminEnabledPlatforms } from '@/lib/hooks/use-client-platforms'

export const ClientSettingsTab = () => {
  const { selectedClient } = useClient()
  const adminEnabledPlatforms = useAdminEnabledPlatforms()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [storageSettings, setStorageSettings] = useState<ClientStorageSettings | null>(null)
  const [showStorageDialog, setShowStorageDialog] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (selectedClient && selectedClient.type === 'client') {
      loadClientData(selectedClient.id)
    } else {
      setClientData(null)
      setStorageSettings(null)
    }
  }, [selectedClient])

  useEffect(() => {
    checkGoogleDriveStatus()
  }, [])

  const checkGoogleDriveStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setGoogleDriveConnected(data.integrations?.googleDrive?.connected || false)
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error)
    }
  }

  const loadClientData = async (clientId: string) => {
    try {
      setIsLoading(true)
      
      const [clientResponse, storageResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`, { credentials: 'include' }),
        fetch(`/api/client-settings/${clientId}`, { credentials: 'include' })
      ])

      if (clientResponse.ok) {
        const clientData = await clientResponse.json()
        setClientData(clientData.client)
      } else {
        const errorText = await clientResponse.text()
        console.error('❌ [ClientSettings] Client API error:', clientResponse.status, errorText)
        toast.error(`Failed to load client: ${clientResponse.status}`)
      }

      if (storageResponse.ok) {
        const storageData = await storageResponse.json()
        setStorageSettings(storageData.clientSettings)
      } else {
        setStorageSettings(null)
      }
    } catch (error) {
      console.error('❌ [ClientSettings] Error loading client data:', error)
      toast.error('Failed to load client data')
    } finally {
      setIsLoading(false)
    }
  }

  // Phone number formatting utility
  const formatPhoneNumber = (value: string): string => {
    return clientValidation.phone.format(value)
  }

  const handleFieldChange = (field: keyof ClientData, value: string) => {
    if (!clientData) return
    
    // Apply phone formatting if it's the phone field
    const processedValue = field === 'primaryContactPhone' ? formatPhoneNumber(value) : value
    
    setClientData(prev => ({
      ...prev!,
      [field]: processedValue
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

  // Handle field blur to mark as touched
  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
  }

  // Get field validation state
  const getFieldValidationState = (fieldName: string, value: string) => {
    const touched = touchedFields[fieldName]
    return validateField(fieldName, value, touched, false)
  }

  const validateForm = (): string | null => {
    if (!clientData) return 'No client data available'
    
    const validation = clientValidation.clientData({
      name: clientData.name,
      primaryContactName: clientData.primaryContactName,
      primaryContactEmail: clientData.primaryContactEmail,
      primaryContactPhone: clientData.primaryContactPhone,
      website: clientData.website
    })
    
    if (!validation.valid) {
      // Return the first error found
      return Object.values(validation.errors)[0] as string
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
        toast.success('Client settings saved!')
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

  if (!selectedClient || selectedClient.type === 'all') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Select Client:</Label>
            <ClientSelector className="max-w-[200px]" />
          </div>
        </div>

        <EmptyState
          icon={User}
          title="Select a client"
          description="Choose a client to configure settings"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Client:</Label>
            <ClientSelector className="max-w-[200px]" />
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
          
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
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Client Settings</h2>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-gray-700">Client:</Label>
          <ClientSelector className="max-w-[200px]" />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-sm font-medium">
              Client Name *
            </Label>
            <MobileInput
              id="clientName"
              value={clientData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="Enter client name"
              validationState={getFieldValidationState('name', clientData.name || '').state}
              error={touchedFields.name && !clientData.name ? 'Client name is required' : undefined}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Primary Contact</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-sm">
                  Contact Name *
                </Label>
                <MobileInput
                  id="contactName"
                  value={clientData.primaryContactName || ''}
                  onChange={(e) => handleFieldChange('primaryContactName', e.target.value)}
                  onBlur={() => handleFieldBlur('primaryContactName')}
                  placeholder="John Doe"
                  validationState={getFieldValidationState('primaryContactName', clientData.primaryContactName || '').state}
                  error={touchedFields.primaryContactName && !clientData.primaryContactName ? 'Contact name is required' : undefined}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-sm">
                  Phone
                </Label>
                <MobileInput
                  id="contactPhone"
                  type="tel"
                  value={clientData.primaryContactPhone || ''}
                  onChange={(e) => handleFieldChange('primaryContactPhone', e.target.value)}
                  onBlur={() => handleFieldBlur('primaryContactPhone')}
                  placeholder="(555) 123-4567"
                  validationState={getFieldValidationState('primaryContactPhone', clientData.primaryContactPhone || '').state}
                  error={touchedFields.primaryContactPhone && clientData.primaryContactPhone && !clientValidation.phone.validate(clientData.primaryContactPhone).valid ? 'Please enter a valid phone number' : undefined}
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-sm">
                Email *
              </Label>
              <MobileInput
                id="contactEmail"
                type="email"
                value={clientData.primaryContactEmail || ''}
                onChange={(e) => handleFieldChange('primaryContactEmail', e.target.value)}
                onBlur={() => handleFieldBlur('primaryContactEmail')}
                placeholder="john@example.com"
                validationState={getFieldValidationState('primaryContactEmail', clientData.primaryContactEmail || '').state}
                error={touchedFields.primaryContactEmail && (!clientData.primaryContactEmail || !clientValidation.email(clientData.primaryContactEmail).valid) ? 'Please enter a valid email address' : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              Website
            </Label>
            <MobileInput
              id="website"
              value={clientData.website || ''}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              onBlur={() => handleFieldBlur('website')}
              placeholder="example.com"
              validationState={getFieldValidationState('website', clientData.website || '').state}
              error={touchedFields.website && clientData.website && !clientValidation.website(clientData.website).valid ? 'Please enter a valid website URL' : undefined}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              Social Media
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminEnabledPlatforms.map((platform) => {
                // Map platform names to social media keys
                const platformToSocialKey: Record<string, keyof NonNullable<ClientData['socialMedia']>> = {
                  'Instagram': 'instagram',
                  'Facebook': 'facebook',
                  'LinkedIn': 'linkedin',
                  'X': 'twitter', // X platform uses the twitter field in client data
                  'TikTok': 'tiktok',
                  'YouTube': 'youtube'
                }
                
                const socialKey = platformToSocialKey[platform.name]
                if (!socialKey) return null // Skip platforms without social media mapping
                
                return (
                  <div key={platform.name} className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      {platform.name === 'Instagram' && <Instagram className="h-3 w-3 text-pink-600" />}
                      {platform.name === 'Facebook' && <Facebook className="h-3 w-3 text-blue-600" />}
                      {platform.name === 'LinkedIn' && <Linkedin className="h-3 w-3 text-blue-700" />}
                      {platform.name === 'X' && <Twitter className="h-3 w-3 text-blue-500" />}
                      {platform.name === 'TikTok' && (
                        <div className="h-3 w-3 bg-black rounded-sm flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">T</span>
                        </div>
                      )}
                      {platform.name === 'YouTube' && <Youtube className="h-3 w-3 text-red-600" />}
                      {platform.name}
                    </Label>
                    <Input
                      value={clientData.socialMedia?.[socialKey] || ''}
                      onChange={(e) => handleSocialMediaChange(socialKey, e.target.value)}
                      placeholder={
                        platform.name === 'Facebook' ? 'PageName or @username' :
                        platform.name === 'LinkedIn' ? 'company/companyname' :
                        platform.name === 'YouTube' ? '@channelname' :
                        '@username'
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={clientData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Storage Settings</h3>
        </div>

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
                    onSave={async (newSettings: ClientStorageSettings) => {
                      try {
                        console.log('💾 [ClientSettingsTab] Saving storage settings:', newSettings)
                        
                        // Save to database via API
                        const response = await fetch(`/api/client-settings/${clientData.id}`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(newSettings)
                        })

                        if (!response.ok) {
                          const errorData = await response.json()
                          throw new Error(errorData.error || 'Failed to save settings')
                        }

                        const result = await response.json()
                        console.log('✅ [ClientSettingsTab] Storage settings saved successfully:', result)
                        
                        // Update local state with saved settings
                        setStorageSettings(result.clientSettings)
                        setShowStorageDialog(false)
                        toast.success('Storage settings saved successfully!')
                      } catch (error) {
                        console.error('❌ [ClientSettingsTab] Error saving storage settings:', error)
                        toast.error(error instanceof Error ? error.message : 'Failed to save storage settings')
                      }
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

      <LoadingButton
        onClick={handleSave}
        loading={isSaving}
        className="w-full h-12"
      >
        <Save className="h-4 w-4 mr-2" />
        Save Changes
      </LoadingButton>
    </div>
  )
} 