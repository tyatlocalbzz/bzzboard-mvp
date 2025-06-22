'use client'

import { ReactNode, useState } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

interface ChangePasswordFormProps {
  children: ReactNode
}

export const ChangePasswordForm = ({ children }: ChangePasswordFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    
    try {
      const currentPassword = formData.get('currentPassword') as string
      const newPassword = formData.get('newPassword') as string
      const confirmPassword = formData.get('confirmPassword') as string

      // Client-side validation
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match')
        return
      }

      if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long')
        return
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password')
      }

      // Success
      toast.success('Password changed successfully')
      setIsOpen(false)
      router.refresh()
      
    } catch (error) {
      console.error('Change password error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <>
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          placeholder="Enter current password"
          required
          className="h-12 text-base"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="Enter new password"
          required
          minLength={8}
          className="h-12 text-base"
        />
        <p className="text-xs text-gray-600">
          Password must be at least 8 characters long
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          required
          minLength={8}
          className="h-12 text-base"
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Change Password"
      description="Update your password to keep your account secure"
      icon={Lock}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitText="Change Password"
      loadingText="Changing..."
    />
  )
} 