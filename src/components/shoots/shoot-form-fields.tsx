'use client'

import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Users } from 'lucide-react'
import { getTodayInputFormat } from '@/lib/utils/date-time'

interface Client {
  id: number | string
  name: string
  type: string
}

interface FieldValidationResult {
  valid: boolean
  error?: string
  state: 'idle' | 'validating' | 'valid' | 'invalid'
}

interface FieldValidation {
  value: string
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleBlur: (event: React.FocusEvent<HTMLInputElement>) => void
  validationResult: FieldValidationResult
}

interface ShootFormFieldsProps {
  // Field validation objects
  titleField: FieldValidation
  dateField: FieldValidation
  timeField: FieldValidation
  locationField: FieldValidation
  
  // Form state
  selectedClient: string
  onClientChange: (client: string) => void
  selectedDuration: string
  onDurationChange: (duration: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  
  // Data
  availableClients: Client[]
  
  // UI state
  isOpen: boolean
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' }
]

export const ShootFormFields = ({
  titleField,
  dateField,
  timeField,
  locationField,
  selectedClient,
  onClientChange,
  selectedDuration,
  onDurationChange,
  notes,
  onNotesChange,
  availableClients,
  isOpen
}: ShootFormFieldsProps) => {
  const today = getTodayInputFormat()

  return (
    <div className="space-y-4">
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
          onValueChange={onClientChange}
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
        <Select 
          value={selectedDuration} 
          onValueChange={onDurationChange}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
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
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Special requirements, equipment needed, shot list ideas..."
          className="min-h-[80px] resize-none"
          rows={3}
        />
      </div>
    </div>
  )
} 