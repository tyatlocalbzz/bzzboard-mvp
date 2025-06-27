export interface ValidationResult {
  valid: boolean
  error?: string
}

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

export interface FieldValidationResult extends ValidationResult {
  state: ValidationState
  touched?: boolean
}

/**
 * Shared validation utilities for client-related forms
 * Eliminates duplication across wizard steps, settings, and API routes
 */
export const clientValidation = {
  /**
   * Validate email address with comprehensive regex
   */
  email: (email: string): ValidationResult => {
    if (!email || !email.trim()) {
      return { valid: false, error: 'Email address is required' }
    }
    
    // Comprehensive email validation regex (matches RFC 5322 standard)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    return emailRegex.test(email.trim()) 
      ? { valid: true } 
      : { valid: false, error: 'Please enter a valid email address' }
  },

  /**
   * Validate optional email (can be empty)
   */
  optionalEmail: (email: string): ValidationResult => {
    if (!email || !email.trim()) {
      return { valid: true } // Optional field
    }
    return clientValidation.email(email)
  },

  /**
   * Phone number utilities
   */
  phone: {
    /**
     * Format phone number with US formatting: (555) 123-4567
     */
    format: (value: string): string => {
      // Remove all non-numeric characters
      const cleaned = value.replace(/\D/g, '')
      
      // Don't format if empty
      if (!cleaned) return ''
      
      // Format based on length
      if (cleaned.length <= 3) {
        return cleaned
      } else if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
      } else if (cleaned.length <= 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      } else {
        // Limit to 10 digits for US phone numbers
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
      }
    },

    /**
     * Extract numeric digits from formatted phone number
     */
    extractDigits: (formatted: string): string => {
      return formatted.replace(/\D/g, '')
    },

    /**
     * Validate phone number (optional but if provided, should be valid)
     */
    validate: (phone: string): ValidationResult => {
      if (!phone || !phone.trim()) {
        return { valid: true } // Optional field
      }
      
      const digits = clientValidation.phone.extractDigits(phone)
      return digits.length === 10 
        ? { valid: true }
        : { valid: false, error: 'Please enter a valid 10-digit phone number' }
    }
  },

  /**
   * Website URL validation
   */
  website: (website: string): ValidationResult => {
    if (!website || !website.trim()) {
      return { valid: true } // Optional field
    }
    
    const trimmed = website.trim()
    
    // Basic check for valid domain format (must contain at least one dot)
    if (!trimmed.includes('.')) {
      return { valid: false, error: 'Website must be a valid domain (e.g., example.com)' }
    }
    
    // Additional basic validation - no spaces, reasonable length
    if (trimmed.includes(' ') || trimmed.length > 255) {
      return { valid: false, error: 'Please enter a valid website URL' }
    }
    
    return { valid: true }
  },

  /**
   * Required text field validation
   */
  requiredText: (value: string, fieldName: string): ValidationResult => {
    if (!value || !value.trim()) {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true }
  },

  /**
   * Social media handle validation (optional)
   */
  socialHandle: (handle: string): ValidationResult => {
    if (!handle || !handle.trim()) {
      return { valid: true } // Optional field
    }
    
    const trimmed = handle.trim()
    
    // Basic validation - reasonable length, no obvious invalid characters
    if (trimmed.length > 100) {
      return { valid: false, error: 'Handle is too long' }
    }
    
    return { valid: true }
  },

  /**
   * Password validation
   */
  password: (password: string): ValidationResult => {
    if (!password || !password.trim()) {
      return { valid: false, error: 'Password is required' }
    }
    
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' }
    }
    
    return { valid: true }
  },

  /**
   * Confirm password validation
   */
  confirmPassword: (password: string, confirmPassword: string): ValidationResult => {
    if (!confirmPassword || !confirmPassword.trim()) {
      return { valid: false, error: 'Please confirm your password' }
    }
    
    if (password !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match' }
    }
    
    return { valid: true }
  },

  /**
   * Comprehensive client data validation
   * Used by forms and API routes
   */
  clientData: (data: {
    name?: string
    primaryContactName?: string
    primaryContactEmail?: string
    primaryContactPhone?: string
    website?: string
  }): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}

    // Required fields
    const nameValidation = clientValidation.requiredText(data.name || '', 'Client name')
    if (!nameValidation.valid) errors.name = nameValidation.error!

    const contactNameValidation = clientValidation.requiredText(data.primaryContactName || '', 'Primary contact name')
    if (!contactNameValidation.valid) errors.primaryContactName = contactNameValidation.error!

    const emailValidation = clientValidation.email(data.primaryContactEmail || '')
    if (!emailValidation.valid) errors.primaryContactEmail = emailValidation.error!

    // Optional fields
    const phoneValidation = clientValidation.phone.validate(data.primaryContactPhone || '')
    if (!phoneValidation.valid) errors.primaryContactPhone = phoneValidation.error!

    const websiteValidation = clientValidation.website(data.website || '')
    if (!websiteValidation.valid) errors.website = websiteValidation.error!

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  },

  /**
   * User profile data validation
   * Used by profile forms and API routes
   */
  userProfile: (data: {
    name?: string
    email?: string
  }): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}

    // Required fields
    const nameValidation = clientValidation.requiredText(data.name || '', 'Full name')
    if (!nameValidation.valid) errors.name = nameValidation.error!

    const emailValidation = clientValidation.email(data.email || '')
    if (!emailValidation.valid) errors.email = emailValidation.error!

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  },

  /**
   * Password change validation
   * Used by password change forms and API routes
   */
  passwordChange: (data: {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}

    // Required fields
    const currentPasswordValidation = clientValidation.requiredText(data.currentPassword || '', 'Current password')
    if (!currentPasswordValidation.valid) errors.currentPassword = currentPasswordValidation.error!

    const newPasswordValidation = clientValidation.password(data.newPassword || '')
    if (!newPasswordValidation.valid) errors.newPassword = newPasswordValidation.error!

    const confirmPasswordValidation = clientValidation.confirmPassword(data.newPassword || '', data.confirmPassword || '')
    if (!confirmPasswordValidation.valid) errors.confirmPassword = confirmPasswordValidation.error!

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }
}

