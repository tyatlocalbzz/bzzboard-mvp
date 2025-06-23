'use client'

import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone } from 'lucide-react'

interface WizardData {
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
  website?: string
  socialMedia: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  notes?: string
}

interface BasicInfoStepProps {
  data: WizardData
  onUpdate: (data: Partial<WizardData>) => void
  onValidChange?: (valid: boolean) => void
}

export const BasicInfoStep = ({ data, onUpdate, onValidChange }: BasicInfoStepProps) => {
  const handleFieldChange = (field: keyof WizardData, value: string) => {
    const updatedData = { [field]: value }
    onUpdate(updatedData)
    
    // Check if step is valid
    const newData = { ...data, ...updatedData }
    const isValid = !!(newData.name && newData.primaryContactName && newData.primaryContactEmail)
    onValidChange?.(isValid)
  }

  const validateEmail = (email: string): string | undefined => {
    if (!email) return undefined
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address'
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        <p className="text-sm text-gray-600">
          Let&apos;s start with the essential details to get your client set up
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Client Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">
            Client Name *
          </Label>
          <MobileInput
            value={data.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="e.g., Acme Corporation"
            required
          />
          <p className="text-xs text-gray-500">
            This is how the client will appear throughout the app
          </p>
        </div>

        {/* Primary Contact Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">
            Primary Contact Name *
          </Label>
          <MobileInput
            value={data.primaryContactName}
            onChange={(e) => handleFieldChange('primaryContactName', e.target.value)}
            placeholder="e.g., John Smith"
            required
          />
        </div>

        {/* Primary Contact Email */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Primary Contact Email *
          </Label>
          <MobileInput
            type="email"
            value={data.primaryContactEmail}
            onChange={(e) => handleFieldChange('primaryContactEmail', e.target.value)}
            placeholder="john@acmecorp.com"
            error={data.primaryContactEmail ? validateEmail(data.primaryContactEmail) : undefined}
            required
          />
          <p className="text-xs text-gray-500">
            We&apos;ll use this for project communications and file sharing
          </p>
        </div>

        {/* Primary Contact Phone (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Primary Contact Phone
            <span className="text-gray-400 text-xs">(optional)</span>
          </Label>
          <MobileInput
            type="tel"
            value={data.primaryContactPhone || ''}
            onChange={(e) => handleFieldChange('primaryContactPhone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Why do we need this information?
            </h4>
            <p className="text-xs text-blue-800">
              This basic information helps us organize your projects, communicate effectively, 
              and set up proper file sharing. You&apos;ll be able to add more details in the next steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 