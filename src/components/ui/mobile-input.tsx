import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { ValidationState } from "@/lib/validation/client-validation"

export interface MobileInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  error?: string
  helperText?: string
  validationState?: ValidationState
  showValidationIcon?: boolean
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    validationState = 'idle',
    showValidationIcon = true,
    id, 
    name, 
    ...props 
  }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`
    
    // Generate proper aria-describedby
    const getAriaDescribedBy = () => {
      const descriptions = []
      if (error) descriptions.push(errorId)
      else if (helperText) descriptions.push(helperId)
      if (props['aria-describedby']) descriptions.push(props['aria-describedby'])
      return descriptions.length > 0 ? descriptions.join(' ') : undefined
    }

    // Get validation icon based on state
    const getValidationIcon = () => {
      if (!showValidationIcon || validationState === 'idle') return null
      
      switch (validationState) {
        case 'validating':
          return <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        case 'valid':
          return <Check className="h-4 w-4 text-green-500" />
        case 'invalid':
          return <AlertCircle className="h-4 w-4 text-red-500" />
        default:
          return null
      }
    }

    // Get border color based on validation state
    const getBorderClass = () => {
      if (error || validationState === 'invalid') {
        return "border-red-500 focus:border-red-500 focus:ring-red-500"
      }
      if (validationState === 'valid') {
        return "border-green-500 focus:border-green-500 focus:ring-green-500"
      }
      return "focus:ring-blue-500 focus:border-blue-500"
    }
    
    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-gray-900 block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            name={name}
            className={cn(
              "h-12 text-base tap-target", // Mobile-optimized height and text size
              "transition-colors duration-200", // Smooth transitions
              getBorderClass(),
              showValidationIcon && validationState !== 'idle' && "pr-10", // Add padding for icon
              className
            )}
            aria-invalid={error || validationState === 'invalid' ? 'true' : 'false'}
            aria-describedby={getAriaDescribedBy()}
            {...props}
          />
          
          {/* Validation Icon */}
          {showValidationIcon && validationState !== 'idle' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {getValidationIcon()}
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <p 
            id={errorId}
            className="text-sm text-red-600 flex items-start gap-1"
            role="alert"
            aria-live="polite"
          >
            <span className="inline-block w-1 h-1 bg-red-600 rounded-full mt-2 flex-shrink-0" />
            {error}
          </p>
        )}
        
        {/* Helper Text */}
        {helperText && !error && (
          <p 
            id={helperId}
            className={cn(
              "text-sm",
              validationState === 'valid' ? "text-green-600" : "text-gray-600"
            )}
          >
            {helperText}
          </p>
        )}
        
        {/* Success Message for Valid State */}
        {validationState === 'valid' && !error && !helperText && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Looks good!
          </p>
        )}
      </div>
    )
  }
)

MobileInput.displayName = "MobileInput" 