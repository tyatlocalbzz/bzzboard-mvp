import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { upsertIntegration, getIntegration } from '@/lib/db/integrations'
import { GoogleCalendarSettings, DEFAULT_GOOGLE_CALENDAR_SETTINGS, validateGoogleCalendarSettings } from '@/lib/types/calendar'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const calendarSync = new GoogleCalendarSync()
    
    try {
      // Initialize auth for the user
      await calendarSync['initializeAuth'](user.email)
      
      // Get saved calendar settings
      const integration = await getIntegration(user.email, 'google-calendar')
      let settings: GoogleCalendarSettings = { ...DEFAULT_GOOGLE_CALENDAR_SETTINGS }
      
      if (integration?.data) {
        // Handle both old and new data structures
        const integrationData = integration.data as Record<string, unknown>
        
        // Extract clean settings from potentially nested structure
        let cleanData = integrationData
        
        // If there's a nested 'data' property, extract from the deepest level
        while (cleanData.data && typeof cleanData.data === 'object') {
          cleanData = cleanData.data as Record<string, unknown>
        }
        
        // Apply clean settings if they contain calendar settings
        if ('selectedCalendars' in cleanData || 'syncTimeRange' in cleanData) {
          settings = {
            ...settings,
            ...(cleanData as Partial<GoogleCalendarSettings>)
          }
        }
      }
      
      const selectedCalendarIds = new Set(settings.selectedCalendars)
      
      console.log('📖 [Google Calendar] Loading calendar settings for user:', user.email)
      console.log('📖 [Google Calendar] Settings:', settings)
      
      // Get calendar list from Google
      const calendar = calendarSync['calendar']
      const response = await calendar.calendarList.list({
        maxResults: 50,
        showHidden: false
      })

      const calendars = response.data.items?.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: selectedCalendarIds.has(cal.id || ''),
        timeZone: cal.timeZone
      })) || []

      return NextResponse.json({
        success: true,
        calendars,
        settings
      })

    } catch (error) {
      console.error('❌ [Google Calendar] Error fetching calendars:', error)
      
      // Handle specific Google API errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 401) {
          return NextResponse.json(
            { error: 'Calendar access unauthorized - please reconnect' },
            { status: 401 }
          )
        }
        if (error.code === 403) {
          return NextResponse.json(
            { error: 'Insufficient permissions to access calendars' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to fetch calendars' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ [Google Calendar API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Handle both legacy selectedCalendars and new settings format
    let newSettings: Partial<GoogleCalendarSettings>
    
    if (body.selectedCalendars && Array.isArray(body.selectedCalendars)) {
      // Legacy format - just calendar selection
      newSettings = { selectedCalendars: body.selectedCalendars }
    } else {
      // New format - full settings object
      newSettings = body as Partial<GoogleCalendarSettings>
    }

    // Validate settings
    const validationErrors = validateGoogleCalendarSettings(newSettings)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: `Invalid settings: ${validationErrors.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current integration data
    const currentIntegration = await getIntegration(user.email, 'google-calendar')
    
    if (!currentIntegration || !currentIntegration.connected) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      )
    }

    // Extract clean current settings (handle malformed data)
    let currentSettings: GoogleCalendarSettings = { ...DEFAULT_GOOGLE_CALENDAR_SETTINGS }
    
    if (currentIntegration.data) {
      const integrationData = currentIntegration.data as Record<string, unknown>
      
      // Extract clean settings from potentially nested structure
      let cleanData = integrationData
      
      // If there's a nested 'data' property, extract from the deepest level
      while (cleanData.data && typeof cleanData.data === 'object') {
        cleanData = cleanData.data as Record<string, unknown>
      }
      
      // Apply clean settings if they contain calendar settings
      if ('selectedCalendars' in cleanData || 'syncTimeRange' in cleanData) {
        currentSettings = {
          ...currentSettings,
          ...(cleanData as Partial<GoogleCalendarSettings>)
        }
      }
    }
    
    // Create clean updated settings (no nested data objects)
    const updatedSettings: GoogleCalendarSettings = {
      ...currentSettings,
      ...newSettings
    }

    // Remove any nested 'data' properties to prevent infinite nesting
    const cleanSettings = { ...updatedSettings }
    if ('data' in cleanSettings) {
      delete (cleanSettings as Record<string, unknown>).data
    }

    console.log('💾 [Google Calendar] Saving calendar settings for user:', user.email)
    console.log('💾 [Google Calendar] Clean settings:', cleanSettings)
    
    await upsertIntegration(user.email, 'google-calendar', {
      connected: currentIntegration.connected,
      email: currentIntegration.email,
      accessToken: currentIntegration.accessToken,
      refreshToken: currentIntegration.refreshToken,
      lastSync: currentIntegration.lastSync,
      ...cleanSettings // Spread settings as top-level properties so they get stored in metadata
    })

    console.log('✅ [Google Calendar] Calendar settings saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Calendar settings saved successfully',
      settings: cleanSettings
    })

  } catch (error) {
    console.error('❌ [Google Calendar API] Error saving calendar selection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 