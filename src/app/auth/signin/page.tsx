import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

const handleSignIn = async (formData: FormData) => {
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
      redirect('/auth/signin?error=CredentialsSignin')
    }

    // Success - redirect to callback URL or dashboard
    // The redirect() call will throw NEXT_REDIRECT which is expected behavior
    redirect(callbackUrl)
    
  } catch (error) {
    // Only log actual errors, not NEXT_REDIRECT
    if (error instanceof Error && !error.message.includes('NEXT_REDIRECT')) {
      console.error('Sign in error:', error)
      redirect('/auth/signin?error=CredentialsSignin')
    }
    // Re-throw NEXT_REDIRECT errors to let Next.js handle them
    throw error
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
          <CardTitle className="text-2xl font-bold">Buzzboard</CardTitle>
          <CardDescription>
            Sign in to your content production workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSignIn} className="space-y-4">
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
                defaultValue=""
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
              />
            </div>
            
            {params.error && (
              <div className="text-sm text-red-600 text-center p-3 bg-red-50 rounded-lg">
                Invalid email or password. Please try again.
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base"
            >
              Sign In
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Use: ty@localbzz.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 