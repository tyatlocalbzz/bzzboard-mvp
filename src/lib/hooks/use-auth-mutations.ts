import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useApiMutation } from './use-api-data'

interface UpdateProfileData {
  name: string
  email: string
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

interface SetFirstPasswordData {
  newPassword: string
}

interface InviteUserData {
  name: string
  email: string
}

interface UseAuthMutationsReturn {
  updateProfile: {
    mutate: (data: UpdateProfileData) => Promise<void>
    isLoading: boolean
    error: string | null
  }
  changePassword: {
    mutate: (data: ChangePasswordData) => Promise<void>
    isLoading: boolean
    error: string | null
  }
  setFirstPassword: {
    mutate: (data: SetFirstPasswordData) => Promise<void>
    isLoading: boolean
    error: string | null
  }
  inviteUser: {
    mutate: (data: InviteUserData) => Promise<void>
    isLoading: boolean
    error: string | null
  }
}

/**
 * Reusable hook for authentication-related mutations
 * Eliminates duplicate API calls in EditProfileForm, ChangePasswordForm, and InviteUserForm
 * Provides consistent error handling and success feedback
 */
export const useAuthMutations = (): UseAuthMutationsReturn => {
  const router = useRouter()

  // Update profile mutation
  const updateProfileMutation = useApiMutation<{ success: boolean }, UpdateProfileData>('/api/auth/update-profile', 'POST')

  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    try {
      await updateProfileMutation.mutate(data)
      toast.success('Profile updated successfully')
      router.refresh()
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Update profile error:', error)
    }
  }, [updateProfileMutation, router])

  // Change password mutation
  const changePasswordMutation = useApiMutation<{ success: boolean }, ChangePasswordData>('/api/auth/change-password', 'POST')

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      await changePasswordMutation.mutate(data)
      toast.success('Password changed successfully')
      router.refresh()
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Change password error:', error)
    }
  }, [changePasswordMutation, router])

  // Set first password mutation (for first-time users)
  const setFirstPasswordMutation = useApiMutation<{ success: boolean }, SetFirstPasswordData>('/api/auth/set-first-password', 'POST')

  const setFirstPassword = useCallback(async (data: SetFirstPasswordData) => {
    try {
      await setFirstPasswordMutation.mutate(data)
      toast.success('Password set successfully')
      router.refresh()
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Set first password error:', error)
    }
  }, [setFirstPasswordMutation, router])

  // Invite user mutation
  const inviteUserMutation = useApiMutation<{ success: boolean }, InviteUserData>('/api/users/invite', 'POST')

  const inviteUser = useCallback(async (data: InviteUserData) => {
    try {
      await inviteUserMutation.mutate(data)
      toast.success(`Invitation sent to ${data.email}`)
      router.refresh()
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Invite user error:', error)
    }
  }, [inviteUserMutation, router])

  return {
    updateProfile: {
      mutate: updateProfile,
      isLoading: updateProfileMutation.isLoading,
      error: updateProfileMutation.error
    },
    changePassword: {
      mutate: changePassword,
      isLoading: changePasswordMutation.isLoading,
      error: changePasswordMutation.error
    },
    setFirstPassword: {
      mutate: setFirstPassword,
      isLoading: setFirstPasswordMutation.isLoading,
      error: setFirstPasswordMutation.error
    },
    inviteUser: {
      mutate: inviteUser,
      isLoading: inviteUserMutation.isLoading,
      error: inviteUserMutation.error
    }
  }
} 