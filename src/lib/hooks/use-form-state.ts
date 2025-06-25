import { useReducer, useCallback } from 'react'

// Generic form state management hook
export interface FormState<T> {
  data: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isDirty: boolean
}

type FormAction<T> = 
  | { type: 'SET_FIELD'; field: keyof T; value: T[keyof T] }
  | { type: 'SET_FIELDS'; fields: Partial<T> }
  | { type: 'SET_ERROR'; field: keyof T; error: string }
  | { type: 'CLEAR_ERROR'; field: keyof T }
  | { type: 'SET_ERRORS'; errors: Partial<Record<keyof T, string>> }
  | { type: 'TOUCH_FIELD'; field: keyof T }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET'; initialData: T }

const formStateReducer = <T>(state: FormState<T>, action: FormAction<T>): FormState<T> => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        isDirty: true,
        errors: { ...state.errors, [action.field]: undefined }
      }
    
    case 'SET_FIELDS':
      return {
        ...state,
        data: { ...state.data, ...action.fields },
        isDirty: true
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      }
    
    case 'CLEAR_ERROR':
      const newErrors = { ...state.errors }
      delete newErrors[action.field]
      return {
        ...state,
        errors: newErrors
      }
    
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors
      }
    
    case 'TOUCH_FIELD':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true }
      }
    
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting
      }
    
    case 'RESET':
      return {
        data: action.initialData,
        errors: {},
        touched: {},
        isSubmitting: false,
        isDirty: false
      }
    
    default:
      return state
  }
}

export const useFormState = <T>(initialData: T) => {
  const [state, dispatch] = useReducer(formStateReducer<T>, {
    data: initialData,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false
  })

  const setField = useCallback((field: keyof T, value: T[keyof T]) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const setFields = useCallback((fields: Partial<T>) => {
    dispatch({ type: 'SET_FIELDS', fields })
  }, [])

  const setError = useCallback((field: keyof T, error: string) => {
    dispatch({ type: 'SET_ERROR', field, error })
  }, [])

  const clearError = useCallback((field: keyof T) => {
    dispatch({ type: 'CLEAR_ERROR', field })
  }, [])

  const setErrors = useCallback((errors: Partial<Record<keyof T, string>>) => {
    dispatch({ type: 'SET_ERRORS', errors })
  }, [])

  const touchField = useCallback((field: keyof T) => {
    dispatch({ type: 'TOUCH_FIELD', field })
  }, [])

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting })
  }, [])

  const reset = useCallback((newInitialData?: T) => {
    dispatch({ type: 'RESET', initialData: newInitialData || initialData })
  }, [initialData])

  const validateField = useCallback((field: keyof T, validator: (value: T[keyof T]) => string | undefined) => {
    const error = validator(state.data[field])
    if (error) {
      dispatch({ type: 'SET_ERROR', field, error })
      return false
    } else {
      dispatch({ type: 'CLEAR_ERROR', field })
      return true
    }
  }, [state.data])

  return {
    ...state,
    setField,
    setFields,
    setError,
    clearError,
    setErrors,
    touchField,
    setSubmitting,
    reset,
    validateField
  }
} 