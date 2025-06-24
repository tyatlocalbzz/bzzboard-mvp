'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Calendar, RefreshCw, AlertCircle, Crown } from 'lucide-react'
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
  const [settings, setSettings] = useState<CalendarTypes.GoogleCalendarSettings>(CalendarTypes.DEFAULT_GOOGLE_CALENDAR_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadCalendarsAndSettings()
    }
  }, [isConnected])

  const loadCalendarsAndSettings = async () => {
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
        if (data.settings) {
          setSettings(data.settings)
        }
      } else {
        throw new Error('Failed to load calendar list')
      }
    } catch (err) {
      console.error('Error loading calendars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendars')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (updatedSettings: CalendarTypes.GoogleCalendarSettings) => {
    try {
      setSaving(true)
      
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
      
      toast.success('Calendar settings saved')
    } catch (err) {
      console.error('Save error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = async (updates: Partial<CalendarTypes.GoogleCalendarSettings>) => {
    const previousSettings = settings
    const newSettings = { ...settings, ...updates }
    
    setSettings(newSettings)
    
    try {
      await saveSettings(newSettings)
    } catch {
      setSettings(previousSettings)
    }
  }

  const toggleCalendar = (calendarId: string) => {
    if (calendarId === 'primary') return
    
    const currentSelected = new Set(settings.selectedCalendars)
    if (currentSelected.has(calendarId)) {
      currentSelected.delete(calendarId)
    } else {
      currentSelected.add(calendarId)
    }
    
    updateSettings({ selectedCalendars: Array.from(currentSelected) })
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Not Connected</h3>
        <p className="text-sm text-gray-600">
          Connect your Google Calendar first.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-sm text-gray-600">Loading calendars...</span>
        </div>
      )}

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
            onClick={loadCalendarsAndSettings}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-900">Select Calendars</h4>
            <span className="text-xs text-gray-500">
              ({settings.selectedCalendars.length} of {calendars.length} selected)
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
            {calendars.map((calendar) => (
              <div
                key={calendar.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Checkbox
                  checked={settings.selectedCalendars.includes(calendar.id)}
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
                    className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                )}
              </div>
            ))}
          </div>

          {saving && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-center text-sm text-blue-800">
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && calendars.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Calendars Found</h3>
          <Button variant="outline" onClick={loadCalendarsAndSettings}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
}