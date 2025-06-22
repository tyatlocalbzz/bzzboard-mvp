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
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  green: "bg-green-50 text-green-600 border-green-100", 
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  red: "bg-red-50 text-red-600 border-red-100",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-100"
}

const textColorVariants = {
  blue: "text-blue-700",
  green: "text-green-700",
  purple: "text-purple-700", 
  orange: "text-orange-700",
  red: "text-red-700",
  yellow: "text-yellow-700"
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