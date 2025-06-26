'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react'
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
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Not Connected</h3>
        <p className="text-sm text-muted-foreground">
          Connect your Google Calendar to enable automatic scheduling,
          conflict detection, and seamless calendar management.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-sm text-muted-foreground">Loading calendars...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h4 className="text-sm font-medium text-foreground">Calendar Access Error</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            We couldn&apos;t load your calendars. This might be due to insufficient permissions
            or a temporary connection issue.
          </p>
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Select Calendars</h4>
            <span className="text-xs text-muted-foreground">
              Choose which calendars to check for conflicts
            </span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {calendars.map((calendar) => (
              <label
                key={calendar.id}
                className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors cursor-pointer"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.selectedCalendars.includes(calendar.id)}
                    onChange={() => toggleCalendar(calendar.id)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {calendar.name}
                </span>
                {calendar.primary && (
                  <Badge variant="outline" className="text-xs">
                    Primary
                  </Badge>
                )}
              </label>
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
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Calendars Found</h3>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find any calendars in your Google account.
          </p>
        </div>
      )}
    </div>
  )
}