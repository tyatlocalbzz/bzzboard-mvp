'use client'

import { useCallback, useState } from 'react'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Mail, Phone, Globe } from 'lucide-react'
import { WizardStepProps } from '@/lib/types/wizard'
import { clientValidation, getValidationError, validateField } from '@/lib/validation/client-validation'

export const BasicInfoStep = ({ data, onUpdate, onValidChange, showValidation = false }: WizardStepProps) => {
  // Track touched state for each field
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const handleFieldChange = useCallback((field: keyof typeof data, value: string) => {
    const updatedData = { [field]: value }
    onUpdate(updatedData)
    
    // Validate the step with new data
    const newData = { ...data, ...updatedData }
    const validation = clientValidation.clientData({
      name: newData.name,
      primaryContactName: newData.primaryContactName,
      primaryContactEmail: newData.primaryContactEmail,
      primaryContactPhone: newData.primaryContactPhone,
      website: newData.website
    })
    
    onValidChange?.(validation.valid)
  }, [data, onUpdate, onValidChange])

  // Handle phone number with formatting using shared utility
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formattedValue = clientValidation.phone.format(rawValue)
    handleFieldChange('primaryContactPhone', formattedValue)
  }, [handleFieldChange])

  // Handle field blur to mark as touched
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
  }, [])

  // Get field validation state
  const getFieldValidationState = (fieldName: string, value: string) => {
    const touched = touchedFields[fieldName] || showValidation
    return validateField(fieldName, value, touched, showValidation)
  }

  // Get validation errors using shared validation
  const getFieldError = (field: 'name' | 'primaryContactName' | 'primaryContactEmail' | 'primaryContactPhone' | 'website'): string | undefined => {
    if (!showValidation && !touchedFields[field]) return undefined
    
    switch (field) {
      case 'name':
        return getValidationError(clientValidation.requiredText(data.name, 'Client name'), showValidation || touchedFields[field])
      case 'primaryContactName':
        return getValidationError(clientValidation.requiredText(data.primaryContactName, 'Primary contact name'), showValidation || touchedFields[field])
      case 'primaryContactEmail':
        return getValidationError(clientValidation.email(data.primaryContactEmail), showValidation || touchedFields[field])
      case 'primaryContactPhone':
        return getValidationError(clientValidation.phone.validate(data.primaryContactPhone || ''), showValidation || touchedFields[field])
      case 'website':
        return getValidationError(clientValidation.website(data.website || ''), showValidation || touchedFields[field])
      default:
    return undefined
  }
  }

  return (
    <div className="space-y-6">
      {/* Form Fields */}
      <div className="space-y-5">
        {/* Client Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900" htmlFor="client-name">
            Client Name *
          </Label>
          <MobileInput
            id="client-name"
            name="clientName"
            value={data.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleFieldBlur('name')}
            placeholder="e.g., Acme Corporation"
            error={getFieldError('name')}
            validationState={getFieldValidationState('name', data.name).state}
            autoComplete="organization"
            autoCapitalize="words"
            spellCheck="false"
            required
            aria-describedby={getFieldError('name') ? 'client-name-error' : undefined}
          />
        </div>

        {/* Primary Contact Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900" htmlFor="contact-name">
            Primary Contact Name *
          </Label>
          <MobileInput
            id="contact-name"
            name="contactName"
            value={data.primaryContactName}
            onChange={(e) => handleFieldChange('primaryContactName', e.target.value)}
            onBlur={() => handleFieldBlur('primaryContactName')}
            placeholder="e.g., John Smith"
            error={getFieldError('primaryContactName')}
            validationState={getFieldValidationState('primaryContactName', data.primaryContactName).state}
            autoComplete="name"
            autoCapitalize="words"
            spellCheck="false"
            required
            aria-describedby={getFieldError('primaryContactName') ? 'contact-name-error' : undefined}
          />
        </div>

        {/* Primary Contact Email */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-1" htmlFor="contact-email">
            <Mail className="h-3 w-3" />
            Primary Contact Email *
          </Label>
          <MobileInput
            id="contact-email"
            name="contactEmail"
            type="email"
            value={data.primaryContactEmail}
            onChange={(e) => handleFieldChange('primaryContactEmail', e.target.value)}
            onBlur={() => handleFieldBlur('primaryContactEmail')}
            placeholder="john@acmecorp.com"
            error={getFieldError('primaryContactEmail')}
            validationState={getFieldValidationState('primaryContactEmail', data.primaryContactEmail).state}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            inputMode="email"
            required
            aria-describedby={getFieldError('primaryContactEmail') ? 'contact-email-error' : undefined}
          />
        </div>

        {/* Primary Contact Phone (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-1" htmlFor="contact-phone">
            <Phone className="h-3 w-3" />
            Primary Contact Phone
          </Label>
          <MobileInput
            id="contact-phone"
            name="contactPhone"
            type="tel"
            value={data.primaryContactPhone || ''}
            onChange={handlePhoneChange}
            onBlur={() => handleFieldBlur('primaryContactPhone')}
            placeholder="(555) 123-4567"
            error={getFieldError('primaryContactPhone')}
            validationState={getFieldValidationState('primaryContactPhone', data.primaryContactPhone || '').state}
            autoComplete="tel"
            inputMode="tel"
            maxLength={14} // Formatted length: (555) 123-4567
            aria-describedby={getFieldError('primaryContactPhone') ? 'contact-phone-error' : 'contact-phone-hint'}
            helperText={undefined}
          />
        </div>

        {/* Website (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 flex items-center gap-1" htmlFor="website">
            <Globe className="h-3 w-3" />
            Website
          </Label>
          <MobileInput
            id="website"
            name="website"
            type="url"
            value={data.website || ''}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            onBlur={() => handleFieldBlur('website')}
            placeholder="example.com"
            error={getFieldError('website')}
            validationState={getFieldValidationState('website', data.website || '').state}
            autoComplete="url"
            autoCapitalize="none"
            spellCheck="false"
            inputMode="url"
            aria-describedby={getFieldError('website') ? 'website-error' : undefined}
          />
        </div>
      </div>
    </div>
  )
} 