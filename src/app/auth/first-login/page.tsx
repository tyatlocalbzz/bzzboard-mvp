import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { Button } from '@/components/ui/button'
import { Key, Shield } from 'lucide-react'

export default async function FirstLoginPage() {
  const user = await getCurrentAuthUser()
  
  // If user has already completed first login, redirect to dashboard
  if (!user.isFirstLogin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to BzzBoard!</CardTitle>
          <CardDescription>
            For security, please set your password to complete account setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Set Your Password</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You were invited to join BzzBoard. Please create a secure password to access your account.
                </p>
              </div>
            </div>
          </div>

          <ChangePasswordForm isFirstLogin={true}>
            <Button className="w-full h-12 text-base">
              <Key className="h-4 w-4 mr-2" />
              Set My Password
            </Button>
          </ChangePasswordForm>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              After setting your password, you&apos;ll have full access to BzzBoard
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 