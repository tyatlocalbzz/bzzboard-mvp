# Email Setup with Resend

This document explains how to set up email functionality using Resend for the BzzBoard MVP user invitation system.

## 1. Create a Resend Account

1. Go to [resend.com](https://resend.com) and create an account
2. Verify your email address
3. Complete the onboarding process

## 2. Get Your API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name like "BzzBoard Production" or "BzzBoard Development"
4. Copy the API key (starts with `re_`)

## 3. Set Up Your Domain (Production)

For production use, you should set up a custom domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for domain verification

## 4. Environment Variables

### Development Setup (localhost)

For development, add these to your `.env.local` file:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=BzzBoard <onboarding@resend.dev>
RESEND_REPLY_TO_EMAIL=support@yourdomain.com
```

### Production Setup

For production, use your verified domain:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=BzzBoard <noreply@yourdomain.com>
RESEND_REPLY_TO_EMAIL=support@yourdomain.com
```

### Environment Variable Details:

- **RESEND_API_KEY**: Your Resend API key (required)
- **RESEND_FROM_EMAIL**: 
  - Development: Use `onboarding@resend.dev` (no domain verification needed)
  - Production: Use your verified domain (e.g., `noreply@yourdomain.com`)
- **RESEND_REPLY_TO_EMAIL**: Reply-to address for user responses (optional)

### Why Different Domains?

- **Development**: `onboarding@resend.dev` is Resend's default domain that works immediately without verification
- **Production**: Your own domain provides better branding and deliverability, but requires domain verification

## 5. Testing Email Functionality

### Development Testing

For development, you can use Resend's sandbox mode:

1. Use your real API key
2. Emails will be sent to the Resend dashboard instead of actual recipients
3. You can view email content in the Resend dashboard

### Production Testing

1. Make sure your domain is verified
2. Send a test invitation to yourself
3. Check the email delivery in the Resend dashboard

## 6. Email Templates

The system includes two email templates:

### New User Invitation
- **Subject**: "Welcome to BzzBoard - Your Account is Ready!"
- **Content**: Welcome message with login credentials and instructions
- **Call-to-Action**: Login button linking to the signin page

### Resend Invitation
- **Subject**: "BzzBoard - Your Login Credentials (Resent)"
- **Content**: Updated credentials with security reminder
- **Call-to-Action**: Login button with new temporary password

## 7. Email Features

### Security Features
- New temporary password generated for each resend
- Secure random password generation using crypto
- Password must be changed on first login

### Tracking Features
- Email tags for analytics (`user-invitation`, `user-invitation-resend`)
- Invited-by tracking for audit purposes
- Email delivery status tracking

### Content Features
- Professional HTML email design
- Plain text fallback for all emails
- Mobile-responsive email templates
- Clear call-to-action buttons

## 8. Error Handling

The system handles email failures gracefully:

- User accounts are created even if email fails
- Email errors are logged but don't block user creation
- API responses include email status information
- Admins can resend invitations if emails fail

## 9. Monitoring

### Resend Dashboard
- View all sent emails
- Check delivery status
- Monitor bounce rates
- Track email engagement

### Application Logs
- Email sending attempts are logged
- Success/failure status is tracked
- Error messages are captured

## 10. Troubleshooting

### Common Issues

**API Key Not Working**
- Verify the API key is correct
- Check that it's not expired
- Ensure it has the right permissions

**Domain Not Verified**
- Check DNS settings
- Wait for propagation (can take up to 24 hours)
- Verify all required DNS records are added

**Emails Not Sending**
- Check the API key environment variable
- Verify the from email domain is verified
- Check Resend dashboard for error details

**Emails Going to Spam**
- Set up SPF, DKIM, and DMARC records
- Use a verified domain
- Avoid spam trigger words in content

### Debug Mode

To debug email issues:

1. Check the server logs for email service errors
2. Verify environment variables are loaded
3. Test with a simple email first
4. Check the Resend dashboard for delivery status

## 11. Best Practices

### Security
- Keep API keys secure and never commit them to version control
- Use different API keys for development and production
- Regularly rotate API keys
- Monitor email sending for suspicious activity

### Deliverability
- Use a verified domain for production
- Set up proper DNS records (SPF, DKIM, DMARC)
- Monitor bounce rates and reputation
- Use clear, professional email content

### Performance
- Email sending is asynchronous and doesn't block user creation
- Failed emails can be retried through the resend function
- Monitor email queue and delivery times 