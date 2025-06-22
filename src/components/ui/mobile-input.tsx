import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

export interface MobileInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  error?: string
  helperText?: string
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    
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
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 text-base tap-target", // Mobile-optimized height and text size
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500", // Enhanced focus states
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p 
            id={`${inputId}-error`}
            className="text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="text-sm text-gray-600"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

MobileInput.displayName = "MobileInput" 