/**
 * Utility function to get error message for a specific field
 */
export const getValidationError = (
  validationResult: ValidationResult, 
  showValidation: boolean = true
): string | undefined => {
  return showValidation && !validationResult.valid ? validationResult.error : undefined
}

/**
 * Enhanced field validation with state management
 */
export const getFieldValidationState = (
  value: string,
  validator: (value: string) => ValidationResult,
  touched: boolean = false,
  showValidation: boolean = false
): FieldValidationResult => {
  const validation = validator(value)
  
  let state: ValidationState = 'idle'
  
  if (touched || showValidation) {
    if (validation.valid) {
      state = 'valid'
    } else {
      state = 'invalid'
    }
  }
  
  return {
    ...validation,
    state,
    touched
  }
}

/**
 * Real-time field validation for forms
 */
export const validateField = (
  fieldName: string,
  value: string,
  touched: boolean = false,
  showValidation: boolean = false
): FieldValidationResult => {
  let validator: (value: string) => ValidationResult
  
  switch (fieldName) {
    case 'name':
    case 'clientName':
      validator = (v) => clientValidation.requiredText(v, 'Name')
      break
    case 'title':
      validator = (v) => clientValidation.requiredText(v, 'Title')
      break
    case 'primaryContactName':
    case 'contactName':
      validator = (v) => clientValidation.requiredText(v, 'Contact name')
      break
    case 'email':
    case 'primaryContactEmail':
    case 'contactEmail':
      validator = clientValidation.email
      break
    case 'phone':
    case 'primaryContactPhone':
    case 'contactPhone':
      validator = clientValidation.phone.validate
      break
    case 'website':
      validator = clientValidation.website
      break
    case 'currentPassword':
      validator = (v) => clientValidation.requiredText(v, 'Current password')
      break
    case 'newPassword':
    case 'password':
      validator = clientValidation.password
      break
    default:
      validator = () => ({ valid: true })
  }
  
  return getFieldValidationState(value, validator, touched, showValidation)
} 