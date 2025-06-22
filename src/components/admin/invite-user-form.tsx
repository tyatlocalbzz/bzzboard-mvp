'use client'

import { ReactNode, useState } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

interface InviteUserFormProps {
  children: ReactNode
}

export const InviteUserForm = ({ children }: InviteUserFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    
    try {
      const email = formData.get('email') as string
      const name = formData.get('name') as string

      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite user')
      }

      // Success
      toast.success(`Invitation sent to ${email}`)
      setIsOpen(false)
      router.refresh() // Refresh the page to show the new user
      
    } catch (error) {
      console.error('Invite error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to invite user')
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Enter full name"
          required
          className="h-12 text-base"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter email address"
          required
          className="h-12 text-base"
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
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitText="Send Invitation"
      loadingText="Sending..."
    />
  )
} 