'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { FormSheet } from '@/components/ui/form-sheet'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/lib/hooks/use-async'
import { useFormState } from '@/lib/hooks/use-form-state'
import { useFieldValidation } from '@/lib/hooks/use-field-validation'
import { useClient } from '@/contexts/client-context'
import { toast } from 'sonner'
import { useAdminEnabledPlatforms } from '@/lib/hooks/use-client-platforms'
import { Plus, Edit, FileText, Users, X } from 'lucide-react'
import { CONTENT_TYPE_OPTIONS } from '@/lib/constants/platforms'
import { shootsApi } from '@/lib/api/shoots-unified'
import { type PostIdea } from '@/lib/hooks/use-posts'

// Unified interfaces
export interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story' | 'carousel'
  caption?: string
  shotList?: string[]
  notes?: string
  clientName?: string // For standalone post creation
}

// Form state interface for useFormState
interface PostIdeaFormData {
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story' | 'carousel'
  selectedClient: string
  shotList: string[]
  caption: string
  notes: string
}

export interface PostIdeaFormProps {
  // Controlled pattern (recommended)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  
  // Trigger pattern (legacy support)
  trigger?: React.ReactNode
  
  // Mode and context
  mode: 'create' | 'edit' | 'duplicate' | 'quick-add'
  context?: 'standalone' | 'shoot' // standalone = posts page, shoot = within a shoot
  
  // Data
  shootId?: string
  postIdea?: PostIdea
  
  // Behavior
  onSuccess: () => void
  onCancel?: () => void
  
  // UI preferences
  displayMode?: 'dialog' | 'sheet' | 'form-sheet'
  title?: string
  description?: string
}

// API functions
const createStandalonePost = async (data: PostIdeaData): Promise<PostIdea> => {
  console.log('🔄 [createStandalonePost] Creating standalone post with data:', data)
  
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  console.log('📡 [createStandalonePost] Response status:', response.status)
  
  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ [createStandalonePost] Error response:', errorData)
    throw new Error(errorData.error || 'Failed to create post')
  }
  
  const result = await response.json()
  console.log('📥 [createStandalonePost] API result:', result)
  
  if (!result.success || !result.data?.post) {
    throw new Error('API returned unexpected response format')
  }
  
  console.log('✅ [createStandalonePost] Returning post:', result.data.post)
  return result.data.post
}

