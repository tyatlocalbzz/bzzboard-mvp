import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailConfig {
  from: string
  replyTo?: string
  baseUrl: string
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
  private config: EmailConfig

  constructor(config?: Partial<EmailConfig>) {
    // Use Resend's default domain for development, custom domain for production
    const defaultFrom = process.env.NODE_ENV === 'production' 
      ? 'BzzBoard <noreply@buzzboard.com>'
      : 'BzzBoard <onboarding@resend.dev>'
    
    this.config = {
      from: config?.from || process.env.RESEND_FROM_EMAIL || defaultFrom,
      replyTo: config?.replyTo || process.env.RESEND_REPLY_TO_EMAIL,
      baseUrl: config?.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000'
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