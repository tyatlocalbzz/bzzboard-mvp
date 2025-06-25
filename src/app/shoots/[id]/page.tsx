'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

import { FormSheet } from "@/components/ui/form-sheet"
import { LoadingButton } from "@/components/ui/loading-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MobileInput } from "@/components/ui/mobile-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Edit, Plus, MoreHorizontal, Users, Trash2, Play, Upload, CheckCircle, ExternalLink, AlertTriangle, Unlink } from "lucide-react"
import { formatStatusText, getStatusColor, shootStatusManager, ShootStatus } from "@/lib/utils/status"
import { useAsync } from "@/lib/hooks/use-async"
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { useActiveShoot } from "@/contexts/active-shoot-context"
import { toast } from "sonner"
import { PLATFORM_OPTIONS } from '@/lib/constants/platforms'
import Link from 'next/link'
import type { Shoot as BaseShoot, PostIdea } from '@/lib/types/shoots'
import { ClientData } from '@/lib/types/client'
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { AddPostChoiceDialog } from '@/components/shoots/add-post-choice-dialog'
import { AssignExistingPostsDialog } from '@/components/shoots/assign-existing-posts-dialog'
import { useClient } from '@/contexts/client-context'


// Extended shoot type with Google Calendar fields
interface Shoot extends BaseShoot {
  googleCalendarEventId?: string
  googleCalendarSyncStatus?: 'pending' | 'synced' | 'error'
  googleCalendarError?: string
}

// Additional types for this page
interface RescheduleData {
  date: string
  time: string
}

interface EditShootData {
  title: string
  client: string
  duration: number
  location: string
  notes?: string
}

// Extended PostIdea type for this page with additional fields
interface ExtendedPostIdea extends PostIdea {
  shotList: string[]
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
  notes?: string
}



// Real API functions using database
const fetchShoot = async (id: string): Promise<Shoot> => {
  const response = await fetch(`/api/shoots/${id}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch shoot: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shoot')
  }
  
  return data.shoot
}

const fetchPostIdeas = async (shootId: string): Promise<ExtendedPostIdea[]> => {
  const response = await fetch(`/api/shoots/${shootId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch post ideas: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch post ideas')
  }
  
  // Transform the post ideas to match the extended format
  const postIdeas = data.postIdeas || []
  return postIdeas.map((postIdea: { id: number; title: string; platforms: string[]; shots?: { text: string; completed: boolean }[] }) => ({
    ...postIdea,
    shotList: postIdea.shots?.map((shot: { text: string; completed: boolean }) => shot.text) || [],
    completed: postIdea.shots?.every((shot: { text: string; completed: boolean }) => shot.completed) || false
  }))
}

const rescheduleShoot = async (id: string, data: RescheduleData) => {
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log('Rescheduling shoot:', id, data)
  return { success: true }
}

const editShoot = async (id: string, data: EditShootData) => {
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log('Editing shoot:', id, data)
  return { success: true }
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
    recoveryNote: data.recoveryNote || 'No recovery note provided'
  }
}

// Change shoot status - Real API implementation using centralized status management
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

const togglePostIdeaStatus = async (postIdeaId: number) => {
  await new Promise(resolve => setTimeout(resolve, 400))
  console.log('Toggling post idea status:', postIdeaId)
  return { success: true }
}

// Shoot Actions Component - DRY pattern for consolidated actions
interface ShootActionsProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
  onOptimisticDelete?: () => void
}

