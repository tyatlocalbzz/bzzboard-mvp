'use client'

import { ReactNode, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useFormState } from '@/lib/hooks/use-form-state'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { useClient } from '@/contexts/client-context'
import { Calendar } from 'lucide-react'
import { ShootFormFields } from './shoot-form-fields'
import { ConflictWarningSection } from './conflict-warning-section'

interface ScheduleShootFormProps {
  children: ReactNode
  onSuccess?: () => void
}

interface ScheduleShootData {
  title: string
  clientName: string
  date: string
  time: string
  duration: number
  location: string
  notes?: string
  forceCreate?: boolean
  forceCalendarCreate?: boolean
}

interface ConflictEvent {
  title: string
  startTime: string
  endTime: string
}

interface ScheduleShootResult {
  success: boolean
  shoot?: {
    id: number
    title: string
    client: { id: number; name: string }
    scheduledAt: Date
    duration: number
    location: string
    notes?: string
  }
  message?: string
  warning?: string
  info?: string
  conflicts?: ConflictEvent[]
  hasConflicts?: boolean
  shootData?: ScheduleShootData
}

// Form state interface for useFormState
interface ScheduleShootFormData {
  selectedClient: string
  selectedDuration: string
  notes: string
  // Conflict management state
  detectedConflicts: ConflictEvent[]
  showConflictWarning: boolean
  pendingShootData: ScheduleShootData | null
}

// Real API function using database
const scheduleShoot = async (data: ScheduleShootData): Promise<ScheduleShootResult> => {
  const response = await fetch('/api/shoots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(`Failed to schedule shoot: ${response.statusText}`)
  }
  
  const result = await response.json()
  
  // Don't throw error for conflicts - return the result so we can handle it properly
  if (!result.success && !result.hasConflicts) {
    throw new Error(result.error || 'Failed to schedule shoot')
  }
  
  return result
}

