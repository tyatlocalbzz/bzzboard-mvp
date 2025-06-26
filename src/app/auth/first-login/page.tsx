import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Your Password</h1>
          <p className="mt-2 text-muted-foreground">
            Complete your account setup by creating a secure password
          </p>
        </div>

        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Security Requirements</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include at least one number</li>
                <li>• Include at least one special character</li>
              </ul>
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
          <p className="text-xs text-muted-foreground">
            Your password will be encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  )
} 