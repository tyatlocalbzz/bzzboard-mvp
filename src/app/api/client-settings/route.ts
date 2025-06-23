import { NextResponse } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getAllClientSettings, toClientStorageSettings } from '@/lib/db/client-settings'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📖 [ClientSettings] Loading all client settings for user:', user.email)

    // Get all client settings for the user
    const dbSettings = await getAllClientSettings(user.email)
    
    // Convert to ClientStorageSettings format
    const clientSettings = dbSettings.map(toClientStorageSettings)

    console.log('📖 [ClientSettings] Loaded settings for', clientSettings.length, 'clients')

    return NextResponse.json({ 
      success: true,
      clientSettings 
    })
    
  } catch (error) {
    console.error('❌ [ClientSettings] Error loading client settings:', error)
    return NextResponse.json(
      { error: 'Failed to load client settings' },
      { status: 500 }
    )
  }
} 