import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { ShootsApi } from '@/lib/api/shoots-unified'
import { ShootStatus } from '@/lib/utils/status'
import type { Shoot } from '@/lib/types/shoots'

interface UseShootActionsOptions {
  shoot: Shoot
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
}

/**
 * Enhanced shoot actions hook using unified API
 * Provides optimized state management and consistent error handling
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

  const startShoot = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error('❌ [useShootActions] Start shoot error:', error)
      toast.error('Failed to start shoot. Please try again.')
    }
  }, [shoot, executeStatusChange, startActiveShoot, onSuccess, router])

  const completeShoot = useCallback(async () => {
    try {
      const statusResult = await executeStatusChange(shoot.id.toString(), 'completed', 'complete')
      if (!statusResult) return
      
      toast.success('Shoot completed successfully!')
      onSuccess?.()
    } catch (error) {
      console.error('❌ [useShootActions] Complete shoot error:', error)
      toast.error('Failed to complete shoot. Please try again.')
    }
  }, [shoot.id, executeStatusChange, onSuccess])

  const deleteShoot = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error('❌ [useShootActions] Delete error:', error)
      toast.error('Failed to delete shoot. Please try again.', { id: 'delete-shoot' })
      onSuccess?.() // Refresh to restore state
    }
  }, [shoot, executeDelete, onOptimisticDelete, onSuccess, router])

  const changeStatus = useCallback(async (status: ShootStatus, action?: string) => {
    try {
      const result = await executeStatusChange(shoot.id.toString(), status, action)
      if (result?.message) {
        toast.success(result.message)
        onSuccess?.()
      }
    } catch (error) {
      console.error('❌ [useShootActions] Change status error:', error)
      toast.error('Failed to update shoot status. Please try again.')
    }
  }, [shoot.id, executeStatusChange, onSuccess])

  const navigateToActive = useCallback(() => {
    router.push(`/shoots/${shoot.id}/active`)
  }, [shoot.id, router])

  const navigateToUpload = useCallback(() => {
    router.push(`/shoots/${shoot.id}/upload`)
  }, [shoot.id, router])

  return {
    startShoot,
    completeShoot,
    deleteShoot,
    changeStatus,
    navigateToActive,
    navigateToUpload,
    isLoading: statusLoading || deleteLoading
  }
} 