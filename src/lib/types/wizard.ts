import { ClientStorageSettings } from './settings'

/**
 * Unified wizard data interface used across all client wizard steps
 * Eliminates duplication of interface definitions in each step component
 */
export interface WizardData {
  // Step 1: Basic Information (Required)
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
  website?: string
  
  // Step 2: Social Media (Optional)
  socialMedia: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  
  // Step 3: Storage Setup (Optional)
  storageSettings?: Partial<ClientStorageSettings>
  
  // Additional optional fields
  notes?: string
}

/**
 * Props interface for wizard step components
 */
export interface WizardStepProps {
  data: WizardData
  onUpdate: (updates: Partial<WizardData>) => void
  onValidChange?: (isValid: boolean) => void
  showValidation?: boolean
}

/**
 * Utility function to create empty wizard data
 */
export const createEmptyWizardData = (): WizardData => ({
  name: '',
  primaryContactName: '',
  primaryContactEmail: '',
  socialMedia: {},
  storageSettings: {}
})

/**
 * Utility function to check if wizard has unsaved changes
 */
export const hasUnsavedChanges = (data: WizardData): boolean => {
  return !!(
    data.name.trim() || 
    data.primaryContactName.trim() || 
    data.primaryContactEmail.trim() ||
    data.primaryContactPhone?.trim() ||
    data.website?.trim() ||
    data.notes?.trim() ||
    Object.values(data.socialMedia).some(value => value?.trim()) ||
    (data.storageSettings && Object.keys(data.storageSettings).length > 0)
  )
} 