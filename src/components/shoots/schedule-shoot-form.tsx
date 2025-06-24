'use client'

import { ReactNode, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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

export const ScheduleShootForm = ({ children }: ScheduleShootFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictEvent[]>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingShootData, setPendingShootData] = useState<ScheduleShootData | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('60')
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
      notes: undefined // Notes are optional and not validated
    }

    const result = await execute(shootData)
    
    if (result) {
      if (result.hasConflicts && result.conflicts && result.conflicts.length > 0) {
        // Show immediate notification about conflicts
        const conflictCount = result.conflicts.length
        toast.warning(
          `Calendar conflict${conflictCount > 1 ? 's' : ''} detected! ${conflictCount} event${conflictCount > 1 ? 's' : ''} overlap${conflictCount === 1 ? 's' : ''} with your shoot time.`,
          { duration: 6000 }
        )
        
        // Show conflict confirmation dialog instead of creating shoot
        setDetectedConflicts(result.conflicts)
        setPendingShootData(shootData)
        setShowConflictDialog(true)
        
        // Don't close the form or show success - let user decide
        return
        
      } else if (result.success) {
        // Success cases - reset form
        titleField.reset()
        dateField.reset()
        timeField.reset()
        locationField.reset()
        setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
        setSelectedDuration('60')
        
        if (result.message) {
          toast.success(result.message)
        } else if (result.info) {
          toast.success('Shoot scheduled successfully!')
          toast.info(result.info)
        } else {
          toast.success('Shoot scheduled successfully!')
        }
        
        setIsOpen(false)
        router.refresh()
        
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
      toast.success('Shoot scheduled successfully!')
      if (result.warning) {
        toast.warning(result.warning)
      }
      
      setShowConflictDialog(false)
      setDetectedConflicts([])
      setPendingShootData(null)
      
      // Reset form
      titleField.reset()
      dateField.reset()
      timeField.reset()
      locationField.reset()
      setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
      setSelectedDuration('60')
      
      setIsOpen(false)
      router.refresh()
    }
  }

  // Handle user's decision to cancel due to conflicts
  const handleCancelConflict = () => {
    setShowConflictDialog(false)
    setDetectedConflicts([])
    setPendingShootData(null)
    // Keep the form open so user can modify the time
  }

  // Reset form when closed
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setDetectedConflicts([])
      titleField.reset()
      dateField.reset()
      timeField.reset()
      locationField.reset()
      setSelectedClient(contextClient.type === 'client' ? contextClient.name : '')
      setSelectedDuration('60')
    }
  }

  // Get today's date for min date input - use fixed date for consistency
  const today = "2024-01-15"

  return (
    <>
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule New Shoot
          </SheetTitle>
          <SheetDescription>
            Plan a content creation session with your client
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                <SelectTrigger className="h-12 text-base tap-target">
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
                placeholder="Special requirements, equipment needed, shot list ideas..."
                className="min-h-[80px] text-base tap-target resize-none"
                rows={3}
              />
            </div>

            {/* Conflict Display */}
            {detectedConflicts.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">
                      Calendar Conflicts Detected
                    </h4>
                    <div className="space-y-2">
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
                        return (
                          <div key={index} className="text-sm text-yellow-800 bg-yellow-100 rounded p-2">
                            <div className="font-medium">{conflict.title}</div>
                            <div className="text-xs">{startTime} - {endTime}</div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      Your shoot was created but not added to Google Calendar due to these conflicts.
                      Consider rescheduling or manually resolving conflicts in your calendar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex-shrink-0 flex gap-3 p-4 border-t bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 h-12 tap-target"
              disabled={loading}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={handleSubmit}
              className="flex-1 h-12"
              loading={loading}
              loadingText="Scheduling..."
            >
              Schedule Shoot
            </LoadingButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Conflict Confirmation Dialog */}
    {showConflictDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Calendar Conflicts Detected</h3>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              The following events conflict with your scheduled shoot time:
            </p>
            
            <div className="space-y-3">
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
                  <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-red-900 mb-1">{conflict.title}</div>
                        <div className="text-sm text-red-700">
                          <div>{date}</div>
                          <div className="font-medium">{startTime} - {endTime}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>What would you like to do?</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• <strong>Cancel:</strong> Go back and choose a different time</li>
              <li>• <strong>Schedule Anyway:</strong> Create the shoot but it will not be added to your calendar</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelConflict}
              className="flex-1"
              disabled={loading}
            >
              Cancel & Change Time
            </Button>
            <LoadingButton
              onClick={handleForceCreate}
              className="flex-1"
              loading={loading}
              loadingText="Scheduling..."
            >
              Schedule Anyway
            </LoadingButton>
          </div>
        </div>
      </div>
    )}
    </>
  )
} 