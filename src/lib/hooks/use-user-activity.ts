import { useCallback } from 'react'
import { useApiData } from './use-api-data'
import type { UserActivity } from '@/lib/db/schema'

// Enhanced activity type with performer information
export interface UserActivityWithPerformer extends UserActivity {
  performerName?: string
  performerEmail?: string
}

export interface UseUserActivityReturn {
  activities: UserActivityWithPerformer[]
  isLoading: boolean
  error: string | null
  loadUserActivities: (userId: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * User activity tracking hook following established patterns
 * Provides activity logs for audit trail and user management
 */
export const useUserActivity = (): UseUserActivityReturn => {
  // Transform function to handle API response
  const transform = useCallback((apiResponse: unknown) => {
    console.log('🔄 [useUserActivity] Transform input:', apiResponse)
    
    // Handle standardized API format: { success: true, data: { activities: [...] } }
    const result = (apiResponse as { data?: { activities?: UserActivityWithPerformer[] } }).data
    const apiActivities = result?.activities || []
    
    console.log('📊 [useUserActivity] API activities received:', {
      count: apiActivities.length,
      activities: apiActivities.map((a: UserActivityWithPerformer) => ({ 
        id: a.id, 
        action: a.action, 
        performerName: a.performerName 
      }))
    })
    
    return apiActivities
  }, [])

  // Error callback for consistent error handling
  const onError = useCallback((error: string) => {
    console.error('❌ [useUserActivity] Error fetching activities:', error)
  }, [])

  // Use standardized API data hook with manual fetching
  const { data: activities, isLoading, error, refresh, updateData } = useApiData<UserActivityWithPerformer[]>({
    endpoint: '/api/admin/users/activity', // Default endpoint, will be overridden
    autoFetch: false, // Don't auto-fetch, we'll trigger manually
    transform,
    onError
  })

  // Load activities for a specific user
  const loadUserActivities = useCallback(async (userId: string) => {
    console.log(`🔍 [useUserActivity] Loading activities for user: ${userId}`)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch activities')
      }
      
      // Apply transform and update data
      const transformedActivities = transform(result)
      updateData(() => transformedActivities)
      
      console.log(`✅ [useUserActivity] Loaded ${transformedActivities.length} activities for user ${userId}`)
    } catch (error) {
      console.error(`❌ [useUserActivity] Error loading activities for user ${userId}:`, error)
      onError(error instanceof Error ? error.message : 'Failed to load activities')
    }
  }, [transform, updateData, onError])

  return {
    activities: activities || [],
    isLoading,
    error,
    loadUserActivities,
    refresh
  }
}

/**
 * Helper function to format activity action for display
 */
export const formatActivityAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'created': 'User Created',
    'updated': 'Profile Updated',
    'role_changed': 'Role Changed',
    'status_changed': 'Status Changed',
    'deleted': 'User Deleted',
    'invited': 'User Invited',
    'resent_invite': 'Invitation Resent'
  }
  
  return actionMap[action] || action
}

/**
 * Helper function to get activity icon
 */
export const getActivityIcon = (action: string): string => {
  const iconMap: Record<string, string> = {
    'created': '👤',
    'updated': '✏️',
    'role_changed': '👑',
    'status_changed': '🔄',
    'deleted': '🗑️',
    'invited': '📧',
    'resent_invite': '📤'
  }
  
  return iconMap[action] || '📝'
}

/**
 * Helper function to format activity details for display
 */
export const formatActivityDetails = (action: string, details: Record<string, unknown>): string => {
  switch (action) {
    case 'role_changed':
      return `Changed from ${details.previousRole} to ${details.newRole}`
    case 'status_changed':
      return `Changed from ${details.previousStatus} to ${details.newStatus}`
    case 'updated':
      const fields = details.updatedFields as string[]
      return `Updated: ${fields?.join(', ') || 'profile'}`
    case 'invited':
      return `Invited as ${details.role}`
    case 'deleted':
      return `Deletion type: ${details.deletionType}`
    default:
      return ''
  }
} 