'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

import { Calendar, RefreshCw, AlertCircle, Crown, Clock, Filter, Target, Shield } from 'lucide-react'
import { toast } from 'sonner'
import * as CalendarTypes from '@/lib/types/calendar'

interface GoogleCalendarInfo {
  id: string
  name: string
  description?: string
  primary: boolean
  accessRole: string
  backgroundColor?: string
  foregroundColor?: string
  selected: boolean
  timeZone?: string
}

interface GoogleCalendarSettingsProps {
  isConnected: boolean
}

export const GoogleCalendarSettings = ({ 
  isConnected 
}: GoogleCalendarSettingsProps) => {
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set(['primary']))
  const [settings, setSettings] = useState<CalendarTypes.GoogleCalendarSettings>(CalendarTypes.DEFAULT_GOOGLE_CALENDAR_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const lastSavedStateRef = useRef<{
    settings: CalendarTypes.GoogleCalendarSettings
    selectedCalendars: string[]
  } | null>(null)

  // Fetch available calendars and current settings
  const fetchCalendarsAndSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/integrations/google-calendar/calendars')
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please reconnect your Google Calendar')
        }
        throw new Error('Failed to fetch calendars')
      }

      const data = await response.json()
      
      if (data.success) {
        setCalendars(data.calendars)
        
        // Initialize selected calendars from the response
        const defaultSelected = new Set(['primary'])
        data.calendars.forEach((cal: GoogleCalendarInfo) => {
          if (cal.selected) {
            defaultSelected.add(cal.id)
          }
        })
        setSelectedCalendars(defaultSelected)

        // If we have settings in the response, use them
        if (data.settings) {
          setSettings(data.settings)
          // If settings has selectedCalendars, use those instead
          if (data.settings.selectedCalendars && Array.isArray(data.settings.selectedCalendars)) {
            setSelectedCalendars(new Set(data.settings.selectedCalendars))
          }
        }
        
        // Mark initial load as complete and set initial saved state
        setInitialLoadComplete(true)
        lastSavedStateRef.current = {
          settings: data.settings || CalendarTypes.DEFAULT_GOOGLE_CALENDAR_SETTINGS,
          selectedCalendars: data.settings?.selectedCalendars || Array.from(defaultSelected)
        }
      } else {
        throw new Error('Failed to load calendar list')
      }
    } catch (err) {
      console.error('Error fetching calendars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendars')
    } finally {
      setLoading(false)
    }
  }



  // Toggle calendar selection
  const toggleCalendar = (calendarId: string) => {
    const newSelected = new Set(selectedCalendars)
    if (newSelected.has(calendarId)) {
      // Don't allow deselecting primary calendar
      if (calendarId !== 'primary') {
        newSelected.delete(calendarId)
      }
    } else {
      newSelected.add(calendarId)
    }
    setSelectedCalendars(newSelected)
  }

  // Update settings
  const updateSettings = (updates: Partial<CalendarTypes.GoogleCalendarSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  // Update working hours
  const updateWorkingHours = (updates: Partial<CalendarTypes.GoogleCalendarSettings['workingHours']>) => {
    setSettings(prev => ({
      ...prev,
      workingHours: { ...prev.workingHours, ...updates }
    }))
  }

  // Update shoot keywords
  const updateShootKeywords = (keywords: string) => {
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    updateSettings({ shootKeywords: keywordArray })
  }

  // Load calendars on mount
  useEffect(() => {
    if (isConnected) {
      fetchCalendarsAndSettings()
    }
  }, [isConnected])

  // Auto-save settings when they change (with debouncing)
  useEffect(() => {
    // Only proceed if initial load is complete and we have calendars
    if (!initialLoadComplete || !isConnected || calendars.length === 0) {
      return
    }

    // Don't auto-save if no calendars are selected or if currently saving/loading
    if (selectedCalendars.size === 0 || loading || saving) {
      return
    }

    const currentSettingsString = JSON.stringify(settings)
    const currentCalendarsString = JSON.stringify(Array.from(selectedCalendars).sort())
    const lastSaved = lastSavedStateRef.current
    
    // Check if this is the first save or if anything has actually changed
    const isFirstSave = !lastSaved
    const settingsChanged = lastSaved && currentSettingsString !== JSON.stringify(lastSaved.settings)
    const calendarsChanged = lastSaved && currentCalendarsString !== JSON.stringify(lastSaved.selectedCalendars.sort())
    
    if (isFirstSave || settingsChanged || calendarsChanged) {
      console.log('📝 [Auto-save] Changes detected, scheduling save...', { 
        isFirstSave, 
        settingsChanged, 
        calendarsChanged 
      })
      
             const timeoutId = setTimeout(async () => {
        try {
          setSaving(true)
          
          const updatedSettings: CalendarTypes.GoogleCalendarSettings = {
            ...settings,
            selectedCalendars: Array.from(selectedCalendars)
          }

          // Validate settings before saving
          const validationErrors = CalendarTypes.validateGoogleCalendarSettings(updatedSettings)
          if (validationErrors.length > 0) {
            console.warn('Auto-save skipped due to validation errors:', validationErrors)
            return
          }

          const response = await fetch('/api/integrations/google-calendar/calendars', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedSettings)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to save calendar settings')
          }
          
          toast.success('Calendar settings saved successfully')
          
          // Update last saved state reference
          lastSavedStateRef.current = {
            settings: updatedSettings,
            selectedCalendars: Array.from(selectedCalendars)
          }
        } catch (err) {
          console.error('Auto-save error:', err)
          toast.error(err instanceof Error ? err.message : 'Failed to save calendar settings')
        } finally {
          setSaving(false)
        }
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [settings, selectedCalendars, initialLoadComplete]) // Minimal dependencies

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Not Connected</h3>
        <p className="text-sm text-gray-600">
          Connect your Google Calendar first to manage calendar settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">{/* Header removed - handled by Dialog */}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-sm text-gray-600">Loading calendars...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-medium text-red-900">Error</h4>
          </div>
          <p className="text-sm text-red-800 mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={fetchCalendarsAndSettings}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      )}

      {/* Settings content */}
      {!loading && !error && (
        <div className="space-y-6">
          
          {/* Calendar Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Calendar Selection</h4>
              <span className="text-xs text-gray-500">
                ({selectedCalendars.size} of {calendars.length} selected)
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <Checkbox
                    checked={selectedCalendars.has(calendar.id)}
                    onCheckedChange={() => toggleCalendar(calendar.id)}
                    disabled={calendar.id === 'primary'}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {calendar.name}
                      </span>
                      {calendar.primary && (
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-600" />
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            Primary
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {calendar.accessRole}
                      </Badge>
                    </div>
                  </div>

                  {calendar.backgroundColor && (
                    <div
                      className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: calendar.backgroundColor }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sync Time Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Sync Time Range</h4>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">How far ahead to sync events</Label>
              <Select 
                value={settings.syncTimeRange} 
                                 onValueChange={(value) => updateSettings({ syncTimeRange: value as CalendarTypes.GoogleCalendarSettings['syncTimeRange'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5-days">5 Days</SelectItem>
                  <SelectItem value="1-week">1 Week</SelectItem>
                  <SelectItem value="2-weeks">2 Weeks (Recommended)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Longer ranges may slow down sync performance
              </p>
            </div>
          </div>

          <Separator />

          {/* Event Filtering */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Event Filtering</h4>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Event type filter</Label>
                <Select 
                  value={settings.eventTypeFilter} 
                                     onValueChange={(value) => updateSettings({ eventTypeFilter: value as CalendarTypes.GoogleCalendarSettings['eventTypeFilter'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="business-hours-only">Business Hours Only</SelectItem>
                    <SelectItem value="shoots-only">Shoots Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-900">Exclude all-day events</Label>
                  <p className="text-xs text-gray-500">Skip holidays and all-day appointments</p>
                </div>
                <Switch
                  checked={settings.excludeAllDayEvents}
                  onCheckedChange={(checked) => updateSettings({ excludeAllDayEvents: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Shoot Detection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Shoot Detection</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-900">Auto-detect shoot events</Label>
                  <p className="text-xs text-gray-500">Automatically identify shoots based on keywords</p>
                </div>
                <Switch
                  checked={settings.autoTagShootEvents}
                  onCheckedChange={(checked) => updateSettings({ autoTagShootEvents: checked })}
                />
              </div>

              {settings.autoTagShootEvents && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Shoot keywords (comma-separated)</Label>
                  <Input
                    value={settings.shootKeywords.join(', ')}
                    onChange={(e) => updateShootKeywords(e.target.value)}
                    placeholder="shoot, photo, video, content"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Events containing these words will be marked as shoots
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Working Hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Working Hours</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-900">Enable working hours filter</Label>
                  <p className="text-xs text-gray-500">Only show events during business hours</p>
                </div>
                <Switch
                  checked={settings.workingHours.enabled}
                  onCheckedChange={(checked) => updateWorkingHours({ enabled: checked })}
                />
              </div>

              {settings.workingHours.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Start time</Label>
                      <Input
                        type="time"
                        value={settings.workingHours.start}
                        onChange={(e) => updateWorkingHours({ start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">End time</Label>
                      <Input
                        type="time"
                        value={settings.workingHours.end}
                        onChange={(e) => updateWorkingHours({ end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Working days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={day}
                                                         checked={settings.workingHours.days.includes(day as CalendarTypes.GoogleCalendarSettings['workingHours']['days'][number])}
                             onCheckedChange={(checked) => {
                               const newDays = checked 
                                 ? [...settings.workingHours.days, day as CalendarTypes.GoogleCalendarSettings['workingHours']['days'][number]]
                                 : settings.workingHours.days.filter(d => d !== day)
                              updateWorkingHours({ days: newDays })
                            }}
                          />
                          <Label htmlFor={day} className="text-sm capitalize">
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Conflict Detection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Conflict Detection</h4>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Buffer time (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  max="480"
                  value={settings.conflictBuffer}
                  onChange={(e) => updateSettings({ conflictBuffer: parseInt(e.target.value) || 0 })}
                  placeholder="15"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Minimum time between shoots (0-480 minutes)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Conflict notifications</Label>
                <Select 
                  value={settings.conflictNotifications} 
                                     onValueChange={(value) => updateSettings({ conflictNotifications: value as CalendarTypes.GoogleCalendarSettings['conflictNotifications'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="block">Block Scheduling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">i</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Configuration Tips
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Changes take effect immediately after saving</li>
                  <li>• Primary calendar is always included</li>
                  <li>• Shoot detection helps organize your content workflow</li>
                  <li>• Working hours filter reduces calendar clutter</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Auto-save status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-800 text-center">
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2 inline" />
                  Saving changes...
                </>
              ) : (
                'Settings are saved automatically'
              )}
            </div>
          </div>
        </div>
      )}

      {/* No calendars found */}
      {!loading && !error && calendars.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Calendars Found</h3>
          <p className="text-sm text-gray-600 mb-4">
            No accessible calendars were found in your Google account.
          </p>
          <Button variant="outline" onClick={fetchCalendarsAndSettings}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
}