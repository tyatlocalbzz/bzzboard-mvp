import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import { getIntegration } from '@/lib/db/integrations'

// Base error class for calendar operations
export class CalendarError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'CalendarError'
  }
}

// Common types used across calendar services
export interface CalendarEventAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
}

export interface CalendarEventBase {
  id?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: CalendarEventAttendee[]
  isRecurring?: boolean
}

export interface CalendarAuthTokens {
  accessToken: string
  refreshToken?: string
  expiryDate?: number
}

// Base calendar service class with common functionality
export class GoogleCalendarBase {
  protected calendar: calendar_v3.Calendar
  protected oauth2Client: InstanceType<typeof google.auth.OAuth2>

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/integrations/google-calendar/callback`
    )

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  /**
   * Initialize authentication for a user
   * DRY: Centralized auth setup used by all calendar operations
   */
  protected async initializeAuth(userEmail: string): Promise<void> {
    try {
      const integration = await getIntegration(userEmail, 'google-calendar')
      
      if (!integration?.connected || !integration.accessToken) {
        throw new CalendarError(
          'Google Calendar not connected for this user',
          'NOT_CONNECTED',
          401
        )
      }

      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.expiryDate ? new Date(integration.expiryDate).getTime() : undefined
      })

      // Check if token needs refresh
      if (this.isTokenExpired(integration)) {
        console.log('🔄 [Calendar] Token expired, refreshing for:', userEmail)
        await this.refreshAccessToken(userEmail)
      }
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error
      }
      throw new CalendarError(
        'Failed to initialize calendar authentication',
        'AUTH_INIT_FAILED',
        500,
        error
      )
    }
  }

  /**
   * Check if token is expired or will expire soon
   * DRY: Centralized token expiry check
   */
  private isTokenExpired(integration: { expiryDate?: string | null }): boolean {
    if (!integration.expiryDate) return false
    
    const expiryTime = new Date(integration.expiryDate).getTime()
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
    
    return expiryTime <= (now + bufferTime)
  }

  /**
   * Refresh access token when expired
   * DRY: Centralized token refresh logic
   */
  protected async refreshAccessToken(userEmail: string): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      // Update stored tokens
      const { upsertIntegration } = await import('@/lib/db/integrations')
      await upsertIntegration(userEmail, 'google-calendar', {
        accessToken: credentials.access_token || '',
        refreshToken: credentials.refresh_token || undefined,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : undefined,
        lastSync: new Date().toISOString()
      })

      console.log('✅ [Calendar] Access token refreshed for:', userEmail)
    } catch (error) {
      throw new CalendarError(
        'Failed to refresh access token',
        'TOKEN_REFRESH_FAILED',
        401,
        error
      )
    }
  }

  /**
   * Handle common API errors with proper error mapping
   * DRY: Centralized error handling for all calendar operations
   */
  protected handleCalendarError(error: unknown, operation: string): never {
    console.error(`❌ [Calendar] ${operation} error:`, error)

    // Cast error to handle Google API error properties
    const apiError = error as { code?: number; message?: string }

    // Handle specific Google API errors
    if (apiError.code === 401) {
      throw new CalendarError(
        'Calendar access unauthorized - please reconnect',
        'UNAUTHORIZED',
        401,
        error
      )
    }

    if (apiError.code === 403) {
      throw new CalendarError(
        'Calendar access forbidden - insufficient permissions',
        'FORBIDDEN',
        403,
        error
      )
    }

    if (apiError.code === 404) {
      throw new CalendarError(
        'Calendar or event not found',
        'NOT_FOUND',
        404,
        error
      )
    }

    if (apiError.code === 409) {
      throw new CalendarError(
        'Calendar conflict detected',
        'CONFLICT',
        409,
        error
      )
    }

    if (apiError.code === 410) {
      throw new CalendarError(
        'Sync token expired - full resync required',
        'SYNC_TOKEN_EXPIRED',
        410,
        error
      )
    }

    if (apiError.code === 429) {
      throw new CalendarError(
        'Calendar API rate limit exceeded',
        'RATE_LIMITED',
        429,
        error
      )
    }

    // Generic error
    throw new CalendarError(
      `Calendar ${operation} failed: ${apiError.message || 'Unknown error'}`,
      'CALENDAR_ERROR',
      500,
      error
    )
  }

  /**
   * Retry logic with exponential backoff
   * DRY: Centralized retry mechanism for API calls
   * Following Google Calendar API best practices for rate limiting
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5, // Increased for rate limit scenarios
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: unknown) {
        lastError = error
        const apiError = error as { code?: number; message?: string }

        // Don't retry on permanent errors
        if (apiError.code === 401 || apiError.code === 404 || apiError.code === 400) {
          throw error
        }

        // Handle rate limiting (403 and 429) - these should be retried
        const isRateLimit = (apiError.code === 403 && apiError.message?.includes('Rate Limit')) ||
                           (apiError.code === 403 && apiError.message?.includes('rateLimitExceeded')) ||
                           (apiError.code === 403 && apiError.message?.includes('userRateLimitExceeded')) ||
                           apiError.code === 429

        // Don't retry 403 errors that aren't rate limits (permissions, etc.)
        if (apiError.code === 403 && !isRateLimit) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break
        }

        // Calculate delay with exponential backoff + jitter (Google best practice)
        const exponentialDelay = baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
        const totalDelay = Math.min(exponentialDelay + jitter, 60000) // Cap at 1 minute
        
        console.log(`⏳ [Calendar] Rate limited, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, totalDelay))
      }
    }

    throw lastError
  }

  /**
   * Validate environment configuration
   * DRY: Centralized config validation
   */
  protected validateConfig(): void {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new CalendarError(
        'Google Calendar API not configured - missing client credentials',
        'CONFIG_MISSING',
        500
      )
    }
  }

  /**
   * Convert Google Calendar event to our internal format
   * DRY: Centralized event format conversion
   */
  protected convertGoogleEvent(googleEvent: calendar_v3.Schema$Event): CalendarEventBase {
    return {
      id: googleEvent.id || undefined,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || undefined,
      startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date || ''),
      endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date || ''),
      location: googleEvent.location || undefined,
      attendees: googleEvent.attendees?.map((attendee) => ({
        email: attendee.email || '',
        displayName: attendee.displayName || undefined,
        responseStatus: attendee.responseStatus as CalendarEventAttendee['responseStatus']
      })) || [],
      isRecurring: !!googleEvent.recurringEventId
    }
  }

  /**
   * Convert our internal event format to Google Calendar format
   * DRY: Centralized event format conversion
   */
  protected convertToGoogleEvent(event: CalendarEventBase): calendar_v3.Schema$Event {
    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.displayName,
      })),
    }
  }
} 