const ShootActions = ({ children, shoot, onSuccess, onOptimisticDelete }: ShootActionsProps) => {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { loading: deleteLoading, execute: executeDelete } = useAsync(deleteShoot)
  const { loading: statusLoading, execute: executeStatusChange } = useAsync(changeShootStatus)

  const handleDelete = async () => {
    try {
      // 1. Optimistic update - immediately show loading and trigger optimistic UI
      toast.loading('Deleting shoot...', { id: 'delete-shoot' })
      
      // 2. Trigger optimistic delete in parent component
      if (onOptimisticDelete) {
        onOptimisticDelete()
      }
      
      // 3. Execute actual deletion
      const result = await executeDelete(shoot.id.toString())
      
      if (result) {
        // 4. Success - update toast
        toast.success('Shoot deleted successfully!', { id: 'delete-shoot' })
        
        // If shoot had Google Calendar integration, inform user
        if (shoot.googleCalendarEventId) {
          toast.info('Calendar event removed from Google Calendar')
        }
        
        // Show recovery option
        if (result.recoveryNote) {
          toast.info(result.recoveryNote, { duration: 5000 })
        }
        
        // Navigate to shoots list with refresh parameter
        router.push('/shoots?refresh=true')
      }
    } catch (error) {
      // 5. On failure, let parent component handle rollback
      console.error('Delete error:', error)
      toast.error('Failed to delete shoot. Please try again.', { id: 'delete-shoot' })
      
      // Refresh to restore state
      onSuccess()
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

  // Get valid status transitions using centralized status management
  const validTransitions = shootStatusManager.getValidTransitions(shoot.status as ShootStatus)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <EditShootForm shoot={shoot} onSuccess={onSuccess}>
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          </EditShootForm>

          <RescheduleForm shoot={shoot} onSuccess={onSuccess}>
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
          </RescheduleForm>

          {/* Status Change Options - DRY implementation using centralized status management */}
          {validTransitions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {validTransitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={statusLoading}
                  className="cursor-pointer"
                >
                  {statusLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${shootStatusManager.getBgColor(status).replace('bg-', 'bg-')}`} />
                    </div>
                  )}
                  Change to {shootStatusManager.getLabel(status)}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            disabled={deleteLoading}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            {deleteLoading ? (
              <LoadingSpinner size="md" color="red" className="mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Shoot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Shoot</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete &quot;{shoot.title}&quot;? All post ideas and shots will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                className="flex-1"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="flex-1"
                loading={deleteLoading}
                loadingText="Deleting..."
              >
                Delete
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Edit Shoot Form Component - Following DRY pattern
interface EditShootFormProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

const EditShootForm = ({ children, shoot, onSuccess }: EditShootFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(shoot.duration.toString())
  const { loading, execute } = useAsync(editShoot)

  // Field validation hooks
  const titleField = useFieldValidation({
    fieldName: 'name',
    initialValue: shoot.title,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const clientField = useFieldValidation({
    fieldName: 'name',
    initialValue: shoot.client,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const locationField = useFieldValidation({
    fieldName: 'name',
    initialValue: shoot.location,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const validateForm = (): string | null => {
    if (!titleField.value.trim()) return 'Shoot title is required'
    if (!clientField.value.trim()) return 'Client is required'
    if (!locationField.value.trim()) return 'Location is required'
    return null
  }

  const handleSubmit = async () => {
    // Validate all fields
    const titleValidation = titleField.validate()
    const clientValidation = clientField.validate()
    const locationValidation = locationField.validate()
    
    if (!titleValidation.valid || !clientValidation.valid || !locationValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const result = await execute(shoot.id.toString(), {
      title: titleField.value,
      client: clientField.value,
      duration: parseInt(selectedDuration),
      location: locationField.value,
      notes: undefined // Notes are optional and not validated
    })
    
    if (result) {
      toast.success('Shoot updated successfully!')
      setIsOpen(false)
      onSuccess()
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset fields when closing
      titleField.setValue(shoot.title)
      clientField.setValue(shoot.client)
      locationField.setValue(shoot.location)
      setSelectedDuration(shoot.duration.toString())
    }
  }

  const formContent = (
    <>
      <MobileInput
        label="Shoot Title *"
        placeholder="e.g., Q1 Product Launch Content"
        value={titleField.value}
        onChange={titleField.handleChange}
        onBlur={titleField.handleBlur}
        error={titleField.validationResult.error}
        validationState={titleField.validationResult.state}
        required
      />

      <MobileInput
        label="Client *"
        placeholder="Client name"
        value={clientField.value}
        onChange={clientField.handleChange}
        onBlur={clientField.handleBlur}
        error={clientField.validationResult.error}
        validationState={clientField.validationResult.state}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration</Label>
          <Select value={selectedDuration} onValueChange={setSelectedDuration}>
            <SelectTrigger className="h-12 text-base tap-target">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="180">3 hours</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MobileInput
          label="Location *"
          placeholder="Shoot location"
          value={locationField.value}
          onChange={locationField.handleChange}
          onBlur={locationField.handleBlur}
          error={locationField.validationResult.error}
          validationState={locationField.validationResult.state}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={shoot.notes || ''}
          placeholder="Equipment needs, special requirements..."
          className="min-h-[80px] text-base tap-target resize-none"
          rows={3}
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Edit Shoot"
      description="Update the shoot details"
      icon={Edit}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Save Changes"
      loadingText="Saving..."
    />
  )
}

// Reschedule Form Component - Following DRY pattern
interface RescheduleFormProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

const RescheduleForm = ({ children, shoot, onSuccess }: RescheduleFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { loading, execute } = useAsync(rescheduleShoot)

  // Get current date and time from shoot
  const currentDate = new Date(shoot.scheduledAt).toISOString().split('T')[0]
  const currentTime = new Date(shoot.scheduledAt).toTimeString().slice(0, 5)
  const today = new Date().toISOString().split('T')[0]

  // Field validation hooks
  const dateField = useFieldValidation({
    fieldName: 'name',
    initialValue: currentDate,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const timeField = useFieldValidation({
    fieldName: 'name',
    initialValue: currentTime,
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const validateForm = (): string | null => {
    if (!dateField.value) return 'Date is required'
    if (!timeField.value) return 'Time is required'
    return null
  }

  const handleSubmit = async () => {
    // Validate all fields
    const dateValidation = dateField.validate()
    const timeValidation = timeField.validate()
    
    if (!dateValidation.valid || !timeValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const result = await execute(shoot.id.toString(), { 
      date: dateField.value, 
      time: timeField.value
    })
    
    if (result) {
      toast.success('Shoot rescheduled successfully!')
      setIsOpen(false)
      onSuccess()
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset fields when closing
      dateField.setValue(currentDate)
      timeField.setValue(currentTime)
    }
  }

  const formContent = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MobileInput
          label="New Date *"
          type="date"
          value={dateField.value}
          onChange={dateField.handleChange}
          onBlur={dateField.handleBlur}
          min={today}
          error={dateField.validationResult.error}
          validationState={dateField.validationResult.state}
          required
        />
        <MobileInput
          label="New Time *"
          type="time"
          value={timeField.value}
          onChange={timeField.handleChange}
          onBlur={timeField.handleBlur}
          error={timeField.validationResult.error}
          validationState={timeField.validationResult.state}
          required
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Reschedule Shoot"
      description="Update the date and time for this shoot"
      icon={Calendar}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Reschedule"
      loadingText="Rescheduling..."
    />
  )
}

// Post Idea Actions Component - DRY pattern for post idea actions
interface PostIdeaActionsProps {
  postIdea: ExtendedPostIdea
  shootId: string
  onToggleStatus: () => void
  onRemoveFromShoot: () => void
}

const PostIdeaActions = ({ postIdea, shootId, onToggleStatus, onRemoveFromShoot }: PostIdeaActionsProps) => {
  const { loading, execute } = useAsync(togglePostIdeaStatus)
  const { loading: removeLoading, execute: executeRemove } = useAsync(async (postId: number, shootId: string) => {
    const response = await fetch(`/api/posts/${postId}/remove-from-shoot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shootId: parseInt(shootId) })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to remove post from shoot')
    }

    return await response.json()
  })

  const handleToggleStatus = async () => {
    const result = await execute(postIdea.id)
    if (result) {
      onToggleStatus()
    }
  }

  const handleRemoveFromShoot = async () => {
    const result = await executeRemove(postIdea.id, shootId)
    if (result?.success) {
      toast.success(`"${postIdea.title}" removed from shoot`)
      onRemoveFromShoot()
    }
  }

  const getStatusAction = () => {
    switch (postIdea.status) {
      case 'planned': return 'Mark as Shot'
      case 'shot': return 'Mark as Uploaded'
      case 'uploaded': return 'Mark as Planned'
      default: return 'Update Status'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <PostIdeaForm
          mode="edit"
          context="shoot"
          shootId={shootId}
          postIdea={{
            id: postIdea.id,
            title: postIdea.title,
            platforms: postIdea.platforms,
            contentType: postIdea.contentType,
            caption: postIdea.caption,
            shotList: postIdea.shotList,
            notes: postIdea.notes,
            status: postIdea.status,
            client: null, // Will be populated by context
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          onSuccess={onToggleStatus}
          trigger={
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          }
        />
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleToggleStatus}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="gray" className="mr-2" />
          ) : (
            <Badge variant="outline" className="mr-2 h-4 w-4 p-0" />
          )}
          {getStatusAction()}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRemoveFromShoot}
          disabled={removeLoading}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          {removeLoading ? (
            <LoadingSpinner size="sm" color="red" className="mr-2" />
          ) : (
            <Unlink className="h-4 w-4 mr-2" />
          )}
          Remove from Shoot
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ShootDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { startShoot } = useActiveShoot()
  const { clients } = useClient()
  
  const [shoot, setShoot] = useState<Shoot | null>(null)
  const [postIdeas, setPostIdeas] = useState<ExtendedPostIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAssignPostsDialog, setShowAssignPostsDialog] = useState(false)
  const [showCreatePostForm, setShowCreatePostForm] = useState(false)

  // Status change functionality using DRY centralized system
  const { loading: statusChangeLoading, execute: executeStatusChange } = useAsync(changeShootStatus)

  // Helper function to find client override from shoot's client name
  const getClientOverride = (clientName: string): ClientData | null => {
    return clients.find(client => client.name === clientName && client.type === 'client') || null
  }

  // Load shoot and post ideas
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [shootData, postIdeasData] = await Promise.all([
          fetchShoot(shootId),
          fetchPostIdeas(shootId)
        ])
        setShoot(shootData)
        setPostIdeas(postIdeasData)
      } catch (error) {
        console.error('Failed to load shoot data:', error)
        toast.error('Failed to load shoot details')
      } finally {
        setIsLoading(false)
      }
    }

    if (shootId) {
      loadData()
    }
  }, [shootId])

  const handleRefresh = useCallback(async () => {
    if (!shootId) return
    
    try {
      const [shootData, postIdeasData] = await Promise.all([
        fetchShoot(shootId),
        fetchPostIdeas(shootId)
      ])
      setShoot(shootData)
      setPostIdeas(postIdeasData)
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data')
    }
  }, [shootId])

  const handleStartShoot = async () => {
    if (!shoot || statusChangeLoading) return
    
    // First change the shoot status to 'active' using real API with action parameter
    const statusResult = await executeStatusChange(shoot.id.toString(), 'active', 'start')
    if (!statusResult) return
    
    // Then start the active shoot context
    startShoot({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client,
      startedAt: new Date().toISOString()
    })
    
    toast.success('Shoot started successfully!')
    
    // Refresh data to show updated status
    await handleRefresh()
    
    // Navigate to active shoot page
    router.push(`/shoots/${shootId}/active`)
  }

  const handleCompleteShoot = async () => {
    if (!shoot || statusChangeLoading) return
    
    // Change the shoot status to 'completed' using real API with action parameter
    const statusResult = await executeStatusChange(shoot.id.toString(), 'completed', 'complete')
    if (!statusResult) return
    
    toast.success('Shoot completed successfully!')
    
    // Refresh data to show updated status
    await handleRefresh()
  }

  // Optimistic delete handler
  const handleOptimisticDelete = useCallback(() => {
    // Immediately hide the shoot and navigate away
    setShoot(null)
    router.push('/shoots')
  }, [router])

  // Post choice handlers
  const handleCreateNewPost = () => {
    setShowCreatePostForm(true)
  }

  const handleAssignExistingPost = () => {
    setShowAssignPostsDialog(true)
  }

  // Utility functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Status color now handled by centralized status management

  if (isLoading) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref="/shoots"
        showBottomNav={false}
        loading={true}
      >
        <div />
      </MobileLayout>
    )
  }

  if (!shoot) {
    return (
      <MobileLayout 
        title="Shoot Not Found"
        backHref="/shoots"
        showBottomNav={false}
      >
        <EmptyState
          icon={Calendar}
          title="Shoot not found"
          description="The shoot you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Shoots",
            onClick: () => router.push('/shoots')
          }}
        />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title={shoot.client}
      backHref="/shoots"
      headerAction={
        <ShootActions 
          shoot={shoot} 
          onSuccess={handleRefresh} 
          onOptimisticDelete={handleOptimisticDelete}
        >
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ShootActions>
      }
    >
      {/* Action Button Section - Below Header */}
      {(shoot.status === 'scheduled' || shoot.status === 'active' || shoot.status === 'completed') && (
        <div className="border-b border-gray-200 bg-white px-3 py-3">
          {shoot.status === 'scheduled' && (
            <LoadingButton
              onClick={handleStartShoot}
              className="w-full h-12 text-base font-medium"
              loading={statusChangeLoading}
              loadingText="Starting..."
            >
              <Play className="h-5 w-5 mr-2" />
              Start Shoot
            </LoadingButton>
          )}
          {shoot.status === 'active' && (
            <LoadingButton
              onClick={handleCompleteShoot}
              className="w-full h-12 text-base font-medium"
              loading={statusChangeLoading}
              loadingText="Completing..."
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete Shoot
            </LoadingButton>
          )}
          {shoot.status === 'completed' && (
            <Link href={`/shoots/${shootId}/upload`} className="block">
              <Button className="w-full h-12 text-base font-medium">
                <Upload className="h-5 w-5 mr-2" />
                Upload Content
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="px-3 py-3 space-y-6">
        {/* Shoot Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{shoot.title}</h1>
            <Badge variant={getStatusColor(shoot.status)}>
              {formatStatusText(shoot.status)}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(shoot.scheduledAt)} at {formatTime(shoot.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(shoot.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{shoot.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{postIdeas.length} post idea{postIdeas.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Google Calendar Integration Status */}
          {shoot.googleCalendarEventId && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Added to Google Calendar
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    // Use the stored htmlLink if available, otherwise fallback to search
                    const calendarUrl = shoot.googleCalendarHtmlLink || 
                      `https://calendar.google.com/calendar/u/0/r/week/${new Date().toISOString().split('T')[0].replace(/-/g, '')}?search=${encodeURIComponent(shoot.title)}`
                    window.open(calendarUrl, '_blank')
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          )}

          {shoot.googleCalendarError && !shoot.googleCalendarEventId && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-yellow-900">
                    Calendar sync failed
                  </span>
                  <p className="text-xs text-yellow-700 mt-1">
                    {shoot.googleCalendarError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {shoot.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{shoot.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Post Ideas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Post Ideas</h2>
            <AddPostChoiceDialog 
              onCreateNew={handleCreateNewPost}
              onAssignExisting={handleAssignExistingPost}
            >
              <Button size="sm" className="h-8 px-3 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </AddPostChoiceDialog>
          </div>

          {postIdeas.length > 0 ? (
            <div className="space-y-3">
              {postIdeas.map((postIdea, index) => (
                <div key={postIdea.id}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {postIdea.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {postIdea.platforms.slice(0, 3).map((platform) => {
                              const platformOption = PLATFORM_OPTIONS.find(p => p.name === platform)
                              const Icon = platformOption?.icon
                              return Icon ? (
                                <Icon key={platform} className="h-3 w-3 text-gray-500" />
                              ) : (
                                <span key={platform} className="text-xs text-gray-500">
                                  {platform.slice(0, 2)}
                                </span>
                              )
                            })}
                            {postIdea.platforms.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{postIdea.platforms.length - 3}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {postIdea.contentType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={getStatusColor(postIdea.status)}>
                          {formatStatusText(postIdea.status)}
                        </Badge>
                        <PostIdeaActions 
                          postIdea={postIdea} 
                          shootId={shootId}
                          onToggleStatus={handleRefresh}
                          onRemoveFromShoot={handleRefresh}
                        />
                      </div>
                    </div>

                    {postIdea.caption && (
                      <p className="text-sm text-gray-600 mb-3">
                        {postIdea.caption}
                      </p>
                    )}

                    {postIdea.shotList.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Shot List ({postIdea.shotList.length})
                        </h4>
                        <ul className="space-y-1">
                          {postIdea.shotList.map((shot, shotIndex) => (
                            <li key={shotIndex} className="text-sm text-gray-600 flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                              {shot}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {postIdea.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Notes:</strong> {postIdea.notes}
                      </div>
                    )}
                  </div>
                  
                  {index < postIdeas.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Plus}
              title="No post ideas yet"
              description="Add your first post idea to start planning your content for this shoot."
              action={{
                label: "Add Post Idea",
                children: (
                  <PostIdeaForm
                    mode="create"
                    context="shoot"
                    shootId={params.id as string}
                    clientOverride={getClientOverride(shoot.client)}
                    onSuccess={handleRefresh}
                    displayMode="dialog"
                    trigger={
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Post Idea
                      </Button>
                    }
                  />
                )
              }}
            />
          )}
        </div>
      </div>

      {/* Create Post Form */}
      <PostIdeaForm
        open={showCreatePostForm}
        onOpenChange={setShowCreatePostForm}
        mode="create"
        context="shoot"
        shootId={params.id as string}
        clientOverride={getClientOverride(shoot.client)}
        onSuccess={() => {
          handleRefresh()
          setShowCreatePostForm(false)
        }}
        onCancel={() => setShowCreatePostForm(false)}
        displayMode="dialog"
      />

      {/* Assign Existing Posts Dialog */}
      <AssignExistingPostsDialog
        open={showAssignPostsDialog}
        onOpenChange={setShowAssignPostsDialog}
        shootId={shootId}
        onSuccess={handleRefresh}
      />
    </MobileLayout>
  )
} 