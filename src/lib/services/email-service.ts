import { Resend } from 'resend'
import type { EditorNotificationData } from '@/lib/types/shoots'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailConfig {
  from?: string
  replyTo?: string
  baseUrl?: string
}

export interface InvitationEmailData {
  email: string
  name: string
  tempPassword: string
  invitedBy: string
}

/**
 * Email service using Resend
 * Handles all email sending functionality for the BzzBoard MVP
 */
export class EmailService {
  private config: Required<Pick<EmailConfig, 'from' | 'baseUrl'>> & Pick<EmailConfig, 'replyTo'>

  constructor(config?: Partial<EmailConfig>) {
    // Use Resend's default domain for development, custom domain for production
    const defaultFrom = process.env.NODE_ENV === 'production' 
      ? 'BzzBoard <noreply@buzzboard.com>'
      : 'BzzBoard <onboarding@resend.dev>'
    
    const baseUrl = config?.baseUrl || process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined)
    
    // Ensure baseUrl is set for production
    if (!baseUrl) {
      console.error('❌ [EmailService] baseUrl is required for email generation')
      throw new Error('EmailService configuration error: baseUrl is required')
    }

    this.config = {
      from: config?.from || process.env.RESEND_FROM_EMAIL || defaultFrom,
      replyTo: config?.replyTo || process.env.RESEND_REPLY_TO_EMAIL,
      baseUrl
    }
  }

  /**
   * Validate Resend configuration
   */
  private validateConfig(): void {
    console.log('🔧 [EmailService] Validating configuration...')
    
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ [EmailService] RESEND_API_KEY environment variable is missing')
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    
    console.log('✅ [EmailService] Configuration validation passed:', {
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      apiKeyLength: process.env.RESEND_API_KEY?.length,
      from: this.config.from,
      replyTo: this.config.replyTo,
      baseUrl: this.config.baseUrl
    })
  }

  /**
   * Sanitize tag values to only contain ASCII letters, numbers, underscores, or dashes
   * Resend requires tags to match this pattern for validation
   */
  private sanitizeTagValue(value: string): string {
    // Replace @ with 'at', dots with dashes, and remove other invalid characters
    return value
      .replace(/@/g, 'at')
      .replace(/\./g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
  }

  /**
   * Send invitation email to new user
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🚀 [EmailService] Starting invitation email send process...')
      
      this.validateConfig()

      console.log('📧 [EmailService] Preparing invitation email:', {
        to: data.email,
        name: data.name,
        invitedBy: data.invitedBy,
        tempPasswordLength: data.tempPassword?.length
      })

      const emailPayload = {
        from: this.config.from,
        to: data.email,
        replyTo: this.config.replyTo,
        subject: 'Welcome to BzzBoard - Your Account is Ready!',
        html: this.generateInvitationEmailHTML(data),
        text: this.generateInvitationEmailText(data),
        tags: [
          { name: 'type', value: 'user-invitation' },
          { name: 'invited-by', value: this.sanitizeTagValue(data.invitedBy) }
        ]
      }

      console.log('📤 [EmailService] Sending email via Resend API:', {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        tagsCount: emailPayload.tags.length,
        htmlLength: emailPayload.html.length,
        textLength: emailPayload.text.length
      })

      const result = await resend.emails.send(emailPayload)

      console.log('📥 [EmailService] Resend API response:', {
        success: !result.error,
        error: result.error,
        data: result.data
      })

      if (result.error) {
        console.error('❌ [EmailService] Resend API returned error:', {
          error: result.error,
          message: result.error.message,
          name: result.error.name
        })
        return { success: false, error: result.error.message }
      }

      console.log('✅ [EmailService] Invitation email sent successfully:', {
        messageId: result.data?.id,
        to: data.email,
        from: this.config.from
      })

      return { success: true, messageId: result.data?.id }

    } catch (error) {
      console.error('❌ [EmailService] Exception caught while sending invitation email:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          email: data.email,
          name: data.name
        }
      })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Resend invitation email (generates new temporary password)
   */
  async resendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🔄 [EmailService] Starting resend invitation email process...')
      
      this.validateConfig()

      console.log('📧 [EmailService] Preparing resend invitation email:', {
        to: data.email,
        name: data.name,
        invitedBy: data.invitedBy,
        tempPasswordLength: data.tempPassword?.length
      })

      const emailPayload = {
        from: this.config.from,
        to: data.email,
        replyTo: this.config.replyTo,
        subject: 'BzzBoard - Your Login Credentials (Resent)',
        html: this.generateResendInvitationEmailHTML(data),
        text: this.generateResendInvitationEmailText(data),
        tags: [
          { name: 'type', value: 'user-invitation-resend' },
          { name: 'invited-by', value: this.sanitizeTagValue(data.invitedBy) }
        ]
      }

      console.log('📤 [EmailService] Sending resend email via Resend API:', {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        tagsCount: emailPayload.tags.length,
        htmlLength: emailPayload.html.length,
        textLength: emailPayload.text.length
      })

      const result = await resend.emails.send(emailPayload)

      console.log('📥 [EmailService] Resend API response for resend:', {
        success: !result.error,
        error: result.error,
        data: result.data
      })

      if (result.error) {
        console.error('❌ [EmailService] Resend API returned error for resend:', {
          error: result.error,
          message: result.error.message,
          name: result.error.name
        })
        return { success: false, error: result.error.message }
      }

      console.log('✅ [EmailService] Invitation email resent successfully:', {
        messageId: result.data?.id,
        to: data.email,
        from: this.config.from
      })

      return { success: true, messageId: result.data?.id }

    } catch (error) {
      console.error('❌ [EmailService] Exception caught while resending invitation email:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          email: data.email,
          name: data.name
        }
      })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generate HTML content for invitation email
   */
  private generateInvitationEmailHTML(data: InvitationEmailData): string {
    const loginUrl = `${this.config.baseUrl}/auth/signin`
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to BzzBoard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #3B82F6; margin-bottom: 10px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
            .credentials { background: #fff; border: 1px solid #d1d5db; border-radius: 6px; padding: 16px; font-family: monospace; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BzzBoard</div>
              <h1>Welcome to the team, ${data.name}!</h1>
            </div>
            
            <p>You've been invited to join BzzBoard by <strong>${data.invitedBy}</strong>. We're excited to have you on board!</p>
            
            <div class="card">
              <h3>Your Login Credentials</h3>
              <div class="credentials">
                <strong>Email:</strong> ${data.email}<br>
                <strong>Temporary Password:</strong> ${data.tempPassword}
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> Please log in and change your password immediately for security.
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In to BzzBoard</a>
            </div>
            
            <h3>What's Next?</h3>
            <ol>
              <li>Click the login button above</li>
              <li>Use your email and temporary password to sign in</li>
              <li>You'll be prompted to create a new password</li>
              <li>Start exploring BzzBoard's content creation tools!</li>
            </ol>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to your team.</p>
            
            <div class="footer">
              <p>This invitation was sent by ${data.invitedBy}<br>
              If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate plain text content for invitation email
   */
  private generateInvitationEmailText(data: InvitationEmailData): string {
    const loginUrl = `${this.config.baseUrl}/auth/signin`
    
    return `
Welcome to BzzBoard, ${data.name}!

You've been invited to join BzzBoard by ${data.invitedBy}. We're excited to have you on board!

YOUR LOGIN CREDENTIALS:
Email: ${data.email}
Temporary Password: ${data.tempPassword}

⚠️ IMPORTANT: Please log in and change your password immediately for security.

LOG IN NOW: ${loginUrl}

WHAT'S NEXT:
1. Click the login link above
2. Use your email and temporary password to sign in
3. You'll be prompted to create a new password
4. Start exploring BzzBoard's content creation tools!

If you have any questions or need help getting started, don't hesitate to reach out to your team.

---
This invitation was sent by ${data.invitedBy}
If you didn't expect this invitation, you can safely ignore this email.
    `.trim()
  }

  /**
   * Generate HTML content for resend invitation email
   */
  private generateResendInvitationEmailHTML(data: InvitationEmailData): string {
    const loginUrl = `${this.config.baseUrl}/auth/signin`
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BzzBoard Login Credentials</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #3B82F6; margin-bottom: 10px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
            .credentials { background: #fff; border: 1px solid #d1d5db; border-radius: 6px; padding: 16px; font-family: monospace; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BzzBoard</div>
              <h1>Your Login Credentials</h1>
            </div>
            
            <p>Hi ${data.name},</p>
            <p>Here are your updated login credentials for BzzBoard, as requested by <strong>${data.invitedBy}</strong>:</p>
            
            <div class="card">
              <h3>Login Information</h3>
              <div class="credentials">
                <strong>Email:</strong> ${data.email}<br>
                <strong>Temporary Password:</strong> ${data.tempPassword}
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Note:</strong> Please log in and change your password as soon as possible.
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In to BzzBoard</a>
            </div>
            
            <p>If you have any questions or need assistance, please reach out to your team.</p>
            
            <div class="footer">
              <p>This email was sent by ${data.invitedBy}<br>
              If you didn't request this, please contact your administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate plain text content for resend invitation email
   */
  private generateResendInvitationEmailText(data: InvitationEmailData): string {
    const loginUrl = `${this.config.baseUrl}/auth/signin`
    
    return `
BzzBoard - Your Login Credentials

Hi ${data.name},

Here are your updated login credentials for BzzBoard, as requested by ${data.invitedBy}:

LOGIN INFORMATION:
Email: ${data.email}
Temporary Password: ${data.tempPassword}

⚠️ SECURITY NOTE: Please log in and change your password as soon as possible.

LOG IN NOW: ${loginUrl}

If you have any questions or need assistance, please reach out to your team.

---
This email was sent by ${data.invitedBy}
If you didn't request this, please contact your administrator.
    `.trim()
  }

  /**
   * Send editor notification email with content links and details
   */
  async sendEditorNotification(data: EditorNotificationData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🚀 [EmailService] Starting editor notification email send process...')
      
      this.validateConfig()

      console.log('📧 [EmailService] Preparing editor notification email:', {
        to: data.editorEmail,
        shootTitle: data.shootTitle,
        clientName: data.clientName,
        postIdeasCount: data.postIdeas.length,
        senderName: data.senderName
      })

      const emailPayload = {
        from: this.config.from,
        to: data.editorEmail,
        replyTo: this.config.replyTo,
        subject: `Content Ready for Editing - ${data.shootTitle}`,
        html: this.generateEditorNotificationHTML(data),
        text: this.generateEditorNotificationText(data),
        tags: [
          { name: 'type', value: 'editor-notification' },
          { name: 'client', value: this.sanitizeTagValue(data.clientName) },
          { name: 'sender', value: this.sanitizeTagValue(data.senderName) }
        ]
      }

      console.log('📤 [EmailService] Sending editor notification via Resend API:', {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        tagsCount: emailPayload.tags.length,
        htmlLength: emailPayload.html.length,
        textLength: emailPayload.text.length
      })

      const result = await resend.emails.send(emailPayload)

      console.log('📥 [EmailService] Resend API response:', {
        success: !result.error,
        error: result.error,
        data: result.data
      })

      if (result.error) {
        console.error('❌ [EmailService] Resend API returned error:', {
          error: result.error,
          message: result.error.message,
          name: result.error.name
        })
        return { success: false, error: result.error.message }
      }

      console.log('✅ [EmailService] Editor notification sent successfully:', {
        messageId: result.data?.id,
        to: data.editorEmail,
        from: this.config.from
      })

      return { success: true, messageId: result.data?.id }

    } catch (error) {
      console.error('❌ [EmailService] Exception caught while sending editor notification:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          editorEmail: data.editorEmail,
          shootTitle: data.shootTitle,
          clientName: data.clientName
        }
      })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generate professional HTML email template for editor notifications
   */
  private generateEditorNotificationHTML(data: EditorNotificationData): string {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Ready for Editing - ${data.shootTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .shoot-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .shoot-details h2 { margin: 0 0 15px 0; color: #495057; font-size: 18px; }
    .detail-item { margin: 8px 0; }
    .detail-label { font-weight: 600; color: #495057; }
    .post-idea { border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .post-idea h3 { margin: 0 0 10px 0; color: #343a40; font-size: 16px; }
    .post-meta { margin: 5px 0; font-size: 14px; color: #6c757d; }
    .drive-button { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; font-weight: 500; }
    .drive-button:hover { background: #3367d6; }
    .misc-section { background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; }
    .platforms { background: #e7f3ff; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Content Ready for Editing</h1>
      <p>New content delivery from BzzBoard</p>
    </div>
    
    <div class="content">
      <div class="shoot-details">
        <h2>Shoot Details</h2>
        <div class="detail-item"><span class="detail-label">Client:</span> ${data.clientName}</div>
        <div class="detail-item"><span class="detail-label">Shoot:</span> ${data.shootTitle}</div>
        <div class="detail-item"><span class="detail-label">Date:</span> ${formatDate(data.shootDate)}</div>
        ${data.location ? `<div class="detail-item"><span class="detail-label">Location:</span> ${data.location}</div>` : ''}
        ${data.shootNotes ? `<div class="detail-item"><span class="detail-label">Notes:</span> ${data.shootNotes}</div>` : ''}
      </div>

      <h2>📱 Post Ideas & Content</h2>
      <p>All content has been organized by post idea and uploaded to Google Drive. Click the buttons below to access each folder.</p>

      ${data.postIdeas.map(idea => `
        <div class="post-idea">
          <h3>${idea.title}</h3>
          <div class="post-meta">
            <strong>Platforms:</strong> 
            ${idea.platforms.map(platform => `<span class="platforms">${platform}</span>`).join(' ')}
          </div>
          <div class="post-meta"><strong>Content Type:</strong> ${idea.contentType}</div>
          ${idea.caption ? `<div class="post-meta"><strong>Caption:</strong> "${idea.caption}"</div>` : ''}
          ${idea.notes ? `<div class="post-meta"><strong>Notes:</strong> ${idea.notes}</div>` : ''}
          <div class="post-meta"><strong>Files:</strong> ${idea.fileCount} uploaded</div>
          
          <a href="${idea.driveFolderLink}" class="drive-button" target="_blank">
            📁 Open Drive Folder
          </a>
        </div>
      `).join('')}

      ${data.miscFilesFolderLink && data.miscFilesCount ? `
        <div class="misc-section">
          <h3>📎 Additional Files</h3>
          <p>${data.miscFilesCount} miscellaneous files that don't belong to specific post ideas</p>
          <a href="${data.miscFilesFolderLink}" class="drive-button" target="_blank">
            📁 Open Misc Files Folder
          </a>
        </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <p><strong>Ready for your creative magic! ✨</strong></p>
        <p>All content is organized and ready for editing. Please let me know if you need any clarification on the post ideas or have questions about the content.</p>
        <p>Best regards,<br><strong>${data.senderName}</strong></p>
      </div>
    </div>

    <div class="footer">
      <p>This email was sent via BzzBoard Content Management System</p>
      <p>Need help? Contact support or reply to this email</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text version of editor notification email
   */
  private generateEditorNotificationText(data: EditorNotificationData): string {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return `
CONTENT READY FOR EDITING

Shoot Details:
- Client: ${data.clientName}
- Shoot: ${data.shootTitle}
- Date: ${formatDate(data.shootDate)}
${data.location ? `- Location: ${data.location}` : ''}
${data.shootNotes ? `- Notes: ${data.shootNotes}` : ''}

POST IDEAS & CONTENT:

${data.postIdeas.map(idea => `
${idea.title}
- Platforms: ${idea.platforms.join(', ')}
- Content Type: ${idea.contentType}
${idea.caption ? `- Caption: "${idea.caption}"` : ''}
${idea.notes ? `- Notes: ${idea.notes}` : ''}
- Files: ${idea.fileCount} uploaded
- Drive Folder: ${idea.driveFolderLink}
`).join('\n')}

${data.miscFilesFolderLink && data.miscFilesCount ? `
ADDITIONAL FILES:
${data.miscFilesCount} miscellaneous files
Drive Folder: ${data.miscFilesFolderLink}
` : ''}

All content is organized and ready for editing. Please let me know if you need any clarification on the post ideas or have questions about the content.

Best regards,
${data.senderName}

---
This email was sent via BzzBoard Content Management System
    `.trim()
  }
}

// Export a default instance
export const emailService = new EmailService()

// Export helper function for sending invitation emails
export const sendInvitationEmail = async (data: InvitationEmailData) => {
  console.log('📧 [EmailService Export] sendInvitationEmail called with:', {
    email: data.email,
    name: data.name,
    invitedBy: data.invitedBy
  })
  const result = await emailService.sendInvitationEmail(data)
  console.log('📧 [EmailService Export] sendInvitationEmail result:', result)
  return result
}

// Export helper function for resending invitation emails
export const resendInvitationEmail = async (data: InvitationEmailData) => {
  console.log('🔄 [EmailService Export] resendInvitationEmail called with:', {
    email: data.email,
    name: data.name,
    invitedBy: data.invitedBy
  })
  const result = await emailService.resendInvitationEmail(data)
  console.log('🔄 [EmailService Export] resendInvitationEmail result:', result)
  return result
} 