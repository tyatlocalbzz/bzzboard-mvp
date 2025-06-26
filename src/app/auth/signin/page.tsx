import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { redirect } from 'next/navigation'

const handleCredentialsSignIn = async (formData: FormData) => {
  'use server'
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const callbackUrl = formData.get('callbackUrl') as string || '/'

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false, // Handle redirect manually
    })

    if (result?.error) {
      redirect('/auth/signin?error=CredentialsSignin&callbackUrl=' + encodeURIComponent(callbackUrl))
    }

    // Success - redirect to callback URL or dashboard
    redirect(callbackUrl)
    
  } catch (error) {
    // Only log actual errors, not NEXT_REDIRECT
    if (error instanceof Error && !error.message.includes('NEXT_REDIRECT')) {
      console.error('Sign in error:', error)
      redirect('/auth/signin?error=CredentialsSignin&callbackUrl=' + encodeURIComponent(callbackUrl))
    }
    // Re-throw NEXT_REDIRECT errors to let Next.js handle them
    throw error
  }
}

const handleGoogleSignIn = async (formData: FormData) => {
  'use server'
  
  const callbackUrl = formData.get('callbackUrl') as string || '/'
  
  try {
    await signIn('google', {
      callbackUrl,
      redirect: true, // Let NextAuth handle the redirect for OAuth
    })
  } catch (error) {
    // IMPORTANT: NEXT_REDIRECT is not an error - it's Next.js's redirect mechanism
    // We should only handle actual errors, not redirects
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      // This is the normal OAuth redirect flow - let it proceed
      throw error
    }
    
    // Only handle actual authentication errors
    console.error('Google sign in error:', error)
    redirect('/auth/signin?error=OAuthSignin&callbackUrl=' + encodeURIComponent(callbackUrl))
  }
}

const getErrorMessage = (error: string) => {
  switch (error) {
    case 'CredentialsSignin':
      return 'Invalid email or password. Please try again.'
    case 'OAuthSignin':
    case 'OAuthCallback':
      return 'There was an error signing in with Google. Please try again.'
    case 'OAuthCreateAccount':
      return 'Could not create your account. Please try again or contact support.'
    case 'EmailCreateAccount':
      return 'Could not create your account. Please try again.'
    case 'Callback':
      return 'There was an error during authentication. Please try again.'
    case 'OAuthAccountNotLinked':
      return 'This email is already associated with another account. Please sign in with your original method.'
    case 'EmailSignin':
      return 'The email could not be sent. Please try again.'
    case 'CredentialsSignup':
      return 'There was an error creating your account. Please try again.'
    case 'SessionRequired':
      return 'Please sign in to access this page.'
    default:
      return 'An error occurred during authentication. Please try again.'
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const params = await searchParams
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Buzzboard</CardTitle>
          <CardDescription>
            Sign in to your content production workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <form action={handleGoogleSignIn}>
            <input 
              type="hidden" 
              name="callbackUrl" 
              value={params.callbackUrl || '/'} 
            />
            <Button 
              type="submit" 
              variant="outline"
              className="w-full h-12 text-base flex items-center justify-center gap-3"
            >
              <svg 
                className="w-5 h-5" 
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                  fill="#4285F4"
                />
                <path 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                  fill="#34A853"
                />
                <path 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
                  fill="#FBBC05"
                />
                <path 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Sign In */}
          <form action={handleCredentialsSignIn} className="space-y-4">
            <input 
              type="hidden" 
              name="callbackUrl" 
              value={params.callbackUrl || '/'} 
            />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className="h-12"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                className="h-12"
                autoComplete="current-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base"
            >
              Sign In with Email
            </Button>
          </form>

          {/* Error Message */}
          {params.error && (
            <div className="text-sm text-red-600 text-center p-3 bg-red-50 rounded-lg border border-red-200">
              {getErrorMessage(params.error)}
            </div>
          )}

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              First time user? Ask your admin to send you an invitation.
            </p>
            <p className="text-xs">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 