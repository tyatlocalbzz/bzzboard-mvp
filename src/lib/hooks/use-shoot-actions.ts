import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { shootsApi } from '@/lib/api/shoots-client'
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

export const useShootActions = ({ 
  shoot, 
  onSuccess, 
  onOptimisticDelete 
}: UseShootActionsOptions): UseShootActionsReturn => {
  const router = useRouter()
  const { startShoot: startActiveShoot } = useActiveShoot()
  
  const { loading: statusLoading, execute: executeStatusChange } = useAsync(shootsApi.changeStatus)
  const { loading: deleteLoading, execute: executeDelete } = useAsync(shootsApi.delete)

  const startShoot = useCallback(async () => {
    // First change the shoot status to 'active'
    const statusResult = await executeStatusChange(shoot.id.toString(), 'active', 'start')
    if (!statusResult) return
    
    // Then start the active shoot context
    startActiveShoot({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client,
      startedAt: new Date().toISOString()
    })
    
    toast.success('Shoot started successfully!')
    onSuccess?.()
    
    // Navigate to active shoot page
    router.push(`/shoots/${shoot.id}/active`)
  }, [shoot, executeStatusChange, startActiveShoot, onSuccess, router])

  const completeShoot = useCallback(async () => {
    const statusResult = await executeStatusChange(shoot.id.toString(), 'completed', 'complete')
    if (!statusResult) return
    
    toast.success('Shoot completed successfully!')
    onSuccess?.()
  }, [shoot.id, executeStatusChange, onSuccess])

  const deleteShoot = useCallback(async () => {
    try {
      toast.loading('Deleting shoot...', { id: 'delete-shoot' })
      
      // Trigger optimistic delete
      onOptimisticDelete?.()
      
      const result = await executeDelete(shoot.id.toString())
      
      if (result) {
        toast.success('Shoot deleted successfully!', { id: 'delete-shoot' })
        
        if (shoot.googleCalendarEventId) {
          toast.info('Calendar event removed from Google Calendar')
        }
        
        if (result.recoveryNote) {
          toast.info(result.recoveryNote, { duration: 5000 })
        }
        
        router.push('/shoots?refresh=true')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete shoot. Please try again.', { id: 'delete-shoot' })
      onSuccess?.() // Refresh to restore state
    }
  }, [shoot, executeDelete, onOptimisticDelete, onSuccess, router])

  const changeStatus = useCallback(async (status: ShootStatus, action?: string) => {
    const result = await executeStatusChange(shoot.id.toString(), status, action)
    if (result) {
      toast.success(result.message)
      onSuccess?.()
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