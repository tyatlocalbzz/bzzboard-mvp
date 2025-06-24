'use client'

import { useState, ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useClient } from '@/contexts/client-context'
import { ClientData } from '@/lib/types/client'
import { WizardData, createEmptyWizardData, hasUnsavedChanges } from '@/lib/types/wizard'
import { clientValidation } from '@/lib/validation/client-validation'
import { BasicInfoStep } from './wizard-steps/basic-info-step'
import { SocialMediaStep } from './wizard-steps/social-media-step'
import { StorageSetupStep } from './wizard-steps/storage-setup-step'
import { UserPlus, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

interface AddClientWizardProps {
  children: ReactNode
  onSuccess?: (client: ClientData) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const STEPS = [
  { id: 1, title: 'Basic Information', required: true },
  { id: 2, title: 'Social Media', required: false },
  { id: 3, title: 'Storage Setup', required: false }
]

export const AddClientWizard = ({ 
  children, 
  onSuccess, 
  open: controlledOpen, 
  onOpenChange 
}: AddClientWizardProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalOpen(open)
    }
  }
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>(createEmptyWizardData())

  const router = useRouter()
  const { setSelectedClient } = useClient()

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }))
  }

  // Handle sheet close attempts
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges(wizardData)) {
      setShowConfirmDialog(true)
    } else {
      handleConfirmedClose()
    }
  }

  // Actually close the wizard
  const handleConfirmedClose = () => {
    // Reset wizard state
    setCurrentStep(1)
    setCompletedSteps(new Set())
    setSkippedSteps(new Set())
    setShowValidation(false)
    setWizardData(createEmptyWizardData())
    setShowConfirmDialog(false)
    setIsOpen(false)
  }

  const markStepCompleted = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]))
    setSkippedSteps(prev => {
      const newSkipped = new Set(prev)
      newSkipped.delete(step)
      return newSkipped
    })
  }

  const markStepSkipped = (step: number) => {
    setSkippedSteps(prev => new Set([...prev, step]))
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev)
      newCompleted.delete(step)
      return newCompleted
    })
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        const validation = clientValidation.clientData({
          name: wizardData.name,
          primaryContactName: wizardData.primaryContactName,
          primaryContactEmail: wizardData.primaryContactEmail,
          primaryContactPhone: wizardData.primaryContactPhone,
          website: wizardData.website
        })
        return validation.valid
      case 2:
        return true // Always valid since it's optional
      case 3:
        return true // Always valid since it's optional
      default:
        return false
    }
  }

  const handleNext = () => {
    // Trigger validation for step 1
    if (currentStep === 1) {
      setShowValidation(true)
      // Check if step is valid after triggering validation
      if (!isStepValid(currentStep)) {
        return // Don't proceed if validation fails
      }
    }
    
    if (isStepValid(currentStep)) {
      markStepCompleted(currentStep)
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1)
        setShowValidation(false) // Reset validation for next step
      }
    }
  }

  const handleSkip = () => {
    markStepSkipped(currentStep)
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    if (!isStepValid(1)) {
      toast.error('Please complete the required basic information')
      setCurrentStep(1)
      return
    }

    try {
      setLoading(true)
      
      // Create the client
      const clientResponse = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.name,
          primaryContactName: wizardData.primaryContactName,
          primaryContactEmail: wizardData.primaryContactEmail,
          primaryContactPhone: wizardData.primaryContactPhone,
          website: wizardData.website,
          socialMedia: wizardData.socialMedia,
          notes: wizardData.notes
        })
      })

      if (!clientResponse.ok) {
        const errorData = await clientResponse.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      const clientData = await clientResponse.json()
      const newClient = clientData.client

      // Create storage settings if configured
      if (wizardData.storageSettings && Object.keys(wizardData.storageSettings).length > 0) {
        const storageResponse = await fetch(`/api/client-settings/${newClient.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: parseInt(newClient.id),
            clientName: newClient.name,
            ...wizardData.storageSettings
          })
        })

        if (!storageResponse.ok) {
          console.warn('Failed to create storage settings, but client was created successfully')
        }
      }

      toast.success(`Client "${newClient.name}" created successfully!`)
      
      // Select the new client
      setSelectedClient({
        id: newClient.id,
        name: newClient.name,
        type: 'client' as const
      })
      
      // Reset wizard state
      setCurrentStep(1)
      setCompletedSteps(new Set())
      setSkippedSteps(new Set())
      setShowValidation(false)
      setWizardData(createEmptyWizardData())
      
      // Close wizard
      setIsOpen(false)
      
      // Refresh the page to load new client data
      router.refresh()
      
      // Call success callback if provided
      onSuccess?.(newClient)
      
    } catch (error) {
      console.error('Error creating client:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={wizardData}
            onUpdate={updateWizardData}
            onValidChange={() => {
              // Update validation state if needed
            }}
            showValidation={showValidation}
          />
        )
      case 2:
        return (
          <SocialMediaStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        )
      case 3:
        return (
          <StorageSetupStep
            data={wizardData}
            onUpdate={updateWizardData}
          />
        )
      default:
        return null
    }
  }

  const getProgressPercentage = () => {
    const totalSteps = STEPS.length
    const completedCount = completedSteps.size + skippedSteps.size
    return Math.round((completedCount / totalSteps) * 100)
  }

  const isLastStep = currentStep === STEPS.length
  const currentStepData = STEPS.find(step => step.id === currentStep)

  return (
    <>
      <Sheet 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // Trying to close the sheet
            handleCloseAttempt()
          } else {
            setIsOpen(open)
          }
        }}
      >
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] max-h-[700px] flex flex-col"
          onInteractOutside={(e) => {
            // Prevent closing by clicking outside
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key
            e.preventDefault()
            handleCloseAttempt()
          }}
        >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Client
          </SheetTitle>
        </SheetHeader>
        
        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="font-medium text-gray-900">
              Step {currentStep} of {STEPS.length}: {currentStepData?.title}
            </span>
            <span className="text-gray-500 text-xs">
              {getProgressPercentage()}% complete
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="h-1.5" />
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="pb-4">
            {getCurrentStepComponent()}
          </div>
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t bg-white">
          <div className="flex gap-3">
            {/* Back Button */}
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-12 tap-target"
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            {/* Cancel Button (only on first step) */}
            {currentStep === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAttempt}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
            )}

            {/* Skip Button (only for optional steps) */}
            {!currentStepData?.required && !isLastStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="h-12 tap-target"
                disabled={loading}
              >
                Do Later
              </Button>
            )}

            {/* Next/Finish Button */}
            {isLastStep ? (
              <LoadingButton
                onClick={handleFinish}
                loading={loading}
                loadingText="Creating..."
                className="flex-1 h-12"
                disabled={!isStepValid(1)} // Always require step 1 to be valid
              >
                Create Client
              </LoadingButton>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isStepValid(currentStep) || loading}
                className="flex-1 h-12 tap-target"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Unsaved Changes
          </DialogTitle>
          <DialogDescription>
            You have unsaved changes that will be lost if you close the wizard. 
            Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConfirmDialog(false)}
          >
            Keep Editing
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmedClose}
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
} 