'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MobileInput } from '@/components/ui/mobile-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSheet } from '@/components/ui/form-sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { CONTENT_TYPE_OPTIONS } from '@/lib/constants/platforms'
import { useAllPlatformsWithStatus } from '@/lib/hooks/use-client-platforms'
import { CheckCircle } from 'lucide-react'
import type { PostIdeaData } from '@/lib/types/shoots'

interface QuickAddPostIdeaProps {
  onAddPostIdea: (postIdea: PostIdeaData) => Promise<void>
}

export const QuickAddAction = ({ onAddPostIdea }: QuickAddPostIdeaProps) => {
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const handlePlatformToggle = (platformName: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformName)
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    )
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    
    try {
      const title = formData.get('title') as string
      const contentType = formData.get('contentType') as 'photo' | 'video' | 'reel' | 'story'
      const caption = formData.get('caption') as string
      const shotList = formData.get('shotList') as string

      if (!title.trim()) {
        toast.error('Please enter a post idea title')
        return
      }

      if (selectedPlatforms.length === 0) {
        toast.error('Please select at least one platform')
        return
      }

      if (!contentType) {
        toast.error('Please select a content type')
        return
      }

      await onAddPostIdea({
        title: title.trim(),
        platforms: selectedPlatforms,
        contentType,
        caption: caption.trim() || undefined,
        shotList: shotList.trim() || undefined
      })
      
      // Reset form
      setSelectedPlatforms([])
      setIsOpen(false)
      toast.success('Post idea added!')
    } catch (error) {
      toast.error('Failed to add post idea')
      console.error('Error adding post idea:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset form when closing
      setSelectedPlatforms([])
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <FormSheet
        trigger={
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gray-700 hover:bg-gray-800"
            aria-label="Add new post idea"
          >
            <Plus className="h-6 w-6" />
          </Button>
        }
        formContent={
          <div className="space-y-4">
            <MobileInput
              name="title"
              label="Post Idea Title"
              placeholder="e.g., Behind the scenes setup shots"
              required
              autoFocus
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Content Type</Label>
              <Select name="contentType" required>
                <SelectTrigger className="h-12 text-base tap-target">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Platforms <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {useAllPlatformsWithStatus().map((platform) => {
                  const Icon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.name)
                  return (
                    <Button
                      key={platform.name}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlatformToggle(platform.name)}
                      className={`h-10 w-10 flex items-center justify-center tap-target p-0 relative ${
                        !isSelected && platform.isConfigured 
                          ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                          : ''
                      }`}
                      title={platform.isConfigured ? `${platform.name} (${platform.handle})` : platform.name}
                    >
                      <div className="flex items-center justify-center relative">
                        {Icon ? (
                          <Icon className="h-5 w-5" />
                        ) : (
                          <span className="text-xs font-medium">{platform.name.slice(0, 3)}</span>
                        )}
                        {platform.isConfigured && !isSelected && (
                          <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-600 bg-white rounded-full" />
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-xs text-gray-500">
                  Select at least one platform • ✓ indicates configured handles
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption" className="text-sm font-medium">
                Caption Ideas (Optional)
              </Label>
              <Textarea
                id="caption"
                name="caption"
                placeholder="Draft caption or key messaging points..."
                className="min-h-[80px] text-base tap-target resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shotList" className="text-sm font-medium">
                Shot List (Optional)
              </Label>
              <Textarea
                id="shotList"
                name="shotList"
                placeholder="List the shots you want to capture for this post idea..."
                className="min-h-[80px] text-base tap-target resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Each line will become a separate shot to check off
              </p>
            </div>
          </div>
        }
        title="Add Post Idea"
        description="Create a new post idea for this shoot"
        icon={Plus}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        loading={loading}
        submitText="Add Post Idea"
        loadingText="Adding..."
      />
    </div>
  )
} 