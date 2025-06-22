import * as React from "react"
import { cn } from "@/lib/utils"

interface ContextIndicatorProps {
  title: string
  subtitle?: string
  metadata?: string
  className?: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

const colorVariants = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700"
}

const subtitleColorVariants = {
  blue: "text-blue-600",
  green: "text-green-600", 
  purple: "text-purple-600",
  orange: "text-orange-600"
}

const metadataColorVariants = {
  blue: "text-blue-500",
  green: "text-green-500",
  purple: "text-purple-500", 
  orange: "text-orange-500"
}

export const ContextIndicator = ({
  title,
  subtitle,
  metadata,
  className,
  color = 'blue'
}: ContextIndicatorProps) => {
  return (
    <div className={cn(
      "border rounded-lg p-3",
      colorVariants[color],
      className
    )}>
      <div className="text-xs font-medium">
        {title}
      </div>
      {subtitle && (
        <div className={cn("flex items-center justify-between")}>
          <div className={cn("text-xs mt-1", subtitleColorVariants[color])}>
            {subtitle}
          </div>
          {metadata && (
            <div className={cn("text-xs", metadataColorVariants[color])}>
              {metadata}
            </div>
          )}
        </div>
      )}
      {subtitle && !metadata && (
        <div className={cn("text-xs mt-1", subtitleColorVariants[color])}>
          {subtitle}
        </div>
      )}
    </div>
  )
} 