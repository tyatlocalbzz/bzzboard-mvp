import { useState, useEffect, useCallback } from 'react'
import { validateField, FieldValidationResult, ValidationState } from '@/lib/validation/client-validation'

interface UseFieldValidationOptions {
  fieldName: string
  initialValue?: string
  debounceMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
  showValidation?: boolean
}

interface UseFieldValidationReturn {
  value: string
  validationResult: FieldValidationResult
  touched: boolean
  setValue: (value: string) => void
  setTouched: (touched: boolean) => void
  validate: () => FieldValidationResult
  reset: () => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const useFieldValidation = ({
  fieldName,
  initialValue = '',
  debounceMs = 300,
  validateOnChange = true,
  validateOnBlur = true,
  showValidation = false
}: UseFieldValidationOptions): UseFieldValidationReturn => {
  const [value, setValue] = useState(initialValue)
  const [touched, setTouched] = useState(false)
  const [validationResult, setValidationResult] = useState<FieldValidationResult>({
    valid: true,
    state: 'idle' as ValidationState,
    touched: false
  })

  // Debounced validation function
  const validateWithDebounce = useCallback(() => {
    const timeoutId = setTimeout(() => {
      const result = validateField(fieldName, value, touched, showValidation)
      setValidationResult(result)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [fieldName, value, touched, showValidation, debounceMs])

  // Immediate validation function
  const validate = useCallback((): FieldValidationResult => {
    const result = validateField(fieldName, value, touched, showValidation)
    setValidationResult(result)
    return result
  }, [fieldName, value, touched, showValidation])

  // Effect for debounced validation on value change
  useEffect(() => {
    if (validateOnChange && touched) {
      // Set validating state immediately
      setValidationResult(prev => ({ ...prev, state: 'validating' }))
      
      const cleanup = validateWithDebounce()
      return cleanup
    }
  }, [value, validateOnChange, touched, validateWithDebounce])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    
    if (validateOnChange && !touched) {
      setTouched(true)
    }
  }, [validateOnChange, touched])

  // Handle input blur
  const handleBlur = useCallback(() => {
    if (!touched) {
      setTouched(true)
    }
    
    if (validateOnBlur) {
      validate()
    }
  }, [touched, validateOnBlur, validate])

  // Reset function
  const reset = useCallback(() => {
    setValue(initialValue)
    setTouched(false)
    setValidationResult({
      valid: true,
      state: 'idle',
      touched: false
    })
  }, [initialValue])

  return {
    value,
    validationResult,
    touched,
    setValue,
    setTouched,
    validate,
    reset,
    handleChange,
    handleBlur
  }
} 