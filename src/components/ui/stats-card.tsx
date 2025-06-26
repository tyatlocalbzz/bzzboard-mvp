import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow'
  className?: string
}

const colorVariants = {
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
  green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800", 
  purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800",
  orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800",
  red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800",
  yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800"
}

const textColorVariants = {
  blue: "text-blue-700 dark:text-blue-300",
  green: "text-green-700 dark:text-green-300",
  purple: "text-purple-700 dark:text-purple-300", 
  orange: "text-orange-700 dark:text-orange-300",
  red: "text-red-700 dark:text-red-300",
  yellow: "text-yellow-700 dark:text-yellow-300"
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  className 
}: StatsCardProps) => {
  return (
    <div className={cn(
      "p-3 rounded-lg text-center border",
      colorVariants[color],
      className
    )}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className="h-4 w-4" />
        <div className="text-lg font-bold">{value}</div>
      </div>
      <div className={cn("text-xs", textColorVariants[color])}>
        {title}
      </div>
    </div>
  )
} 