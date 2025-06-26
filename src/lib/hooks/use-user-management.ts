import { useCallback } from 'react'
import { useApiData, useApiMutation } from './use-api-data'
import { toast } from 'sonner'
import { calculateUserStats, type UserStats } from '@/lib/utils/user-utils'
import type { User } from '@/lib/db/schema'

// Types for user operations
export interface InviteUserData {
  name: string
  email: string
}

export interface UpdateUserData {
  name?: string
  email?: string
}

export interface UseUserManagementReturn {
  // Data
  users: User[]
  stats: UserStats
  isLoading: boolean
  error: string | null
  
  // Individual Operations
  inviteUser: (data: InviteUserData) => Promise<User>
  updateUser: (id: string, data: UpdateUserData) => Promise<User>
  changeUserStatus: (id: string, status: 'active' | 'inactive') => Promise<User>
  changeUserRole: (id: string, role: 'admin' | 'user') => Promise<User>
  resendInvite: (id: string) => Promise<void>
  deleteUser: (id: string, type?: 'deactivate' | 'hard') => Promise<void>
  
  // Utilities
  refresh: () => Promise<void>
  getUser: (id: string) => User | null
}

/**
 * Enhanced user management hook following established patterns
 * Provides complete CRUD operations for user management with activity logging
 * Uses standardized API patterns and optimistic updates
 */
export const useUserManagement = (): UseUserManagementReturn => {
  // Transform function to handle API response and calculate stats
  const transform = useCallback((apiResponse: unknown) => {
    console.log('🔄 [useUserManagement] Transform input:', apiResponse)
    
    // Handle standardized API format: { success: true, data: { users: [...] } }
    const result = (apiResponse as { data?: { users?: User[] } }).data
    const apiUsers = result?.users || []
    
    console.log('📊 [useUserManagement] API users received:', {
      count: apiUsers.length,
      users: apiUsers.map((u: User) => ({ id: u.id, name: u.name, role: u.role, status: u.status }))
    })
    
    return apiUsers
  }, [])

  // Error callback for consistent error handling
  const onError = useCallback((error: string) => {
    console.error('❌ [useUserManagement] Error fetching users:', error)
  }, [])

  // Use standardized API data hook
  const { data: users, isLoading, error, refresh, updateData } = useApiData<User[]>({
    endpoint: '/api/admin/users',
    transform,
    onError
  })

  // Calculate stats from users data using centralized utility
  const stats: UserStats = calculateUserStats(users || [])

  // Mutation hooks for different operations
  const inviteMutation = useApiMutation<User, InviteUserData>('/api/admin/users/invite', 'POST')
  const updateMutation = useApiMutation<User, UpdateUserData & { id: string }>(
    (variables) => `/api/admin/users/${variables.id}`, 
    'PUT'
  )
  const statusMutation = useApiMutation<User, { id: string; status: 'active' | 'inactive' }>(
    (variables) => `/api/admin/users/${variables.id}/status`, 
    'PATCH'
  )
  const roleMutation = useApiMutation<User, { id: string; role: 'admin' | 'user' }>(
    (variables) => `/api/admin/users/${variables.id}/role`, 
    'PATCH'
  )
  const resendMutation = useApiMutation<void, { id: string }>(
    (variables) => `/api/admin/users/${variables.id}/resend-invite`, 
    'POST'
  )
  const deleteMutation = useApiMutation<void, { id: string; type?: string }>(
    (variables) => `/api/admin/users/${variables.id}${variables.type ? `?type=${variables.type}` : ''}`, 
    'DELETE'
  )

  // Invite user with optimistic updates
  const inviteUser = useCallback(async (data: InviteUserData): Promise<User> => {
    try {
      const result = await inviteMutation.mutate(data)
      
      // Add to local state optimistically
      updateData(prev => prev ? [result, ...prev] : [result])
      
      toast.success(`Invitation sent to ${data.email}`)
      return result
    } catch (error) {
      // Error handling is already done in useApiMutation
      console.error('Invite user error:', error)
      throw error
    }
  }, [inviteMutation, updateData])

  // Update user with optimistic updates
  const updateUser = useCallback(async (id: string, data: UpdateUserData): Promise<User> => {
    try {
      const result = await updateMutation.mutate({ ...data, id })
      
      // Update local state optimistically
      updateData(prev => prev?.map(u => u.id.toString() === id ? result : u) || null)
      
      toast.success('User updated successfully')
      return result
    } catch (error) {
      console.error('Update user error:', error)
      throw error
    }
  }, [updateMutation, updateData])

  // Change user status with optimistic updates
  const changeUserStatus = useCallback(async (id: string, status: 'active' | 'inactive'): Promise<User> => {
    try {
      const result = await statusMutation.mutate({ id, status })
      
      // Update local state optimistically
      updateData(prev => prev?.map(u => u.id.toString() === id ? result : u) || null)
      
      const action = status === 'active' ? 'activated' : 'deactivated'
      toast.success(`User ${action} successfully`)
      return result
    } catch (error) {
      console.error('Change user status error:', error)
      throw error
    }
  }, [statusMutation, updateData])

  // Change user role with optimistic updates
  const changeUserRole = useCallback(async (id: string, role: 'admin' | 'user'): Promise<User> => {
    try {
      const result = await roleMutation.mutate({ id, role })
      
      // Update local state optimistically
      updateData(prev => prev?.map(u => u.id.toString() === id ? result : u) || null)
      
      const action = role === 'admin' ? 'promoted to admin' : 'demoted to user'
      toast.success(`User ${action} successfully`)
      return result
    } catch (error) {
      console.error('Change user role error:', error)
      throw error
    }
  }, [roleMutation, updateData])

  // Resend invitation
  const resendInvite = useCallback(async (id: string): Promise<void> => {
    try {
      await resendMutation.mutate({ id })
      toast.success('Invitation resent successfully')
    } catch (error) {
      console.error('Resend invite error:', error)
      throw error
    }
  }, [resendMutation])

  // Delete user with optimistic updates
  const deleteUser = useCallback(async (id: string, type: 'deactivate' | 'hard' = 'deactivate'): Promise<void> => {
    try {
      await deleteMutation.mutate({ id, type })
      
      if (type === 'hard') {
        // Remove from local state for hard delete
        updateData(prev => prev?.filter(u => u.id.toString() !== id) || null)
        toast.success('User permanently deleted')
      } else {
        // Update status to inactive for deactivate
        updateData(prev => prev?.map(u => u.id.toString() === id ? { ...u, status: 'inactive' as const } : u) || null)
        toast.success('User deactivated successfully')
      }
    } catch (error) {
      console.error('Delete user error:', error)
      throw error
    }
  }, [deleteMutation, updateData])

  // Get user by ID
  const getUser = useCallback((id: string): User | null => {
    return users?.find(u => u.id.toString() === id) || null
  }, [users])

  return {
    users: users || [],
    stats,
    isLoading,
    error,
    inviteUser,
    updateUser,
    changeUserStatus,
    changeUserRole,
    resendInvite,
    deleteUser,
    refresh,
    getUser
  }
} 