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
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictEvent[]>([])
  const [showConflictWarning, setShowConflictWarning] = useState(false)
  const [pendingShootData, setPendingShootData] = useState<ScheduleShootData | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const router = useRouter()
  const { loading, execute } = useAsync(scheduleShoot)
  const { selectedClient: contextClient, clients } = useClient()

  // Get available clients (excluding "All Clients")
  const availableClients = clients.filter(client => client.type === 'client')

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

  // Initialize selected client from context
  useState(() => {
    if (contextClient.type === 'client') {
      setSelectedClient(contextClient.name)
    }
  })

  const validateForm = (): string | null => {
    if (!titleField.value.trim()) return 'Shoot title is required'
    if (!selectedClient) return 'Client selection is required'
    if (!dateField.value) return 'Date is required'
    if (!timeField.value) return 'Time is required'
    if (!locationField.value.trim()) return 'Location is required'
    
    return null
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
    setDetectedConflicts([])

    const shootData = {
      title: titleField.value,
      clientName: selectedClient,
      date: dateField.value,
      time: timeField.value,
      duration: parseInt(selectedDuration) || 60,
      location: locationField.value,
      notes: notes.trim() || undefined // Notes are optional and not validated
    }

    const result = await execute(shootData)
    
    if (result) {
      if (result.hasConflicts && result.conflicts && result.conflicts.length > 0) {
        // Show conflicts inline in the form
        setDetectedConflicts(result.conflicts)
        setPendingShootData(shootData)
        setShowConflictWarning(true)
        
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
        titleField.reset()
        dateField.reset()
        timeField.reset()
        locationField.reset()
        setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
        setSelectedDuration('60')
        setNotes('')
        
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
    if (!pendingShootData) return
    
    const result = await execute({
      ...pendingShootData,
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
      setShowConflictWarning(false)
      setDetectedConflicts([])
      setPendingShootData(null)
      
      // Reset form
      titleField.reset()
      dateField.reset()
      timeField.reset()
      locationField.reset()
      setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
      setSelectedDuration('60')
      setNotes('')
      
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
    if (!pendingShootData) return
    
    const result = await execute({
      ...pendingShootData,
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
      setShowConflictWarning(false)
      setDetectedConflicts([])
      setPendingShootData(null)
      
      // Reset form
      titleField.reset()
      dateField.reset()
      timeField.reset()
      locationField.reset()
      setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
      setSelectedDuration('60')
      setNotes('')
      
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
    setShowConflictWarning(false)
    setDetectedConflicts([])
    setPendingShootData(null)
    // Keep the form open so user can modify the time
  }

  // Reset form function
  const resetForm = () => {
    setShowConflictWarning(false)
    setDetectedConflicts([])
    setPendingShootData(null)
    titleField.reset()
    dateField.reset()
    timeField.reset()
    locationField.reset()
    setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
    setSelectedDuration('60')
    setNotes('')
  }

  // Reset form when closed
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  // Handle manual close with reset
  const handleClose = () => {
    setIsOpen(false)
    resetForm()
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
                value={selectedClient}
                onValueChange={setSelectedClient}
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
              {isOpen && !selectedClient && (
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
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requirements, equipment needed, shot list ideas..."
                className="min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            {/* Conflict Warning - Inline */}
            {showConflictWarning && detectedConflicts.length > 0 && (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">
                      Calendar Conflicts Detected
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your shoot time overlaps with existing calendar events
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {detectedConflicts.map((conflict, index) => {
                    const startTime = new Date(conflict.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                    const endTime = new Date(conflict.endTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                    const date = new Date(conflict.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })
                    
                    return (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="font-medium text-red-900 text-sm">{conflict.title}</div>
                        <div className="text-xs text-red-700">
                          {date} • {startTime} - {endTime}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-yellow-100 border border-yellow-300 rounded-md p-4">
                  <p className="text-sm text-yellow-800 font-medium mb-2">What would you like to do?</p>
                  
                  <div className="text-xs text-yellow-700 mb-3 space-y-1">
                    <div>• <strong>Change Time:</strong> Modify your shoot time to avoid conflicts</div>
                    <div>• <strong>Schedule Anyway:</strong> Create shoot but skip calendar event (avoids conflicts)</div>
                    <div>• <strong>Force Schedule:</strong> Create shoot and calendar event (despite conflicts)</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleModifyTime}
                        className="flex-1 h-10 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                        disabled={loading}
                      >
                        Change Time
                      </Button>
                      <LoadingButton
                        onClick={handleForceCreate}
                        loading={loading}
                        loadingText="Creating shoot..."
                        className="flex-1 h-10 bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Schedule Anyway
                      </LoadingButton>
                    </div>
                    <LoadingButton
                      onClick={handleForceCalendarCreate}
                      loading={loading}
                      loadingText="Force creating..."
                      className="w-full h-10 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Force Schedule (Create Calendar Event)
                    </LoadingButton>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="w-full text-yellow-700 hover:bg-yellow-200"
                      disabled={loading}
                    >
                      Cancel & Close
                    </Button>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Actions */}
        {!showConflictWarning && (
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
              loadingText="Checking conflicts..."
            >
              Schedule Shoot
            </LoadingButton>
          </div>
        )}
      </DialogContent>
    </Dialog>


    </>
  )
} 