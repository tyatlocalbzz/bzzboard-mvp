'use client'

import { ReactNode, useState } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { clientValidation } from '@/lib/validation/client-validation'
import { Lock } from 'lucide-react'

interface ChangePasswordFormProps {
  children: ReactNode
}

export const ChangePasswordForm = ({ children }: ChangePasswordFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Field validation hooks
  const currentPasswordField = useFieldValidation({
    fieldName: 'currentPassword',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const newPasswordField = useFieldValidation({
    fieldName: 'newPassword',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  // Custom validation for confirm password that depends on new password
  const confirmPasswordField = useFieldValidation({
    fieldName: 'password', // Use generic password validation initially
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  // Override confirm password validation to check against new password
  const getConfirmPasswordValidation = () => {
    if (!confirmPasswordField.touched && !isOpen) {
      return { valid: true, state: 'idle' as const, error: undefined }
    }

    const validation = clientValidation.confirmPassword(
      newPasswordField.value,
      confirmPasswordField.value
    )

    return {
      valid: validation.valid,
      state: validation.valid ? 'valid' as const : 'invalid' as const,
      error: validation.error
    }
  }

  const validateForm = (): string | null => {
    const validation = clientValidation.passwordChange({
      currentPassword: currentPasswordField.value,
      newPassword: newPasswordField.value,
      confirmPassword: confirmPasswordField.value
    })
    
    if (!validation.valid) {
      // Return the first error found
      return Object.values(validation.errors)[0] as string
    }
    
    return null
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      // Validate all fields
      const currentPasswordValidation = currentPasswordField.validate()
      const newPasswordValidation = newPasswordField.validate()
      const confirmPasswordValidation = getConfirmPasswordValidation()
      
      if (!currentPasswordValidation.valid || !newPasswordValidation.valid || !confirmPasswordValidation.valid) {
        toast.error('Please fix the validation errors before submitting')
        return
      }

      const validationError = validateForm()
      if (validationError) {
        toast.error(validationError)
        return
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currentPassword: currentPasswordField.value, 
          newPassword: newPasswordField.value 
        }),
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset fields when closing
      currentPasswordField.reset()
      newPasswordField.reset()
      confirmPasswordField.reset()
    }
  }

  const confirmPasswordValidation = getConfirmPasswordValidation()

  const formContent = (
    <>
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-sm font-medium">
          Current Password *
        </Label>
        <MobileInput
          id="currentPassword"
          name="currentPassword"
          type="password"
          value={currentPasswordField.value}
          onChange={currentPasswordField.handleChange}
          onBlur={currentPasswordField.handleBlur}
          placeholder="Enter current password"
          error={currentPasswordField.validationResult.error}
          validationState={currentPasswordField.validationResult.state}
          autoComplete="current-password"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-sm font-medium">
          New Password *
        </Label>
        <MobileInput
          id="newPassword"
          name="newPassword"
          type="password"
          value={newPasswordField.value}
          onChange={newPasswordField.handleChange}
          onBlur={newPasswordField.handleBlur}
          placeholder="Enter new password"
          error={newPasswordField.validationResult.error}
          validationState={newPasswordField.validationResult.state}
          autoComplete="new-password"
          minLength={8}
          required
          helperText="Password must be at least 8 characters long"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm New Password *
        </Label>
        <MobileInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPasswordField.value}
          onChange={confirmPasswordField.handleChange}
          onBlur={confirmPasswordField.handleBlur}
          placeholder="Confirm new password"
          error={confirmPasswordValidation.error}
          validationState={confirmPasswordValidation.state}
          autoComplete="new-password"
          minLength={8}
          required
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
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitText="Change Password"
      loadingText="Changing..."
    />
  )
} 