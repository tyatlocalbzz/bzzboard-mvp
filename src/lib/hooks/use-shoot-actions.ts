import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { ShootsApi } from '@/lib/api/shoots-unified'
import { ShootStatus } from '@/lib/utils/status'
import type { Shoot } from '@/lib/types/shoots'

interface UseShootActionsOptions {
  shoot: Shoot | null
  onSuccess?: () => void
  onOptimisticDelete?: () => void
}

interface UseShootActionsReturn {
  startShoot: () => Promise<void>
  completeShoot: () => Promise<void>
  deleteShoot: () => Promise<void>
  changeStatus: (status: ShootStatus, action?: string) => Promise<void>
  navigateToActive: () => void
  navigateToUpload: () => void
  isLoading: boolean
  canPerformActions: boolean
}

/**
 * Enhanced shoot actions hook using unified API
 * Provides resilient state management with graceful null handling
 * Follows modern React patterns for loading states and error boundaries
 */
export const useShootActions = ({ 
  shoot, 
  onSuccess, 
  onOptimisticDelete 
}: UseShootActionsOptions): UseShootActionsReturn => {
  const router = useRouter()
  const { startShoot: startActiveShoot } = useActiveShoot()
  
  // Use unified API methods
  const { loading: statusLoading, execute: executeStatusChange } = useAsync(ShootsApi.changeStatus)
  const { loading: deleteLoading, execute: executeDelete } = useAsync(ShootsApi.deleteShoot)

  // Helper function to ensure shoot is available before performing actions
  const withShootGuard = useCallback(<T extends unknown[]>(
    action: (shoot: Shoot, ...args: T) => Promise<void>,
    errorMessage: string
  ) => {
    return async (...args: T): Promise<void> => {
      if (!shoot) {
        console.warn('⚠️ [useShootActions] Action attempted before shoot data loaded')
        toast.error('Please wait for shoot data to load')
        return
      }
      
      try {
        await action(shoot, ...args)
      } catch (error) {
        console.error(`❌ [useShootActions] ${errorMessage}:`, error)
        toast.error(`${errorMessage}. Please try again.`)
      }
    }
  }, [shoot])

  const startShoot = useCallback(
    withShootGuard(async (shoot: Shoot) => {
      // First change the shoot status to 'active'
      const statusResult = await executeStatusChange(shoot.id.toString(), 'active', 'start')
      if (!statusResult) return
      
      // Then start the active shoot context
      const clientName = typeof shoot.client === 'string' ? shoot.client : shoot.client?.name || 'Unknown Client'
      startActiveShoot({
        id: shoot.id,
        title: shoot.title,
        client: clientName,
        startedAt: new Date().toISOString()
      })
      
      toast.success('Shoot started successfully!')
      onSuccess?.()
      
      // Navigate to active shoot page
      router.push(`/shoots/${shoot.id}/active`)
    }, 'Failed to start shoot'),
    [withShootGuard, executeStatusChange, startActiveShoot, onSuccess, router]
  )

  const completeShoot = useCallback(
    withShootGuard(async (shoot: Shoot) => {
      const statusResult = await executeStatusChange(shoot.id.toString(), 'completed', 'complete')
      if (!statusResult) return
      
      toast.success('Shoot completed successfully!')
      onSuccess?.()
    }, 'Failed to complete shoot'),
    [withShootGuard, executeStatusChange, onSuccess]
  )

  const deleteShoot = useCallback(
    withShootGuard(async (shoot: Shoot) => {
      toast.loading('Deleting shoot...', { id: 'delete-shoot' })
      
      // Trigger optimistic delete for immediate UI feedback
      onOptimisticDelete?.()
      
      const result = await executeDelete(shoot.id.toString())
      
      if (result) {
        toast.success('Shoot deleted successfully!', { id: 'delete-shoot' })
        
        // Show additional context if calendar event was removed
        if (shoot.googleCalendarEventId) {
          toast.info('Calendar event removed from Google Calendar')
        }
        
        if (result.recoveryNote) {
          toast.info(result.recoveryNote, { duration: 5000 })
        }
        
        router.push('/shoots?refresh=true')
      }
    }, 'Failed to delete shoot'),
    [withShootGuard, executeDelete, onOptimisticDelete, router]
  )

  const changeStatus = useCallback(
    withShootGuard(async (shoot: Shoot, status: ShootStatus, action?: string) => {
      const result = await executeStatusChange(shoot.id.toString(), status, action)
      if (result?.message) {
        toast.success(result.message)
        onSuccess?.()
      }
    }, 'Failed to update shoot status'),
    [withShootGuard, executeStatusChange, onSuccess]
  )

  // Navigation functions with null guards
  const navigateToActive = useCallback(() => {
    if (!shoot) {
      toast.error('Please wait for shoot data to load')
      return
    }
    router.push(`/shoots/${shoot.id}/active`)
  }, [shoot, router])

  const navigateToUpload = useCallback(() => {
    if (!shoot) {
      toast.error('Please wait for shoot data to load')
      return
    }
    router.push(`/shoots/${shoot.id}/upload`)
  }, [shoot, router])

  return {
    startShoot,
    completeShoot,
    deleteShoot,
    changeStatus,
    navigateToActive,
    navigateToUpload,
    isLoading: statusLoading || deleteLoading,
    canPerformActions: shoot !== null
  }
} 