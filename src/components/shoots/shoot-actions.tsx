'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Edit, Calendar, Trash2, Play, CheckCircle, Pause } from "lucide-react"
import { shootStatusManager, ShootStatus } from "@/lib/utils/status"
import { useAsync } from "@/lib/hooks/use-async"
import { toast } from "sonner"
import type { Shoot } from '@/lib/types/shoots'

interface ShootActionsProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

interface ActionItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}

const deleteShoot = async (id: string) => {
  const response = await fetch(`/api/shoots/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete shoot: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete shoot')
  }
  
  return {
    success: true,
    message: data.message || 'Shoot deleted successfully',
    calendarEventRemoved: data.calendarEventRemoved,
    recoveryNote: data.recoveryNote
  }
}

const changeShootStatus = async (id: string, newStatus: ShootStatus, action?: string) => {
  const response = await fetch(`/api/shoots/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: newStatus,
      action
    })
  })
  
  if (!response.ok) {
    throw new Error(`Failed to change shoot status: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to change shoot status')
  }
  
  return {
    success: true,
    message: data.message || `Shoot status changed to ${shootStatusManager.getLabel(newStatus)}`
  }
}

const getStatusIcon = (status: ShootStatus) => {
  switch (status) {
    case 'active':
      return Play
    case 'completed':
      return CheckCircle
    case 'cancelled':
      return Pause
    default:
      return Calendar
  }
}

export const ShootActions = ({ children, shoot, onSuccess }: ShootActionsProps) => {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { loading: deleteLoading, execute: executeDelete } = useAsync(deleteShoot)
  const { loading: statusLoading, execute: executeStatusChange } = useAsync(changeShootStatus)

  const handleDelete = async () => {
    const result = await executeDelete(shoot.id.toString())
    if (result) {
      toast.success(result.message || 'Shoot deleted successfully!')
      
      // Show additional info if calendar event was removed
      if (result.calendarEventRemoved) {
        toast.info('Calendar event removed from Google Calendar')
      }
      
      // Show recovery note if available
      if (result.recoveryNote) {
        toast.info(result.recoveryNote, { duration: 5000 })
      }
      
      // Trigger success callback to refresh data
      onSuccess()
      
      // Navigate to shoots list with refresh parameter
      router.push('/shoots?refresh=true')
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    handleDelete()
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const handleStatusChange = async (newStatus: ShootStatus) => {
    const result = await executeStatusChange(shoot.id.toString(), newStatus)
    if (result) {
      toast.success(result.message)
      onSuccess()
    }
  }

  const getAvailableActions = (): ActionItem[] => {
    const actions: ActionItem[] = []
    const currentStatus = shoot.status as ShootStatus
    const validTransitions = shootStatusManager.getValidTransitions(currentStatus)

    validTransitions.forEach((status) => {
      const Icon = getStatusIcon(status)
      const label = shootStatusManager.getLabel(status)
      
      actions.push({
        key: status,
        label: `Mark as ${label}`,
        icon: Icon,
        onClick: () => handleStatusChange(status)
      })
    })

    return actions
  }

  const availableActions = getAvailableActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Status Actions */}
        {availableActions.length > 0 && (
          <>
            {availableActions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.key}
                  onClick={action.onClick}
                  disabled={statusLoading}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Management Actions */}
        <DropdownMenuItem className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          <span>Edit Details</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>Reschedule</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Delete Action */}
        {!showDeleteConfirm ? (
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Shoot</span>
          </DropdownMenuItem>
        ) : (
          <div className="px-2 py-1 space-y-2">
            <div className="text-xs text-gray-600 text-center">
              Delete this shoot?
            </div>
            <div className="flex gap-1">
              <LoadingButton
                size="sm"
                variant="destructive"
                onClick={handleDeleteConfirm}
                loading={deleteLoading}
                className="flex-1 h-7 text-xs"
              >
                Delete
              </LoadingButton>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteCancel}
                className="flex-1 h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 