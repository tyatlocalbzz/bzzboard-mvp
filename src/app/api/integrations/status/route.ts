import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getUserIntegrations } from '@/lib/db/integrations'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user integrations from database
    const integrations = await getUserIntegrations(user.email!)

    return NextResponse.json({ 
      success: true,
      integrations: {
        googleDrive: {
          connected: integrations.googleDrive?.connected || false,
          email: integrations.googleDrive?.email,
          lastSync: integrations.googleDrive?.lastSync,
          error: integrations.googleDrive?.error
        },
        googleCalendar: {
          connected: integrations.googleCalendar?.connected || false,
          email: integrations.googleCalendar?.email,
          lastSync: integrations.googleCalendar?.lastSync,
          error: integrations.googleCalendar?.error
        }
      }
    })
    
  } catch (error) {
    console.error('Integration status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration status' },
      { status: 500 }
    )
  }
} 