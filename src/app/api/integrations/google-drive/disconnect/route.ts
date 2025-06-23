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
    await removeIntegration(user.email, 'google-drive')

    return NextResponse.json({ 
      success: true,
      message: 'Google Drive disconnected successfully'
    })
    
  } catch (error) {
    console.error('Google Drive disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google Drive' },
      { status: 500 }
    )
  }
} 