import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { MetadataList } from "./metadata-list"
import { LucideIcon } from "lucide-react"

interface ListItemProps {
  title: string
  subtitle?: string
  description?: string
  avatar?: {
    text: string
    color?: string
  }
  icon?: LucideIcon
  badges?: Array<{
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }>
  metadata?: Array<{
    icon: LucideIcon
    text: string
  }>
  notes?: string
  action?: React.ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

export const ListItem = ({
  title,
  subtitle,
  description,
  avatar,
  icon: Icon,
  badges = [],
  metadata = [],
  notes,
  action,
  onClick,
  className,
  ariaLabel
}: ListItemProps) => {
  const isClickable = !!onClick
  
  const content = (
    <div className={cn(
      "flex items-start gap-3 p-3",
      isClickable && "cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors",
      className
    )}>
      {/* Avatar or Icon */}
      {avatar && (
        <div 
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0",
            avatar.color || "bg-blue-600"
          )}
        >
          {avatar.text}
        </div>
      )}
      
      {Icon && (
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title and Badges */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          {badges.map((badge, index) => (
            <Badge key={index} variant={badge.variant || 'outline'} className="text-xs">
              {badge.text}
            </Badge>
          ))}
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-gray-600 mb-2">{subtitle}</div>
        )}
        
        {/* Description */}
        {description && (
          <div className="text-xs text-gray-500 mb-2">{description}</div>
        )}
        
        {/* Metadata using the new MetadataList component */}
        {metadata.length > 0 && (
          <MetadataList items={metadata} className="mb-2" />
        )}
        
        {/* Notes */}
        {notes && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            {notes}
          </div>
        )}
      </div>
      
      {/* Action */}
      {action && (
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  )
  
  if (isClickable) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || title}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        className="tap-target"
      >
        {content}
      </div>
    )
  }
  
  return content
} 