export const ScheduleShootForm = ({ children, onSuccess }: ScheduleShootFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { loading, execute } = useAsync(scheduleShoot)
  const { selectedClient: contextClient, clients } = useClient()

  // Get available clients (excluding "All Clients")
  const availableClients = clients.filter(client => client.type === 'client')

  // Initialize form data
  const getInitialFormData = (): ScheduleShootFormData => ({
    selectedClient: contextClient.type === 'client' ? contextClient.name : '',
    selectedDuration: '60',
    notes: '',
    detectedConflicts: [],
    showConflictWarning: false,
    pendingShootData: null
  })

  // Use the form state hook for all form data
  const formState = useFormState<ScheduleShootFormData>(getInitialFormData())

  // Field validation hooks
  const titleField = useFieldValidation({
    fieldName: 'name',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const dateField = useFieldValidation({
    fieldName: 'name',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const timeField = useFieldValidation({
    fieldName: 'name',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const locationField = useFieldValidation({
    fieldName: 'name',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const validateForm = (): string | null => {
    if (!titleField.value.trim()) return 'Shoot title is required'
    if (!formState.data.selectedClient) return 'Client selection is required'
    if (!dateField.value) return 'Date is required'
    if (!timeField.value) return 'Time is required'
    if (!locationField.value.trim()) return 'Location is required'
    
    return null
  }

  // Reset form function - now centralized
  const resetForm = () => {
    const initialData = getInitialFormData()
    formState.reset(initialData)
    titleField.reset()
    dateField.reset()
    timeField.reset()
    locationField.reset()
  }

  const buildShootData = (): ScheduleShootData => ({
    title: titleField.value,
    clientName: formState.data.selectedClient,
    date: dateField.value,
    time: timeField.value,
    duration: parseInt(formState.data.selectedDuration) || 60,
    location: locationField.value,
    notes: formState.data.notes.trim() || undefined
  })

  const handleSuccess = (result: ScheduleShootResult) => {
    resetForm()
    
    if (result.message) {
      toast.success(result.message)
    } else if (result.info) {
      toast.success('Shoot scheduled successfully!')
      toast.info(result.info)
    } else {
      toast.success('Shoot scheduled successfully!')
    }
    
    // Show warning if calendar event wasn't created
    if (result.warning) {
      toast.warning(result.warning, { duration: 5000 })
    }
    
    setIsOpen(false)
    
    // Trigger parent refresh or navigate
    if (onSuccess) {
      onSuccess()
    } else {
      const currentPath = window.location.pathname
      if (currentPath === '/shoots') {
        router.refresh()
      } else {
        router.push('/shoots?refresh=true')
      }
    }
  }

  const handleSubmit = async () => {
    // Validate all fields
    const titleValidation = titleField.validate()
    const dateValidation = dateField.validate()
    const timeValidation = timeField.validate()
    const locationValidation = locationField.validate()
    
    if (!titleValidation.valid || !dateValidation.valid || !timeValidation.valid || !locationValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    // Clear previous conflicts
    formState.setField('detectedConflicts', [])

    const shootData = buildShootData()
    const result = await execute(shootData)
    
    if (result) {
      if (result.hasConflicts && result.conflicts && result.conflicts.length > 0) {
        // Show conflicts inline in the form
        formState.setFields({
          detectedConflicts: result.conflicts,
          pendingShootData: shootData,
          showConflictWarning: true
        })
        
        // Show toast notification
        const conflictCount = result.conflicts.length
        toast.warning(
          `Calendar conflict${conflictCount > 1 ? 's' : ''} detected! Please review and choose how to proceed.`,
          { duration: 4000 }
        )
        
        // Don't close the form - let user decide inline
        return
        
      } else if (result.success) {
        handleSuccess(result)
      } else if (result.warning) {
        toast.warning(result.warning)
      }
    }
  }

  // Handle user's decision to proceed despite conflicts
  const handleForceCreate = async () => {
    if (!formState.data.pendingShootData) return
    
    const result = await execute({
      ...formState.data.pendingShootData,
      forceCreate: true
    })
    
    if (result && result.success) {
      handleSuccess(result)
    }
  }

  // Handle user's decision to force create calendar event despite conflicts
  const handleForceCalendarCreate = async () => {
    if (!formState.data.pendingShootData) return
    
    const result = await execute({
      ...formState.data.pendingShootData,
      forceCreate: true,
      forceCalendarCreate: true
    })
    
    if (result && result.success) {
      handleSuccess(result)
    }
  }

  // Handle user's decision to modify time due to conflicts
  const handleModifyTime = () => {
    formState.setFields({
      showConflictWarning: false,
      detectedConflicts: [],
      pendingShootData: null
    })
    // Keep the form open so user can modify the time
  }

  // Reset form when closed
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      formState.reset(getInitialFormData())
    }
  }

  // Handle manual close with reset
  const handleClose = () => {
    setIsOpen(false)
    formState.reset(getInitialFormData())
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule New Shoot
          </DialogTitle>
          <DialogDescription>
            Plan a content creation session with your client
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          {/* Form Fields */}
          <ShootFormFields
            titleField={titleField}
            dateField={dateField}
            timeField={timeField}
            locationField={locationField}
            selectedClient={formState.data.selectedClient}
            onClientChange={(client) => formState.setField('selectedClient', client)}
            selectedDuration={formState.data.selectedDuration}
            onDurationChange={(duration) => formState.setField('selectedDuration', duration)}
            notes={formState.data.notes}
            onNotesChange={(notes) => formState.setField('notes', notes)}
            availableClients={availableClients}
            isOpen={isOpen}
          />

          {/* Conflict Warning - Inline */}
          {formState.data.showConflictWarning && (
            <ConflictWarningSection
              conflicts={formState.data.detectedConflicts}
              loading={loading}
              onForceCreate={handleForceCreate}
              onForceCalendarCreate={handleForceCalendarCreate}
              onModifyTime={handleModifyTime}
            />
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            className="flex-1"
            loading={loading}
            loadingText="Scheduling..."
          >
            Schedule Shoot
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
} 