import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label?: string
    onClick?: () => void
    children?: React.ReactNode
  }
  className?: string
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) => {
  return (
    <div className={cn("text-center py-8", className)}>
      <Icon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      {action && (
        action.children ? (
          action.children
        ) : action.label ? (
          <Button onClick={action.onClick} className="tap-target">
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  )
} 