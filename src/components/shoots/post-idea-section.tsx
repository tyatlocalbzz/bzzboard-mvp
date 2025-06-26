'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MobileInput } from '@/components/ui/mobile-input'
import { FormSheet } from '@/components/ui/form-sheet'
import { ShotChecklistItem } from './shot-checklist-item'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { PLATFORM_ICONS } from '@/lib/constants/platforms'
import type { PostIdea } from '@/lib/types/shoots'

interface PostIdeaSectionProps {
  postIdea: PostIdea
  onShotToggle: (shotId: number) => void
  onShotEdit: (shotId: number, text: string, notes?: string) => void
  onPostIdeaClick: (postIdeaId: number) => void
  onAddShot?: (postIdeaId: number, shotText: string, notes?: string) => void
  defaultExpanded?: boolean
}

export const PostIdeaSection = ({
  postIdea,
  onShotToggle,
  onShotEdit,
  onPostIdeaClick,
  onAddShot,
  defaultExpanded = true
}: PostIdeaSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [loading, setLoading] = useState(false)
  const [isAddShotOpen, setIsAddShotOpen] = useState(false)
  
  const completedShots = postIdea.shots.filter(shot => shot.completed)
  const totalShots = postIdea.shots.length
  const progressPercentage = totalShots > 0 ? (completedShots.length / totalShots) * 100 : 0

  const handleAddShot = async (formData: FormData) => {
    if (!onAddShot) return
    
    setLoading(true)
    try {
      const shotText = formData.get('shotText') as string
      const notes = formData.get('notes') as string
      
      await onAddShot(postIdea.id, shotText, notes || undefined)
      setIsAddShotOpen(false) // Close the form after successful submission
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Post Idea Header */}
      <div className="space-y-2">
        {/* Clickable header for post idea details */}
        <Button
          variant="ghost"
          className="w-full p-3 h-auto justify-start text-left hover:bg-accent/50"
          onClick={() => onPostIdeaClick(postIdea.id)}
        >
          <div className="flex items-center gap-3 w-full">
            {/* Post idea info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {postIdea.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {/* Platform icons */}
                <div className="flex items-center gap-1">
                  {postIdea.platforms.slice(0, 3).map((platform) => {
                    const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS]
                    return Icon ? <Icon key={platform} className="h-3 w-3" /> : null
                  })}
                  {postIdea.platforms.length > 3 && (
                    <span className="text-xs">+{postIdea.platforms.length - 3}</span>
                  )}
                </div>
                <span>•</span>
                <span className="capitalize">{postIdea.contentType}</span>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </Button>
        
        {/* Expand/collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              <span className="text-xs">Hide shots</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-1" />
              <span className="text-xs">Show shots ({totalShots})</span>
            </>
          )}
        </Button>
      </div>

      {/* Shots List */}
      {isExpanded && (
        <div className="pl-8 space-y-1">
          {postIdea.shots.map((shot) => (
            <ShotChecklistItem
              key={shot.id}
              shot={shot}
              onToggle={onShotToggle}
              onEdit={onShotEdit}
            />
          ))}
          
          {postIdea.shots.length === 0 && (
            <div className="text-sm text-muted-foreground italic py-2">
              No shots defined for this post idea
            </div>
          )}
          
          {/* Add Shot Button - Only show if onAddShot is provided */}
          {onAddShot && (
            <div className="pt-2">
              <FormSheet
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Shot
                  </Button>
                }
                formContent={
                  <>
                    <MobileInput
                      name="shotText"
                      label="Shot Description"
                      placeholder="Describe the shot you want to capture..."
                      required
                    />
                    
                    <MobileInput
                      name="notes"
                      label="Notes (Optional)"
                      placeholder="Any additional notes or requirements..."
                    />
                  </>
                }
                title="Add Shot"
                description={`Add a new shot to "${postIdea.title}"`}
                icon={Plus}
                isOpen={isAddShotOpen}
                onOpenChange={setIsAddShotOpen}
                onSubmit={handleAddShot}
                loading={loading}
                submitText="Add Shot"
                loadingText="Adding..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
} 