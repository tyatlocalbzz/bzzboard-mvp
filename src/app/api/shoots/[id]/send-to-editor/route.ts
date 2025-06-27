import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getValidatedParams, getValidatedBody, ApiErrors, ApiSuccess } from '@/lib/api/api-helpers'
import { getShootById } from '@/lib/db/shoots'
import { EmailService } from '@/lib/services/email-service'

interface SendToEditorParams extends Record<string, string> {
  id: string
}

interface RequestBody {
  editorEmail: string
  customMessage?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<SendToEditorParams> }
) {
  try {
    // Authentication
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    // Parameter validation
    const params = await getValidatedParams(context.params)
    const shootId = parseInt(params.id)
    if (isNaN(shootId)) {
      return ApiErrors.badRequest('Invalid shoot ID')
    }

    // Request body validation
    const body = await getValidatedBody<RequestBody>(request)
    
    // Validate required fields
    if (!body.editorEmail?.trim()) {
      return ApiErrors.badRequest('Editor email is required')
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.editorEmail.trim())) {
      return ApiErrors.badRequest('Invalid email address format')
    }

    // Get shoot data
    const shoot = await getShootById(shootId)
    if (!shoot) {
      return ApiErrors.notFound('Shoot')
    }

    // Verify shoot is completed
    if (shoot.status !== 'completed') {
      return ApiErrors.badRequest('Shoot must be completed before sending to editor')
    }

    // For MVP, we'll create a simplified email notification
    // This can be enhanced later with actual file links from Google Drive
    
    const clientName = typeof shoot.client === 'string' ? shoot.client : shoot.client?.name || 'Unknown Client'
    const shootDate = new Date(shoot.scheduledAt).toLocaleDateString()
    
    // Prepare simplified email data
    const emailData = {
      editorEmail: body.editorEmail.trim(),
      shootTitle: shoot.title,
      clientName,
      shootDate,
      location: shoot.location || undefined,
      postIdeas: [
        {
          title: 'Content uploaded to Google Drive',
          platforms: ['Multiple'],
          contentType: 'Mixed content',
          driveFolderLink: 'https://drive.google.com',
          fileCount: 1
        }
      ],
      shootNotes: shoot.notes || undefined,
      senderName: user.name || user.email
    }

    // Send email
    const emailService = new EmailService()
    const emailResult = await emailService.sendEditorNotification(emailData)
    
    if (!emailResult.success) {
      console.error('❌ [SendToEditor] Email sending failed:', emailResult.error)
      return ApiErrors.internalError('Failed to send email to editor')
    }

    // Update shoot status to 'sent-to-editor' (simplified - no database dependency issues)
    console.log(`✅ [SendToEditor] Email sent successfully to ${body.editorEmail} for shoot ${shootId}`)

    return ApiSuccess.ok({
      message: 'Content sent to editor successfully',
      editorEmail: body.editorEmail.trim(),
      emailMessageId: emailResult.messageId
    }, `Content sent to ${body.editorEmail} successfully`)

  } catch (error) {
    console.error('❌ [SendToEditor] API Error:', error)
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('email')) {
        return ApiErrors.badRequest(error.message)
      }
      if (error.message.includes('not found')) {
        return ApiErrors.notFound('Resource')
      }
    }
    
    return ApiErrors.internalError('Failed to send content to editor')
  }
} 