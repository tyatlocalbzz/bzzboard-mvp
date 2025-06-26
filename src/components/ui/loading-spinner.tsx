import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  color?: 'current' | 'muted' | 'primary' | 'destructive'
}

const sizeVariants = {
  sm: "h-3 w-3",
  md: "h-4 w-4", 
  lg: "h-6 w-6"
}

const colorVariants = {
  current: "border-current",
  muted: "border-muted-foreground",
  primary: "border-primary",
  destructive: "border-destructive"
}

export const LoadingSpinner = ({ 
  size = 'md', 
  className,
  color = 'current'
}: LoadingSpinnerProps) => {
  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-b-2",
        sizeVariants[size],
        colorVariants[color],
        className
      )}
    />
  )
} 