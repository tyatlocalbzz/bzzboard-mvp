'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Settings, Shield, Globe } from 'lucide-react'
import { useSystemSettings } from '@/lib/hooks/use-system-settings'
import { TIMEZONE_OPTIONS } from '@/lib/types/admin'
import { toast } from 'sonner'

export const AdminSettingsTab = () => {
  const {
    data,
    loading,
    error,
    isRefreshing,
    createPlatform,
    updatePlatformStatus,
    deletePlatform,
    createContentType,
    updateContentTypeStatus,
    deleteContentType,
    updateSetting
  } = useSystemSettings()

  const [newPlatformName, setNewPlatformName] = useState('')
  const [newContentTypeName, setNewContentTypeName] = useState('')
  const [newContentTypeValue, setNewContentTypeValue] = useState('')
  const [isCreatingPlatform, setIsCreatingPlatform] = useState(false)
  const [isCreatingContentType, setIsCreatingContentType] = useState(false)
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false)

  // Get current timezone setting
  const currentTimezone = data?.settings.find(s => s.key === 'default_timezone')?.value || 'America/New_York'
  
  // Debug logging for timezone
  console.log('🕐 [AdminSettings] Current timezone:', currentTimezone, 'from settings:', data?.settings.find(s => s.key === 'default_timezone'))

  const handleCreatePlatform = async () => {
    if (!newPlatformName.trim()) {
      toast.error('Platform name is required')
      return
    }

    try {
      setIsCreatingPlatform(true)
      await createPlatform(newPlatformName.trim())
      setNewPlatformName('')
      toast.success('Platform created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create platform')
    } finally {
      setIsCreatingPlatform(false)
    }
  }

  const handleCreateContentType = async () => {
    if (!newContentTypeName.trim() || !newContentTypeValue.trim()) {
      toast.error('Both name and value are required')
      return
    }

    try {
      setIsCreatingContentType(true)
      await createContentType(newContentTypeName.trim(), newContentTypeValue.trim())
      setNewContentTypeName('')
      setNewContentTypeValue('')
      toast.success('Content type created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create content type')
    } finally {
      setIsCreatingContentType(false)
    }
  }

  const handlePlatformToggle = async (id: string | number, enabled: boolean) => {
    try {
      await updatePlatformStatus(id, enabled)
      toast.success(`Platform ${enabled ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update platform')
    }
  }

  const handleContentTypeToggle = async (id: string | number, enabled: boolean) => {
    try {
      await updateContentTypeStatus(id, enabled)
      toast.success(`Content type ${enabled ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update content type')
    }
  }

  const handleDeletePlatform = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" platform? This action cannot be undone.`)) {
      return
    }

    try {
      await deletePlatform(id)
      toast.success('Platform deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete platform')
    }
  }

  const handleDeleteContentType = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" content type? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteContentType(id)
      toast.success('Content type deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete content type')
    }
  }

  const handleTimezoneChange = async (timezone: string) => {
    if (isUpdatingTimezone) {
      console.log('🕐 [AdminSettings] Timezone update already in progress, skipping...')
      return
    }

    console.log('🕐 [AdminSettings] Timezone change requested:', timezone)
    try {
      setIsUpdatingTimezone(true)
      await updateSetting('default_timezone', timezone, 'string', 'Default timezone for the application')
      console.log('🕐 [AdminSettings] Timezone update completed, data should refresh now')
      toast.success('Default timezone updated successfully')
    } catch (error) {
      console.error('🕐 [AdminSettings] Timezone update failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update timezone')
    } finally {
      setIsUpdatingTimezone(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-sm text-gray-600">Loading admin settings...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Error</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <p className="text-xs text-gray-500">Admin access is required to view these settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Admin Settings</h2>
          <p className="text-sm text-muted-foreground">Manage system-wide configuration</p>
        </div>
        {isRefreshing && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <LoadingSpinner size="sm" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* System Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">System Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Default Timezone</Label>
            <Select 
              value={currentTimezone} 
              onValueChange={handleTimezoneChange}
              disabled={isUpdatingTimezone || isRefreshing}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This timezone is used as the default for new users and calendar events
              {isUpdatingTimezone && (
                <span className="text-blue-600 ml-2">
                  <LoadingSpinner size="sm" className="inline mr-1" />
                  Saving...
                </span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Platform Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Platform Management</h3>
          <Badge variant="outline" className="text-xs">
            {data?.platforms.filter(p => p.enabled).length} / {data?.platforms.length} enabled
          </Badge>
        </div>

        {/* Add new platform */}
        <div className="flex gap-2 mb-4 p-3 bg-muted rounded-lg">
          <Input
            placeholder="Platform name (e.g., Snapchat)"
            value={newPlatformName}
            onChange={(e) => setNewPlatformName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlatform()}
            className="flex-1"
          />
          <Button 
            onClick={handleCreatePlatform}
            disabled={isCreatingPlatform || !newPlatformName.trim()}
            size="sm"
          >
            {isCreatingPlatform ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Platform list */}
        <div className="space-y-2">
          {data?.platforms.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{platform.name}</span>
                {platform.isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={platform.enabled}
                  onCheckedChange={(enabled) => handlePlatformToggle(platform.id, enabled)}
                />
                
                {!platform.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlatform(platform.id as number, platform.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Content Type Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Content Type Management</h3>
          <Badge variant="outline" className="text-xs">
            {data?.contentTypes.filter(ct => ct.enabled).length} / {data?.contentTypes.length} enabled
          </Badge>
        </div>

        {/* Add new content type */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted rounded-lg">
          <Input
            placeholder="Content type name"
            value={newContentTypeName}
            onChange={(e) => setNewContentTypeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateContentType()}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Value (e.g., tweet)"
              value={newContentTypeValue}
              onChange={(e) => setNewContentTypeValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateContentType()}
              className="flex-1"
            />
            <Button 
              onClick={handleCreateContentType}
              disabled={isCreatingContentType || !newContentTypeName.trim() || !newContentTypeValue.trim()}
              size="sm"
            >
              {isCreatingContentType ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content type list */}
        <div className="space-y-2">
          {data?.contentTypes.map((contentType) => (
            <div key={contentType.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium text-foreground">{contentType.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({contentType.value})</span>
                </div>
                {contentType.isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={contentType.enabled}
                  onCheckedChange={(enabled) => handleContentTypeToggle(contentType.id, enabled)}
                />
                
                {!contentType.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteContentType(contentType.id as number, contentType.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Separator />

      <div className="text-xs text-muted-foreground text-center">
        Changes to platforms and content types will affect all users and existing content.
        <br />
        Default items cannot be deleted but can be disabled.
      </div>
    </div>
  )
} 