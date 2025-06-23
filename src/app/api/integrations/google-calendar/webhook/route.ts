import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarSync } from '@/lib/services/google-calendar-sync'
import { getWebhookChannelById, deactivateWebhookChannel } from '@/lib/db/calendar'

export async function POST(req: NextRequest) {
  try {
    // Validate webhook headers (following 2025 best practices)
    const channelId = req.headers.get('X-Goog-Channel-ID')
    const channelToken = req.headers.get('X-Goog-Channel-Token')
    const resourceState = req.headers.get('X-Goog-Resource-State')
    const resourceId = req.headers.get('X-Goog-Resource-ID')
    const userAgent = req.headers.get('User-Agent')

    console.log('📨 [Calendar Webhook] Received notification:', {
      channelId,
      resourceState,
      resourceId,
      userAgent
    })

    // Validate User-Agent (security best practice)
    if (!userAgent?.includes('APIs-Google')) {
      console.warn('⚠️ [Calendar Webhook] Invalid User-Agent:', userAgent)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!channelId) {
      console.warn('⚠️ [Calendar Webhook] Missing channel ID')
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
    }

    // Get webhook channel from database to find user
    const webhookChannel = await getWebhookChannelById(channelId)
    if (!webhookChannel || !webhookChannel.active) {
      console.warn('⚠️ [Calendar Webhook] Channel not found or inactive:', channelId)
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Validate channel token if provided (security best practice)
    if (channelToken && webhookChannel.token && channelToken !== webhookChannel.token) {
      console.warn('⚠️ [Calendar Webhook] Invalid channel token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        console.log('🔄 [Calendar Webhook] Sync notification - ignoring')
        break

      case 'exists':
        console.log('🔄 [Calendar Webhook] Calendar changed - triggering sync')
        
        // Trigger incremental sync for the user
        const calendarSync = new GoogleCalendarSync()
        
        // Run sync in background (don't wait for completion)
        calendarSync.syncCalendar(webhookChannel.userEmail, webhookChannel.calendarId)
          .then(result => {
            console.log('✅ [Calendar Webhook] Sync completed:', result)
          })
          .catch(error => {
            console.error('❌ [Calendar Webhook] Sync failed:', error)
          })
        break

      case 'not_exists':
        console.log('🗑️ [Calendar Webhook] Calendar deleted - deactivating channel')
        await deactivateWebhookChannel(channelId)
        break

      default:
        console.log('❓ [Calendar Webhook] Unknown resource state:', resourceState)
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ [Calendar Webhook] Error processing webhook:', error)
    
    // Still return 200 to prevent Google from retrying
    return NextResponse.json({ success: true })
  }
}

// Handle webhook verification (GET request)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const challenge = searchParams.get('hub.challenge')
    const mode = searchParams.get('hub.mode')
    
    console.log('🔍 [Calendar Webhook] Verification request:', { mode, challenge })

    if (mode === 'subscribe' && challenge) {
      // Return the challenge to verify the webhook endpoint
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })

  } catch (error) {
    console.error('❌ [Calendar Webhook] Verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
} 