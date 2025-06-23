import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { removeIntegration } from '@/lib/db/integrations'

export async function POST() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove integration from database
    await removeIntegration(user.email, 'google-calendar')

    return NextResponse.json({ 
      success: true,
      message: 'Google Calendar disconnected successfully'
    })
    
  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    )
  }
} 