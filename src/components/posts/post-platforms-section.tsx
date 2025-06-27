'use client'

import { Badge } from '@/components/ui/badge'
import { PLATFORM_OPTIONS } from '@/lib/constants/platforms'

interface PostPlatformsSectionProps {
  platforms: string[]
  className?: string
}

export const PostPlatformsSection = ({ 
  platforms,
  className = ""
}: PostPlatformsSectionProps) => {
  if (!platforms || platforms.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-foreground">Platforms</h3>
      
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => {
          const platformOption = PLATFORM_OPTIONS.find(p => p.name === platform)
          const Icon = platformOption?.icon
          
          return (
            <Badge 
              key={platform} 
              variant="secondary" 
              className="flex items-center gap-1.5 px-2.5 py-1"
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span className="text-xs font-medium">{platform}</span>
            </Badge>
          )
        })}
      </div>
      
      <div className="text-xs text-muted-foreground">
        {platforms.length} platform{platforms.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  )
} 