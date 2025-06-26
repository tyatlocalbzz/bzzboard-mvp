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
  blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
  purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
  orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
}

const subtitleColorVariants = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400", 
  purple: "text-purple-600 dark:text-purple-400",
  orange: "text-orange-600 dark:text-orange-400"
}

const metadataColorVariants = {
  blue: "text-blue-500 dark:text-blue-500",
  green: "text-green-500 dark:text-green-500",
  purple: "text-purple-500 dark:text-purple-500", 
  orange: "text-orange-500 dark:text-orange-500"
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