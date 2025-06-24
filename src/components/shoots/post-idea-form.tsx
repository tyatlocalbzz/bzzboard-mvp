'use client'

import { useState } from 'react'
import { FormSheet } from "@/components/ui/form-sheet"
import { MobileInput } from "@/components/ui/mobile-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAsync } from "@/lib/hooks/use-async"
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { toast } from "sonner"
import { useAllPlatformsWithStatus } from '@/lib/hooks/use-client-platforms'
import { CheckCircle } from 'lucide-react'

interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
}

interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
}

interface PostIdeaFormProps {
  trigger: React.ReactNode
  shootId?: string
  postIdea?: PostIdea
  onSuccess: () => void
  mode: 'add' | 'edit'
}

const addPostIdea = async (shootId: string, data: PostIdeaData) => {
  await new Promise(resolve => setTimeout(resolve, 600))
  console.log('Adding post idea:', shootId, data)
  return { 
    id: Math.floor(Math.random() * 1000000),
    ...data,
    shots: [],
    status: 'planned' as const,
    completed: false
  }
}

const editPostIdea = async (postIdeaId: string, data: PostIdeaData) => {
  await new Promise(resolve => setTimeout(resolve, 600))
  console.log('Editing post idea:', postIdeaId, data)
  return { success: true }
}

export const PostIdeaForm = ({ trigger, shootId, postIdea, onSuccess, mode }: PostIdeaFormProps) => {
  const [platforms, setPlatforms] = useState<string[]>(postIdea?.platforms || [])
  const [shotList, setShotList] = useState<string[]>(postIdea?.shotList || [''])
  const [isOpen, setIsOpen] = useState(false)
  const [contentType, setContentType] = useState<'photo' | 'video' | 'reel' | 'story'>(postIdea?.contentType || 'photo')
  
  const { loading: addLoading, execute: executeAdd } = useAsync(addPostIdea)
  const { loading: editLoading, execute: executeEdit } = useAsync(editPostIdea)
  
  const loading = mode === 'add' ? addLoading : editLoading

  // Field validation hooks
  const titleField = useFieldValidation({
    fieldName: 'name',
    initialValue: postIdea?.title || '',
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  const togglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const addShotItem = () => {
    setShotList(prev => [...prev, ''])
  }

  const updateShotItem = (index: number, value: string) => {
    setShotList(prev => prev.map((item, i) => i === index ? value : item))
  }

  const removeShotItem = (index: number) => {
    if (shotList.length > 1) {
      setShotList(prev => prev.filter((_, i) => i !== index))
    }
  }

  const validateForm = (): string | null => {
    if (!titleField.value.trim()) {
      return 'Please enter a title'
    }

    if (platforms.length === 0) {
      return 'Please select at least one platform'
    }

    return null
  }

  const handleSubmit = async () => {
    // Validate title field
    const titleValidation = titleField.validate()
    
    if (!titleValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const filteredShotList = shotList.filter(shot => shot.trim() !== '')

    const postIdeaData: PostIdeaData = {
      title: titleField.value.trim(),
      platforms,
      contentType,
      caption: undefined, // Caption is optional and not validated
      shotList: filteredShotList,
      notes: undefined // Notes are optional and not validated
    }

    let result
    if (mode === 'add' && shootId) {
      result = await executeAdd(shootId, postIdeaData)
    } else if (mode === 'edit' && postIdea) {
      result = await executeEdit(postIdea.id.toString(), postIdeaData)
    }

    if (result) {
      toast.success(mode === 'add' ? 'Post idea added!' : 'Post idea updated!')
      setIsOpen(false)
      onSuccess()
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset form when closing
      titleField.setValue(postIdea?.title || '')
      setPlatforms(postIdea?.platforms || [])
      setShotList(postIdea?.shotList || [''])
      setContentType(postIdea?.contentType || 'photo')
    }
  }

  return (
    <FormSheet
      trigger={trigger}
      formContent={
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <MobileInput
              id="title"
              name="title"
              placeholder="Enter post title..."
              value={titleField.value}
              onChange={titleField.handleChange}
              onBlur={titleField.handleBlur}
              error={titleField.validationResult.error}
              validationState={titleField.validationResult.state}
              required
            />
          </div>

          {/* Platforms */}
          <div className="space-y-3">
            <Label>Platforms *</Label>
            <div className="flex flex-wrap gap-2">
              {useAllPlatformsWithStatus().map((platform) => (
                <button
                  key={platform.name}
                  type="button"
                  onClick={() => togglePlatform(platform.name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
                    platforms.includes(platform.name)
                      ? 'bg-blue-500 text-white'
                      : platform.isConfigured
                      ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={platform.isConfigured ? `${platform.name} (${platform.handle})` : platform.name}
                >
                  <div className="flex items-center gap-1">
                    {platform.name}
                    {platform.isConfigured && (
                      <CheckCircle className="h-3 w-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {platforms.map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            )}
            {isOpen && platforms.length === 0 && (
              <p className="text-sm text-red-600">Please select at least one platform</p>
            )}
            <p className="text-xs text-gray-500">
              Platforms with ✓ have social media handles configured in client settings
            </p>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(value: 'photo' | 'video' | 'reel' | 'story') => setContentType(value)}>
              <SelectTrigger className="h-12 text-base tap-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">📸 Photo</SelectItem>
                <SelectItem value="video">🎥 Video</SelectItem>
                <SelectItem value="reel">📱 Reel</SelectItem>
                <SelectItem value="story">📖 Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              name="caption"
              placeholder="Write your caption..."
              defaultValue={postIdea?.caption}
              rows={3}
              className="text-base tap-target resize-none"
            />
          </div>

          {/* Shot List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Shot List</Label>
              <button
                type="button"
                onClick={addShotItem}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Shot
              </button>
            </div>
            <div className="space-y-2">
              {shotList.map((shot, index) => (
                <div key={index} className="flex gap-2">
                  <MobileInput
                    placeholder={`Shot ${index + 1}...`}
                    value={shot}
                    onChange={(e) => updateShotItem(index, e.target.value)}
                    className="flex-1"
                    showValidationIcon={false} // No validation needed for individual shots
                  />
                  {shotList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeShotItem(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes..."
              defaultValue={postIdea?.notes}
              rows={2}
              className="text-base tap-target resize-none"
            />
          </div>
        </div>
      }
      title={mode === 'add' ? 'Add Post Idea' : 'Edit Post Idea'}
      description={mode === 'add' ? 'Create a new post idea for this shoot' : 'Update this post idea'}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      loading={loading}
      submitText={mode === 'add' ? 'Add Post Idea' : 'Update Post Idea'}
      loadingText={mode === 'add' ? 'Adding...' : 'Updating...'}
    />
  )
} 