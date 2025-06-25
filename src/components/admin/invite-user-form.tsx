'use client'

import { ReactNode, useState } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuthMutations } from '@/lib/hooks/use-auth-mutations'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { clientValidation } from '@/lib/validation/client-validation'
import { UserPlus, Mail, User } from 'lucide-react'

interface InviteUserFormProps {
  children: ReactNode
}

export const InviteUserForm = ({ children }: InviteUserFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { inviteUser } = useAuthMutations()

  // Field validation hooks
  const nameField = useFieldValidation({
    fieldName: 'name',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const emailField = useFieldValidation({
    fieldName: 'email',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

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

    await inviteUser.mutate({
      email: emailField.value,
      name: nameField.value
    })
    
    setIsOpen(false)
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
          placeholder="Enter full name"
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
          placeholder="Enter email address"
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
      title="Invite New User"
      description="Send an invitation to a new team member to join Buzzboard"
      icon={UserPlus}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={inviteUser.isLoading}
      submitText="Send Invitation"
      loadingText="Sending..."
    />
  )
} 