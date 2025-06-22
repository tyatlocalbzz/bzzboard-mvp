import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface MetadataItem {
  icon: LucideIcon
  text: string
}

interface MetadataListProps {
  items: MetadataItem[]
  className?: string
  maxItemsPerRow?: number
  size?: 'sm' | 'md'
}

export const MetadataList = ({ 
  items, 
  className, 
  maxItemsPerRow = 2,
  size = 'sm'
}: MetadataListProps) => {
  if (items.length === 0) return null

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const gap = size === 'sm' ? 'gap-3' : 'gap-4'

  // Split items into rows based on maxItemsPerRow
  const rows: MetadataItem[][] = []
  for (let i = 0; i < items.length; i += maxItemsPerRow) {
    rows.push(items.slice(i, i + maxItemsPerRow))
  }

  return (
    <div className={cn("space-y-1", textSize, "text-gray-600", className)}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={cn("flex items-center", gap)}>
          {row.map((item, itemIndex) => (
            <div key={itemIndex} className="flex items-center gap-1 flex-1 min-w-0">
              <item.icon className={cn(iconSize, "flex-shrink-0")} />
              <span className="truncate">{item.text}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
} 