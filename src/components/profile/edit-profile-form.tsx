'use client'

import { ReactNode, useState, useEffect } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { clientValidation } from '@/lib/validation/client-validation'
import { Edit, Mail, User } from 'lucide-react'

interface EditProfileFormProps {
  children: ReactNode
  user: {
    name: string
    email: string
  }
}

interface UpdateProfileData {
  name: string
  email: string
}

const updateProfile = async (data: UpdateProfileData) => {
  const response = await fetch('/api/auth/update-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update profile')
  }

  return result
}

export const EditProfileForm = ({ children, user }: EditProfileFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { loading, execute } = useAsync(updateProfile)

  // Field validation hooks
  const nameField = useFieldValidation({
    fieldName: 'name',
    initialValue: user.name,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const emailField = useFieldValidation({
    fieldName: 'email',
    initialValue: user.email,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  // Reset fields when user data changes
  useEffect(() => {
    if (isOpen) {
      nameField.setValue(user.name)
      emailField.setValue(user.email)
    }
  }, [user.name, user.email, isOpen, nameField, emailField])

  const validateForm = (): string | null => {
    const validation = clientValidation.userProfile({
      name: nameField.value,
      email: emailField.value
    })
    
    if (!validation.valid) {
      // Return the first error found
      return Object.values(validation.errors)[0] as string
    }
    
    return null
  }

  const handleSubmit = async () => {
    // Validate all fields
    const nameValidation = nameField.validate()
    const emailValidation = emailField.validate()
    
    if (!nameValidation.valid || !emailValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const result = await execute({
      name: nameField.value,
      email: emailField.value
    })
    
    if (result) {
      toast.success('Profile updated successfully')
      setIsOpen(false)
      router.refresh()
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset fields when closing
      nameField.reset()
      emailField.reset()
    }
  }

  const formContent = (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1" htmlFor="name">
          <User className="h-3 w-3" />
          Full Name *
        </Label>
        <MobileInput
          id="name"
          name="name"
          type="text"
          value={nameField.value}
          onChange={nameField.handleChange}
          onBlur={nameField.handleBlur}
          placeholder="Enter your full name"
          error={nameField.validationResult.error}
          validationState={nameField.validationResult.state}
          autoComplete="name"
          autoCapitalize="words"
          spellCheck="false"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1" htmlFor="email">
          <Mail className="h-3 w-3" />
          Email Address *
        </Label>
        <MobileInput
          id="email"
          name="email"
          type="email"
          value={emailField.value}
          onChange={emailField.handleChange}
          onBlur={emailField.handleBlur}
          placeholder="Enter your email"
          error={emailField.validationResult.error}
          validationState={emailField.validationResult.state}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          inputMode="email"
          required
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Edit Profile"
      description="Update your profile information"
      icon={Edit}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Save Changes"
      loadingText="Saving..."
    />
  )
} 