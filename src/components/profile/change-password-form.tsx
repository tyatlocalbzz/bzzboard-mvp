'use client'

import { ReactNode, useState, useEffect } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuthMutations } from '@/lib/hooks/use-auth-mutations'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { clientValidation } from '@/lib/validation/client-validation'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChangePasswordFormProps {
  children: ReactNode
  isFirstLogin?: boolean // Add prop to indicate if this is first login
}

export const ChangePasswordForm = ({ children, isFirstLogin = false }: ChangePasswordFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [userIsFirstLogin, setUserIsFirstLogin] = useState(isFirstLogin)
  const { changePassword, setFirstPassword } = useAuthMutations()
  const router = useRouter()

  // Check first login status when component mounts
  useEffect(() => {
    const checkFirstLogin = async () => {
      if (!isFirstLogin) {
        try {
          const response = await fetch('/api/auth/check-first-login')
          if (response.ok) {
            const data = await response.json()
            setUserIsFirstLogin(data.isFirstLogin)
          }
        } catch (error) {
          console.error('Error checking first login status:', error)
        }
      }
    }

    checkFirstLogin()
  }, [isFirstLogin])

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
    if (userIsFirstLogin) {
      // For first login, only validate new password and confirmation
      const newPasswordValidation = clientValidation.password(newPasswordField.value)
      if (!newPasswordValidation.valid) return newPasswordValidation.error!

      const confirmPasswordValidation = clientValidation.confirmPassword(
        newPasswordField.value,
        confirmPasswordField.value
      )
      if (!confirmPasswordValidation.valid) return confirmPasswordValidation.error!

      return null
    } else {
      // For regular password change, validate all fields
    const validation = clientValidation.passwordChange({
      currentPassword: currentPasswordField.value,
      newPassword: newPasswordField.value,
      confirmPassword: confirmPasswordField.value
    })
    
    if (!validation.valid) {
      return Object.values(validation.errors)[0] as string
    }
    
    return null
    }
  }

  const handleSubmit = async () => {
    if (userIsFirstLogin) {
      // For first login, only validate new password fields
      const newPasswordValidation = newPasswordField.validate()
      const confirmPasswordValidation = getConfirmPasswordValidation()
      
      if (!newPasswordValidation.valid || !confirmPasswordValidation.valid) {
        toast.error('Please fix the validation errors before submitting')
        return
      }
    } else {
      // For regular password change, validate all fields
      const currentPasswordValidation = currentPasswordField.validate()
      const newPasswordValidation = newPasswordField.validate()
      const confirmPasswordValidation = getConfirmPasswordValidation()
      
      if (!currentPasswordValidation.valid || !newPasswordValidation.valid || !confirmPasswordValidation.valid) {
        toast.error('Please fix the validation errors before submitting')
        return
      }
      }

      const validationError = validateForm()
      if (validationError) {
        toast.error(validationError)
        return
      }

    try {
      if (userIsFirstLogin) {
        await setFirstPassword.mutate({
          newPassword: newPasswordField.value
        })
        // After successful first password set, redirect to dashboard
        toast.success('Password set successfully! Welcome to BzzBoard!')
        router.push('/')
      } else {
        await changePassword.mutate({
          currentPassword: currentPasswordField.value, 
          newPassword: newPasswordField.value 
      })
      }

      setIsOpen(false)
    } catch (error) {
      console.error('Password change error:', error)
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
      {!userIsFirstLogin && (
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
      )}
      
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-sm font-medium">
          {userIsFirstLogin ? 'New Password *' : 'New Password *'}
        </Label>
        <MobileInput
          id="newPassword"
          name="newPassword"
          type="password"
          value={newPasswordField.value}
          onChange={newPasswordField.handleChange}
          onBlur={newPasswordField.handleBlur}
          placeholder={userIsFirstLogin ? "Create your password" : "Enter new password"}
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
          {userIsFirstLogin ? 'Confirm Password *' : 'Confirm New Password *'}
        </Label>
        <MobileInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPasswordField.value}
          onChange={confirmPasswordField.handleChange}
          onBlur={confirmPasswordField.handleBlur}
          placeholder={userIsFirstLogin ? "Confirm your password" : "Confirm new password"}
          error={confirmPasswordValidation.error}
          validationState={confirmPasswordValidation.state}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
    </>
  )

  const isLoading = userIsFirstLogin ? setFirstPassword.isLoading : changePassword.isLoading
  const submitText = userIsFirstLogin ? "Set Password" : "Change Password"
  const loadingText = userIsFirstLogin ? "Setting..." : "Changing..."
  const title = userIsFirstLogin ? "Set Your Password" : "Change Password"
  const description = userIsFirstLogin 
    ? "Create a secure password for your BzzBoard account"
    : "Update your password to keep your account secure"

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title={title}
      description={description}
      icon={Lock}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitText={submitText}
      loadingText={loadingText}
    />
  )
} 