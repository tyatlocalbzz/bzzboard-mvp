'use client'

import { useState } from 'react'
import { FormSheet } from "@/components/ui/form-sheet"
import { MobileInput } from "@/components/ui/mobile-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAsync } from "@/lib/hooks/use-async"
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
  
  const { loading: addLoading, execute: executeAdd } = useAsync(addPostIdea)
  const { loading: editLoading, execute: executeEdit } = useAsync(editPostIdea)
  
  const loading = mode === 'add' ? addLoading : editLoading

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

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string
    const contentType = formData.get('contentType') as 'photo' | 'video' | 'reel' | 'story'
    const caption = formData.get('caption') as string
    const notes = formData.get('notes') as string

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (platforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    const filteredShotList = shotList.filter(shot => shot.trim() !== '')

    const postIdeaData: PostIdeaData = {
      title: title.trim(),
      platforms,
      contentType,
      caption: caption.trim() || undefined,
      shotList: filteredShotList,
      notes: notes.trim() || undefined
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
      setPlatforms(postIdea?.platforms || [])
      setShotList(postIdea?.shotList || [''])
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
              defaultValue={postIdea?.title}
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
            <p className="text-xs text-gray-500">
              Platforms with ✓ have social media handles configured in client settings
            </p>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select name="contentType" defaultValue={postIdea?.contentType || 'photo'}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="story">Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              name="caption"
              placeholder="Enter caption..."
              defaultValue={postIdea?.caption}
              rows={3}
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