const updatePost = async (postId: number, data: PostIdeaData): Promise<PostIdea> => {
  console.log('🔄 [updatePost] Updating post with data:', { postId, data })
  
  const response = await fetch(`/api/posts/${postId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  console.log('📡 [updatePost] Response status:', response.status)
  
  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ [updatePost] Error response:', errorData)
    throw new Error(errorData.error || 'Failed to update post')
  }
  
  const result = await response.json()
  console.log('📥 [updatePost] API result:', result)
  
  if (!result.success || !result.data?.postIdea) {
    throw new Error('API returned unexpected response format')
  }
  
  console.log('✅ [updatePost] Returning post:', result.data.postIdea)
  return result.data.postIdea
}

const addPostToShoot = async (shootId: string, data: PostIdeaData): Promise<PostIdea> => {
  console.log('🔄 [addPostToShoot] Starting with data:', { shootId, data })
  
  // Convert carousel to photo for API compatibility
  const contentType = data.contentType === 'carousel' ? 'photo' : data.contentType as 'photo' | 'video' | 'reel' | 'story'
  
  const shootPostData = {
    title: data.title,
    platforms: data.platforms,
    contentType,
    caption: data.caption,
    shotList: data.shotList || [],  // Now properly typed as string[]
    notes: data.notes
  }
  
  console.log('📤 [addPostToShoot] Calling shootsApi.addPostIdea with:', shootPostData)
  
  try {
    const result = await shootsApi.addPostIdea(shootId, shootPostData)
    console.log('📥 [addPostToShoot] API result:', result)
    
    if (!result) {
      throw new Error('API returned empty result')
    }
    
    // Convert the result back to PostIdea format
    const postIdea: PostIdea = {
      id: result.id,
      title: result.title,
      platforms: result.platforms,
      contentType: result.contentType,
      caption: result.caption,
      shotList: result.shotList, // Use shotList directly from ExtendedPostIdea
      notes: data.notes,
      status: 'planned',
      client: null, // Will be populated by the API response
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    console.log('✅ [addPostToShoot] Converted to PostIdea format:', postIdea)
    return postIdea
  } catch (error) {
    console.error('❌ [addPostToShoot] Error:', error)
    throw error // Re-throw to be handled by the form
  }
}

export const PostIdeaForm = ({
  open,
  onOpenChange,
  trigger,
  mode,
  context = 'standalone',
  shootId,
  postIdea,
  onSuccess,
  onCancel,
  displayMode = 'dialog',
  title,
  description
}: PostIdeaFormProps) => {
  // State management - support both controlled and uncontrolled patterns
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const { selectedClient: contextClient, clients } = useClient()
  
  // Create stable initial data to prevent formState recreation
  const stableInitialData = useMemo(() => ({
    platforms: [],
    contentType: 'photo' as const,
    selectedClient: '',
    shotList: [''],
    caption: '',
    notes: ''
  }), [])

  // Use the form state hook for all form data
  const formState = useFormState<PostIdeaFormData>(stableInitialData)
  
  // ✅ Simplified: Only use admin-enabled platforms everywhere
  const platforms = useAdminEnabledPlatforms()

  // API hooks
  const { loading: createLoading, execute: executeCreate } = useAsync(createStandalonePost)
  const { loading: updateLoading, execute: executeUpdate } = useAsync(updatePost)
  const { loading: addToShootLoading, execute: executeAddToShoot } = useAsync(addPostToShoot)
  
  const loading = createLoading || updateLoading || addToShootLoading

  // Field validation for title
  const titleField = useFieldValidation({
    fieldName: 'title',
    initialValue: mode === 'duplicate' ? `${postIdea?.title} (Copy)` : (postIdea?.title || ''),
    validateOnChange: true,
    validateOnBlur: true,
    showValidation: isOpen
  })

  // Get available clients for standalone context
  const availableClients = clients.filter(client => client.type === 'client')

  // Handle open/close state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
    
    if (!newOpen) {
      onCancel?.()
    }
  }

  // Reset form when dialog opens or data changes
  const resetForm = useCallback(() => {
    const initialData: PostIdeaFormData = {
      platforms: postIdea?.platforms || [],
      contentType: postIdea?.contentType || 'photo',
      selectedClient: postIdea?.client?.name || (contextClient.type === 'client' ? contextClient.name : ''),
      shotList: postIdea?.shotList || [''],
      caption: postIdea?.caption || '',
      notes: postIdea?.notes || ''
    }
    formState.reset(initialData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIdea?.platforms, postIdea?.contentType, postIdea?.client?.name, postIdea?.shotList, postIdea?.caption, postIdea?.notes, mode, contextClient.type, contextClient.name, formState.reset])
  // ✅ formState excluded from deps to prevent infinite loops - safe because we only use formState.reset

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, resetForm])

  // Platform handling
  const togglePlatform = (platformName: string) => {
    const currentPlatforms = formState.data.platforms
    const newPlatforms = currentPlatforms.includes(platformName) 
      ? currentPlatforms.filter(p => p !== platformName)
      : [...currentPlatforms, platformName]
    
    formState.setField('platforms', newPlatforms)
  }

  // Shot list handling
  const addShotItem = () => {
    formState.setField('shotList', [...formState.data.shotList, ''])
  }

  const updateShotItem = (index: number, value: string) => {
    const newShotList = formState.data.shotList.map((item, i) => i === index ? value : item)
    formState.setField('shotList', newShotList)
  }

  const removeShotItem = (index: number) => {
    if (formState.data.shotList.length > 1) {
      const newShotList = formState.data.shotList.filter((_, i) => i !== index)
      formState.setField('shotList', newShotList)
    }
  }

  // Form validation
  const validateForm = (): string | null => {
    const titleValidation = titleField.validate()
    if (!titleValidation.valid) {
      return titleValidation.error || 'Please enter a valid title'
    }

    if (!titleField.value.trim()) {
      return 'Post title is required'
    }

    if (formState.data.platforms.length === 0) {
      return 'Please select at least one platform'
    }

    if (!formState.data.contentType) {
      return 'Please select a content type'
    }

    if (context === 'standalone' && !formState.data.selectedClient) {
      return 'Please select a client'
    }

    // Additional validation for shoot context
    if (context === 'shoot' && !shootId) {
      return 'Shoot ID is missing - please refresh and try again'
    }

    return null
  }

  // Form submission
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const formData: PostIdeaData = {
      title: titleField.value,
      platforms: formState.data.platforms,
      contentType: formState.data.contentType,
      caption: formState.data.caption || undefined,
      shotList: formState.data.shotList.filter(shot => shot.trim() !== ''),
      notes: formState.data.notes || undefined,
      clientName: context === 'standalone' ? formState.data.selectedClient : undefined
    }

    try {
      console.log('🔄 [PostIdeaForm] Submitting form:', { mode, context, formData })
      
      let result
      if (mode === 'edit' && postIdea) {
        result = await executeUpdate(postIdea.id, formData)
      } else if (context === 'shoot' && shootId) {
        result = await executeAddToShoot(shootId, formData)
      } else {
        result = await executeCreate(formData)
      }

      // Only show success and close dialog if we have a valid result
      if (result) {
        const actionText = mode === 'edit' ? 'updated' : 'created'
        toast.success(`Post idea ${actionText} successfully!`)
        handleOpenChange(false)
        onSuccess()
        console.log('✅ [PostIdeaForm] Form submitted successfully:', result)
      } else {
        console.warn('⚠️ [PostIdeaForm] No result returned, but no error thrown')
        // Still consider it a success if no error was thrown
        const actionText = mode === 'edit' ? 'updated' : 'created'
        toast.success(`Post idea ${actionText} successfully!`)
        handleOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('❌ [PostIdeaForm] Error submitting form:', error)
      // Show specific error message from the API or a generic fallback
      const errorMessage = error instanceof Error ? error.message : 'Failed to save post idea'
      toast.error(errorMessage)
      // Don't close the dialog on error - let user try again
    }
  }

  // Dynamic titles and descriptions
  const getTitle = () => {
    if (title) return title
    if (mode === 'edit') return 'Edit Post Idea'
    if (mode === 'duplicate') return 'Duplicate Post Idea'
    if (mode === 'quick-add') return 'Quick Add Post'
    return 'Create Post Idea'
  }

  const getDescription = () => {
    if (description) return description
    if (mode === 'edit') return 'Make changes to your post idea'
    if (mode === 'duplicate') return 'Create a copy of this post idea'
    if (mode === 'quick-add') return 'Quickly add a new post idea'
    return 'Create a new post idea for your content'
  }

  const getIcon = () => {
    if (mode === 'edit') return Edit
    if (mode === 'duplicate') return FileText
    if (mode === 'quick-add') return Plus
    return Plus
  }

  // Render form content
  const renderFormContent = () => (
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

      {/* Client Selection (only for standalone context) */}
      {context === 'standalone' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Client *</Label>
          <Select 
            value={formState.data.selectedClient} 
            onValueChange={(value) => formState.setField('selectedClient', value)} 
            required
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{formState.data.selectedClient || 'Choose a client'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableClients.map((client) => (
                <SelectItem key={client.id} value={client.name}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{client.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOpen && !formState.data.selectedClient && (
            <p className="text-sm text-red-600">Please select a client</p>
          )}
        </div>
      )}

      {/* Platforms - Now simplified */}
      <div className="space-y-3">
        <Label>Platforms *</Label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              type="button"
              onClick={() => togglePlatform(platform.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                formState.data.platforms.includes(platform.name)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
        {formState.data.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {formState.data.platforms.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        )}
        {isOpen && formState.data.platforms.length === 0 && (
          <p className="text-sm text-red-600">Please select at least one platform</p>
        )}
      </div>

      {/* Content Type */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <Select 
          value={formState.data.contentType} 
          onValueChange={(value: PostIdeaFormData['contentType']) => formState.setField('contentType', value)}
        >
          <SelectTrigger>
            <SelectValue />
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

      {/* Caption */}
      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          name="caption"
          placeholder="Write your caption..."
          value={formState.data.caption}
          onChange={(e) => formState.setField('caption', e.target.value)}
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
          {formState.data.shotList.map((shot, index) => (
            <div key={index} className="flex gap-2">
              <MobileInput
                placeholder={`Shot ${index + 1}...`}
                value={shot}
                onChange={(e) => updateShotItem(index, e.target.value)}
                className="flex-1"
                showValidationIcon={false}
              />
              {formState.data.shotList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeShotItem(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
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
          value={formState.data.notes}
          onChange={(e) => formState.setField('notes', e.target.value)}
          rows={2}
          className="text-base tap-target resize-none"
        />
      </div>
    </div>
  )

  // Render based on display mode
  if (displayMode === 'form-sheet') {
    return (
      <FormSheet
        trigger={trigger}
        formContent={renderFormContent()}
        title={getTitle()}
        description={getDescription()}
        icon={getIcon()}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        onSubmit={async () => await handleSubmit()}
        loading={loading}
        submitText={mode === 'edit' ? 'Save Changes' : 'Create Post Idea'}
        loadingText={mode === 'edit' ? 'Saving...' : 'Creating...'}
      />
    )
  }

  if (displayMode === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        {trigger && (
          <SheetTrigger asChild>
            {trigger}
          </SheetTrigger>
        )}
        <SheetContent side="bottom" className="h-[90vh] max-h-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {React.createElement(getIcon(), { className: "h-5 w-5" })}
              {getTitle()}
            </SheetTitle>
            <SheetDescription>
              {getDescription()}
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col h-full pt-2">
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-4 py-2">
              {renderFormContent()}
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 p-4 border-t bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                onClick={handleSubmit}
                className="flex-1 h-12"
                loading={loading}
                loadingText={mode === 'edit' ? 'Saving...' : 'Creating...'}
              >
                {mode === 'edit' ? 'Save Changes' : 'Create Post Idea'}
              </LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Default: Dialog mode
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {React.createElement(getIcon(), { className: "h-5 w-5" })}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col max-h-[60vh] overflow-y-auto pr-2">
          {renderFormContent()}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            className="flex-1"
            loading={loading}
            loadingText={mode === 'edit' ? 'Saving...' : 'Creating...'}
          >
            {mode === 'edit' ? 'Save Changes' : 'Create Post Idea'}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
} 