# 🔐 Authentication & Authorization Guide

## Overview

BuzzBoard implements a comprehensive authentication system using Next.js 14 App Router with NextAuth.js v5, following industry best practices for security and user experience.

## 🏗️ Architecture

### Core Components

1. **Middleware-based Route Protection** (`src/middleware.ts`)
   - Protects all routes by default
   - Handles redirects for unauthenticated users
   - Adds security headers
   - Manages public/protected route logic

2. **AuthGuard Component** (`src/components/auth/auth-guard.tsx`)
   - Client-side authentication state management
   - Handles loading states and redirects
   - First-login flow integration
   - Customizable fallback components

3. **API Authentication Helpers** (`src/lib/api/api-helpers.ts`)
   - Standardized authentication wrappers
   - Rate limiting and security logging
   - Consistent error responses
   - Admin-only route protection

4. **Session Management** (`src/lib/auth/session.ts`)
   - Server-side session validation
   - Database user integration
   - Secure session handling

## 🚀 Features

### ✅ Implemented Features

- **Route Protection**: All routes protected by default
- **Redirect Handling**: Automatic redirects with callback URLs
- **First-Login Flow**: Mandatory password change for invited users
- **Role-Based Access**: Admin and user role separation
- **Rate Limiting**: API endpoint protection
- **Security Headers**: Comprehensive security headers
- **Session Validation**: Server and client-side validation
- **Loading States**: Smooth UX during auth checks
- **Error Handling**: Consistent error responses

### 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Security**: JWT with secure configuration
- **CSRF Protection**: Built-in NextAuth protection
- **Rate Limiting**: Per-user API rate limiting
- **Security Headers**: XSS, clickjacking, content-type protection
- **Input Validation**: Comprehensive request validation
- **Audit Logging**: Security event logging

## 📋 Usage Examples

### 1. Protecting a Page Component

```tsx
import { withAuth } from '@/components/auth/auth-guard'

const MyProtectedPage = () => {
  return <div>Protected content</div>
}

// Automatically protected
export default withAuth(MyProtectedPage)

// Or with custom options
export default withAuth(MyProtectedPage, {
  fallback: <CustomLoadingComponent />,
  requireAuth: true
})
```

### 2. Protecting API Routes

```tsx
// Basic authentication
import { withAuth, ApiSuccess } from '@/lib/api/api-helpers'

export const GET = withAuth(async (req, user) => {
  // User is guaranteed to be authenticated
  return ApiSuccess.ok({ message: `Hello ${user.email}` })
})

// Admin-only route
import { withAdminAuth } from '@/lib/api/api-helpers'

export const DELETE = withAdminAuth(async (req, user) => {
  // User is guaranteed to be admin
  return ApiSuccess.ok({ message: 'Admin action completed' })
})

// Enhanced security with rate limiting
import { withSecureAuth } from '@/lib/api/api-helpers'

export const POST = withSecureAuth(async (req, user) => {
  // Rate limited and logged
  return ApiSuccess.ok({ data: 'Secure action' })
}, {
  rateLimit: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  logAccess: true
})
```

### 3. Client-Side Authentication Checks

```tsx
'use client'
import { useSession } from 'next-auth/react'

export const MyComponent = () => {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>Loading...</div>
  if (status === 'unauthenticated') return <div>Please sign in</div>

  return <div>Welcome, {session?.user?.name}!</div>
}
```

## 🔧 Configuration

### Environment Variables

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=your-database-url

# Optional: CORS Configuration
ALLOWED_ORIGIN=http://localhost:3000
```

### Route Configuration

**Public Routes** (no authentication required):
- `/auth/signin`
- `/auth/signup` (future)
- `/api/auth/*` (NextAuth endpoints)

**Protected Auth Routes** (require authentication):
- `/auth/first-login`

**Protected Routes** (all others):
- `/` (dashboard)
- `/posts`
- `/shoots`
- `/settings`
- etc.

## 🛡️ Security Best Practices

### 1. Password Security
- Minimum 8 characters
- bcrypt hashing with 12 salt rounds
- Temporary passwords for invitations
- Mandatory password change on first login

### 2. Session Security
- JWT with secure configuration
- Automatic session refresh
- Secure cookie settings
- Session timeout handling

### 3. API Security
- All API routes require authentication by default
- Rate limiting per user
- Comprehensive input validation
- Consistent error responses (no information leakage)

### 4. Frontend Security
- Client-side authentication guards
- Automatic redirects for unauthenticated users
- Protected route handling
- Loading states to prevent flashing

## 🔍 Monitoring & Logging

### Authentication Events Logged:
- User login attempts
- Password changes
- Admin actions
- Rate limit violations
- Authentication errors
- API access (when enabled)

### Log Format:
```
🔐 [API Access] POST /api/posts - User: user@example.com
🚨 [API Rate Limit] User user@example.com exceeded rate limit
❌ [API Auth] Authentication error: Invalid session
```

## 🚨 Troubleshooting

### Common Issues:

1. **Infinite Redirect Loops**
   - Check middleware route configuration
   - Verify public routes are properly excluded
   - Ensure session is properly configured

2. **API Routes Returning HTML Instead of JSON**
   - Middleware should exclude API routes from redirects
   - Use `getCurrentUserForAPI()` in API routes
   - Return proper JSON error responses

3. **First-Login Flow Not Working**
   - Check `isFirstLogin` flag in database
   - Verify API endpoints are accessible
   - Check FirstLoginGuard implementation

4. **Rate Limiting Issues**
   - Adjust rate limits in production
   - Consider using Redis for distributed rate limiting
   - Monitor rate limit logs

## 🔄 Migration from Previous System

If upgrading from a previous authentication system:

1. **Replace FirstLoginGuard with AuthGuard**:
   ```tsx
   // Old
   import { FirstLoginGuard } from '@/components/auth/first-login-guard'
   
   // New
   import { AuthGuard } from '@/components/auth/auth-guard'
   ```

2. **Update API route protection**:
   ```tsx
   // Old
   const user = await getCurrentUserForAPI()
   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   
   // New
   export const GET = withAuth(async (req, user) => {
     // User is guaranteed to be authenticated
   })
   ```

3. **Enhance middleware configuration**:
   - Add security headers
   - Improve route matching
   - Add better error handling

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## 🎯 Future Enhancements

- [ ] OAuth providers (Google, GitHub)
- [ ] Two-factor authentication
- [ ] Redis-based rate limiting
- [ ] Advanced session management
- [ ] Audit trail dashboard
- [ ] Automated security scanning 