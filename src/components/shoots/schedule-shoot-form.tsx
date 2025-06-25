'use client'

import { ReactNode, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useFormState } from '@/lib/hooks/use-form-state'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { useClient } from '@/contexts/client-context'
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react'

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
    fieldName: 'name', // Use name validation for title
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const dateField = useFieldValidation({
    fieldName: 'name', // Generic validation for required field
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const timeField = useFieldValidation({
    fieldName: 'name', // Generic validation for required field
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const locationField = useFieldValidation({
    fieldName: 'name', // Generic validation for required field
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

    const shootData = {
      title: titleField.value,
      clientName: formState.data.selectedClient,
      date: dateField.value,
      time: timeField.value,
      duration: parseInt(formState.data.selectedDuration) || 60,
      location: locationField.value,
      notes: formState.data.notes.trim() || undefined // Notes are optional and not validated
    }

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
        // Success cases - reset form
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
        
        // Trigger parent refresh if available, or navigate with refresh parameter
        if (onSuccess) {
          onSuccess()
        } else {
          // If no parent refresh available, check if we should navigate to shoots page
          const currentPath = window.location.pathname
          if (currentPath === '/shoots') {
            router.refresh()
          } else {
            // Navigate to shoots page with refresh parameter
            router.push('/shoots?refresh=true')
          }
        }
        
      } else if (result.warning) {
        // Other warnings (non-conflict)
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
      if (result.warning) {
        toast.success('Shoot created successfully!')
        toast.warning(result.warning, { duration: 5000 })
      } else {
        toast.success('Shoot scheduled successfully!')
      }
      
      // Reset conflict state and form
      formState.reset(getInitialFormData())
      setIsOpen(false)
      
      // Trigger parent refresh if available, or navigate with refresh parameter
      if (onSuccess) {
        onSuccess()
      } else {
        // If no parent refresh available, check if we should navigate to shoots page
        const currentPath = window.location.pathname
        if (currentPath === '/shoots') {
          router.refresh()
        } else {
          // Navigate to shoots page with refresh parameter
          router.push('/shoots?refresh=true')
        }
      }
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
      if (result.message) {
        toast.success(result.message)
      } else {
        toast.success('Shoot scheduled successfully!')
      }
      
      if (result.warning) {
        toast.warning(result.warning, { duration: 6000 })
      }
      
      // Reset conflict state and form
      formState.reset(getInitialFormData())
      setIsOpen(false)
      
      // Trigger parent refresh if available, or navigate with refresh parameter
      if (onSuccess) {
        onSuccess()
      } else {
        // If no parent refresh available, check if we should navigate to shoots page
        const currentPath = window.location.pathname
        if (currentPath === '/shoots') {
          router.refresh()
        } else {
          // Navigate to shoots page with refresh parameter
          router.push('/shoots?refresh=true')
        }
      }
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

  // Get today's date for min date input - use fixed date for consistency
  const today = "2024-01-15"

  return (
    <>
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
            {/* Shoot Title */}
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

            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client *</Label>
              <Select 
                value={formState.data.selectedClient}
                onValueChange={(value) => formState.setField('selectedClient', value)}
                required
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <SelectValue placeholder="Choose a client" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.name}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{client.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOpen && !formState.data.selectedClient && (
                <p className="text-sm text-red-600">Please select a client</p>
              )}
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Date *"
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
                label="Time *"
                type="time"
                value={timeField.value}
                onChange={timeField.handleChange}
                onBlur={timeField.handleBlur}
                error={timeField.validationResult.error}
                validationState={timeField.validationResult.state}
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duration</Label>
              <Select 
                value={formState.data.selectedDuration} 
                onValueChange={(value) => formState.setField('selectedDuration', value)}
              >
                <SelectTrigger>
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

            {/* Location */}
            <MobileInput
              label="Location *"
              placeholder="e.g., Downtown Studio, Client Office"
              value={locationField.value}
              onChange={locationField.handleChange}
              onBlur={locationField.handleBlur}
              error={locationField.validationResult.error}
              validationState={locationField.validationResult.state}
              helperText="Where will the shoot take place?"
              required
            />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formState.data.notes}
                onChange={(e) => formState.setField('notes', e.target.value)}
                placeholder="Special requirements, equipment needed, shot list ideas..."
                className="min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            {/* Conflict Warning - Inline */}
            {formState.data.showConflictWarning && formState.data.detectedConflicts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 mb-2">
                      Calendar Conflicts Detected
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      The following events overlap with your proposed shoot time:
                    </p>
                    <div className="space-y-2 mb-4">
                      {formState.data.detectedConflicts.map((conflict, index) => (
                        <div key={index} className="bg-white rounded p-2 text-sm">
                          <div className="font-medium text-gray-900">{conflict.title}</div>
                          <div className="text-gray-600">
                            {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleForceCreate}
                          disabled={loading}
                          className="flex-1"
                        >
                          Create Shoot Only
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleForceCalendarCreate}
                          disabled={loading}
                          className="flex-1"
                        >
                          Create Both Anyway
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleModifyTime}
                        disabled={loading}
                        className="w-full"
                      >
                        Modify Time Instead
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
    </>
  )
} 