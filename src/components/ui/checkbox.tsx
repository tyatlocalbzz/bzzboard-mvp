'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
        e.preventDefault()
        if (onCheckedChange) {
          onCheckedChange(!checked)
        }
      }
    }

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          checked
            ? "bg-blue-600 border-blue-600 text-white"
            : "border-gray-300 bg-white hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {checked && <Check className="h-3 w-3" />}
      </button>
    )
  }
)

Checkbox.displayName = 'Checkbox' 