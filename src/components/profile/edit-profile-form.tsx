'use client'

import { ReactNode, useState } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { Edit } from 'lucide-react'

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

  const handleSubmit = async (formData: FormData) => {
    const name = formData.get('name') as string
    const email = formData.get('email') as string

    const result = await execute({ name, email })
    
    if (result) {
      toast.success('Profile updated successfully')
      setIsOpen(false)
      router.refresh()
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
          placeholder="Enter your full name"
          required
          defaultValue={user.name}
          className="h-12 text-base tap-target"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          required
          defaultValue={user.email}
          className="h-12 text-base tap-target"
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
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Save Changes"
      loadingText="Saving..."
      height="70vh"
      maxHeight="500px"
    />
  )
} 