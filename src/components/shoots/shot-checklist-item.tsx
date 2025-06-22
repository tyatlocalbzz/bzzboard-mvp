'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MobileInput } from '@/components/ui/mobile-input'
import { FormSheet } from '@/components/ui/form-sheet'
import { Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Shot } from '@/lib/types/shoots'

interface ShotChecklistItemProps {
  shot: Shot
  onToggle: (shotId: number) => void
  onEdit: (shotId: number, text: string, notes?: string) => void
  className?: string
}

export const ShotChecklistItem = ({ 
  shot, 
  onToggle, 
  onEdit, 
  className 
}: ShotChecklistItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      const text = formData.get('text') as string
      const notes = formData.get('notes') as string
      
      onEdit(shot.id, text, notes || undefined)
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-3 py-2 px-1 transition-opacity",
      shot.completed && "opacity-60",
      className
    )}>
      {/* Large checkbox for easy tapping */}
      <Checkbox
        id={`shot-${shot.id}`}
        checked={shot.completed}
        onCheckedChange={() => onToggle(shot.id)}
        className="h-6 w-6 flex-shrink-0"
      />
      
      {/* Shot text and edit button */}
      <div className="flex items-center justify-between flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={`shot-${shot.id}`}
            className={cn(
              "text-sm cursor-pointer block",
              shot.completed ? "line-through text-gray-500" : "text-gray-900"
            )}
          >
            {shot.text}
          </label>
          {shot.notes && (
            <div className="text-xs text-gray-500 mt-1 italic">
              {shot.notes}
            </div>
          )}
        </div>
        
        {/* Edit button */}
        <FormSheet
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-2 flex-shrink-0"
              aria-label={`Edit ${shot.text}`}
            >
              <Edit className="h-3 w-3" />
            </Button>
          }
          formContent={
            <>
              <MobileInput
                name="text"
                label="Shot Description"
                placeholder="Describe the shot..."
                defaultValue={shot.text}
                required
              />
              
              <MobileInput
                name="notes"
                label="Notes (Optional)"
                placeholder="Any additional notes..."
                defaultValue={shot.notes || ''}
              />
            </>
          }
          title="Edit Shot"
          description="Update the shot details"
          icon={Edit}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Save Changes"
          loadingText="Saving..."
        />
      </div>
    </div>
  )
} 