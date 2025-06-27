'use client'

import { Badge } from '@/components/ui/badge'
import { Camera } from 'lucide-react'

interface PostShotListSectionProps {
  shotList: string[]
  className?: string
}

export const PostShotListSection = ({ 
  shotList,
  className = ""
}: PostShotListSectionProps) => {
  if (!shotList || shotList.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Shot List
        </h3>
        <Badge variant="outline" className="text-xs">
          {shotList.length} shot{shotList.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {shotList.map((shot, index) => (
          <div 
            key={index} 
            className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                {shot}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 