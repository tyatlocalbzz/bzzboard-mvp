'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FormSheet } from "@/components/ui/form-sheet"
import { LoadingButton } from "@/components/ui/loading-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MobileInput } from "@/components/ui/mobile-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Edit, Plus, MoreHorizontal, Users, Trash2, Play, Upload, CheckCircle } from "lucide-react"
import { formatStatusText, getStatusColor, shootStatusManager, ShootStatus } from "@/lib/utils/status"
import { useAsync } from "@/lib/hooks/use-async"
import { useActiveShoot } from "@/contexts/active-shoot-context"
import { toast } from "sonner"
import { PLATFORM_OPTIONS } from '@/lib/constants/platforms'
import Link from 'next/link'
import type { Shoot, PostIdea } from '@/lib/types/shoots'
import { useAllPlatformsWithStatus } from '@/lib/hooks/use-client-platforms'
import { CheckCircle as CheckCircleIcon } from 'lucide-react'

// Additional types for this page
interface RescheduleData {
  date: string
  time: string
}

interface EditShootData {
  title: string
  client: string
  duration: number
  location: string
  notes?: string
}

// Extended PostIdea type for this page with additional fields
interface ExtendedPostIdea extends PostIdea {
  shotList: string[]
  status: 'planned' | 'shot' | 'uploaded'
  completed?: boolean
  notes?: string
}

// Extended PostIdeaData for this page
interface ExtendedPostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
}

// Real API functions using database
const fetchShoot = async (id: string): Promise<Shoot> => {
  const response = await fetch(`/api/shoots/${id}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch shoot: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shoot')
  }
  
  return data.shoot
}

const fetchPostIdeas = async (shootId: string): Promise<ExtendedPostIdea[]> => {
  const response = await fetch(`/api/shoots/${shootId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch post ideas: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch post ideas')
  }
  
  // Transform the post ideas to match the extended format
  const postIdeas = data.postIdeas || []
  return postIdeas.map((postIdea: { id: number; title: string; platforms: string[]; shots?: { text: string; completed: boolean }[] }) => ({
    ...postIdea,
    shotList: postIdea.shots?.map((shot: { text: string; completed: boolean }) => shot.text) || [],
    completed: postIdea.shots?.every((shot: { text: string; completed: boolean }) => shot.completed) || false
  }))
}

const rescheduleShoot = async (id: string, data: RescheduleData) => {
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log('Rescheduling shoot:', id, data)
  return { success: true }
}

const editShoot = async (id: string, data: EditShootData) => {
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log('Editing shoot:', id, data)
  return { success: true }
}

const deleteShoot = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('Deleting shoot:', id)
  return { success: true }
}

// Change shoot status - Real API implementation using centralized status management
const changeShootStatus = async (id: string, newStatus: ShootStatus, action?: string) => {
  const response = await fetch(`/api/shoots/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: newStatus,
      action
    })
  })
  
  if (!response.ok) {
    throw new Error(`Failed to change shoot status: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to change shoot status')
  }
  
  return {
    success: true,
    message: data.message || `Shoot status changed to ${shootStatusManager.getLabel(newStatus)}`
  }
}

const addPostIdea = async (shootId: string, data: ExtendedPostIdeaData) => {
  await new Promise(resolve => setTimeout(resolve, 600))
  console.log('Adding post idea:', shootId, data)
  return { 
    id: Math.floor(Math.random() * 1000000),
    ...data,
    shots: [], // Empty for this page
    status: 'planned' as const,
    completed: false
  }
}

const editPostIdea = async (postIdeaId: number, data: ExtendedPostIdeaData) => {
  await new Promise(resolve => setTimeout(resolve, 600))
  console.log('Editing post idea:', postIdeaId, data)
  return { success: true }
}

const togglePostIdeaStatus = async (postIdeaId: number) => {
  await new Promise(resolve => setTimeout(resolve, 400))
  console.log('Toggling post idea status:', postIdeaId)
  return { success: true }
}

// Shoot Actions Component - DRY pattern for consolidated actions
interface ShootActionsProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

const ShootActions = ({ children, shoot, onSuccess }: ShootActionsProps) => {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { loading: deleteLoading, execute: executeDelete } = useAsync(deleteShoot)
  const { loading: statusLoading, execute: executeStatusChange } = useAsync(changeShootStatus)

  const handleDelete = async () => {
    const result = await executeDelete(shoot.id.toString())
    if (result) {
      toast.success('Shoot deleted successfully!')
      router.push('/shoots')
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    handleDelete()
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const handleStatusChange = async (newStatus: ShootStatus) => {
    const result = await executeStatusChange(shoot.id.toString(), newStatus)
    if (result) {
      toast.success(result.message)
      onSuccess()
    }
  }

  // Get valid status transitions using centralized status management
  const validTransitions = shootStatusManager.getValidTransitions(shoot.status as ShootStatus)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <EditShootForm shoot={shoot} onSuccess={onSuccess}>
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          </EditShootForm>

          <RescheduleForm shoot={shoot} onSuccess={onSuccess}>
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
          </RescheduleForm>

          {/* Status Change Options - DRY implementation using centralized status management */}
          {validTransitions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {validTransitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={statusLoading}
                  className="cursor-pointer"
                >
                  {statusLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <div className="w-4 h-4 mr-2 flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${shootStatusManager.getBgColor(status).replace('bg-', 'bg-')}`} />
                    </div>
                  )}
                  Change to {shootStatusManager.getLabel(status)}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            disabled={deleteLoading}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            {deleteLoading ? (
              <LoadingSpinner size="md" color="red" className="mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Shoot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Shoot</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete &quot;{shoot.title}&quot;? All post ideas and shots will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                className="flex-1"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="flex-1"
                loading={deleteLoading}
                loadingText="Deleting..."
              >
                Delete
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Edit Shoot Form Component - Following DRY pattern
interface EditShootFormProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

const EditShootForm = ({ children, shoot, onSuccess }: EditShootFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { loading, execute } = useAsync(editShoot)

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string
    const client = formData.get('client') as string
    const duration = parseInt(formData.get('duration') as string)
    const location = formData.get('location') as string
    const notes = formData.get('notes') as string

    const result = await execute(shoot.id.toString(), {
      title,
      client,
      duration,
      location,
      notes: notes || undefined
    })
    
    if (result) {
      toast.success('Shoot updated successfully!')
      setIsOpen(false)
      onSuccess()
    }
  }

  const formContent = (
    <>
      <MobileInput
        name="title"
        label="Shoot Title"
        defaultValue={shoot.title}
        placeholder="e.g., Q1 Product Launch Content"
        required
      />

      <MobileInput
        name="client"
        label="Client"
        defaultValue={shoot.client}
        placeholder="Client name"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration</Label>
          <Select name="duration" defaultValue={shoot.duration.toString()}>
            <SelectTrigger className="h-12 text-base tap-target">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="180">3 hours</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MobileInput
          name="location"
          label="Location"
          defaultValue={shoot.location}
          placeholder="Shoot location"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={shoot.notes || ''}
          placeholder="Equipment needs, special requirements..."
          className="min-h-[80px] text-base tap-target resize-none"
          rows={3}
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Edit Shoot"
      description="Update the shoot details"
      icon={Edit}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Save Changes"
      loadingText="Saving..."
    />
  )
}

// Reschedule Form Component - Following DRY pattern
interface RescheduleFormProps {
  children: React.ReactNode
  shoot: Shoot
  onSuccess: () => void
}

const RescheduleForm = ({ children, shoot, onSuccess }: RescheduleFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { loading, execute } = useAsync(rescheduleShoot)

  const handleSubmit = async (formData: FormData) => {
    const date = formData.get('date') as string
    const time = formData.get('time') as string

    const result = await execute(shoot.id.toString(), { date, time })
    
    if (result) {
      toast.success('Shoot rescheduled successfully!')
      setIsOpen(false)
      onSuccess()
    }
  }

  // Get current date and time from shoot
  const currentDate = new Date(shoot.scheduledAt).toISOString().split('T')[0]
  const currentTime = new Date(shoot.scheduledAt).toTimeString().slice(0, 5)
  const today = new Date().toISOString().split('T')[0]

  const formContent = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MobileInput
          name="date"
          label="New Date"
          type="date"
          defaultValue={currentDate}
          min={today}
          required
        />
        <MobileInput
          name="time"
          label="New Time"
          type="time"
          defaultValue={currentTime}
          required
        />
      </div>
    </>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Reschedule Shoot"
      description="Update the date and time for this shoot"
      icon={Calendar}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={loading}
      submitText="Reschedule"
      loadingText="Rescheduling..."
    />
  )
}

// Add Post Idea Form Component - Following DRY pattern
interface AddPostIdeaFormProps {
  children: React.ReactNode
  shootId: string
  onSuccess: () => void
}

const AddPostIdeaForm = ({ children, shootId, onSuccess }: AddPostIdeaFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const { loading, execute } = useAsync(addPostIdea)

  const platforms = useAllPlatformsWithStatus()

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string
    const contentType = formData.get('contentType') as 'photo' | 'video' | 'reel' | 'story'
    const caption = formData.get('caption') as string
    const shotListText = formData.get('shotList') as string
    const notes = formData.get('notes') as string

    // Parse shot list from textarea
    const shotList = shotListText
      .split('\n')
      .map(shot => shot.trim())
      .filter(shot => shot.length > 0)

    const result = await execute(shootId, {
      title,
      platforms: selectedPlatforms,
      contentType,
      caption: caption || undefined,
      shotList,
      notes: notes || undefined
    })
    
    if (result) {
      toast.success('Post idea added successfully!')
      setIsOpen(false)
      setSelectedPlatforms([])
      onSuccess()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Post Idea
          </SheetTitle>
          <SheetDescription>
            Create a new post idea for this shoot
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col h-full px-4 pb-4">
          <form action={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto">
              <MobileInput
                name="title"
                label="Post Title"
                placeholder="e.g., Product Launch Announcement"
                required
              />

              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Platforms</Label>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => {
                    const Icon = platform.icon
                    const isSelected = selectedPlatforms.includes(platform.name)
                    return (
                      <Button
                        key={platform.name}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-12 justify-start gap-2 tap-target relative ${
                          !isSelected && platform.isConfigured 
                            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                            : ''
                        }`}
                        onClick={() => togglePlatform(platform.name)}
                        title={platform.isConfigured ? `${platform.name} (${platform.handle})` : platform.name}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-medium w-4 h-4 flex items-center justify-center">
                            {platform.name.slice(0, 2)}
                          </span>
                        )}
                        {platform.name}
                        {platform.isConfigured && !isSelected && (
                          <CheckCircleIcon className="h-3 w-3 absolute top-1 right-1 text-green-600" />
                        )}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  Platforms with ✓ have social media handles configured
                </p>
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Content Type</Label>
                <Select name="contentType" defaultValue="photo" required>
                  <SelectTrigger className="h-12 text-base tap-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <MobileInput
                name="caption"
                label="Caption (Optional)"
                placeholder="Write your caption here..."
              />

              {/* Shot List */}
              <div className="space-y-2">
                <Label htmlFor="shotList" className="text-sm font-medium">
                  Shot List (Optional)
                </Label>
                <Textarea
                  id="shotList"
                  name="shotList"
                  placeholder="Enter each shot on a new line..."
                  className="min-h-[80px] text-base tap-target resize-none"
                  rows={3}
                />
              </div>

              <MobileInput
                name="notes"
                label="Notes (Optional)"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-12"
                loading={loading}
                loadingText="Adding..."
              >
                Add Post Idea
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Edit Post Idea Form Component - Following DRY pattern
interface EditPostIdeaFormProps {
  children: React.ReactNode
  postIdea: ExtendedPostIdea
  onSuccess: () => void
}

const EditPostIdeaForm = ({ children, postIdea, onSuccess }: EditPostIdeaFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(postIdea.platforms)
  const { loading, execute } = useAsync(editPostIdea)

  const platforms = useAllPlatformsWithStatus()

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string
    const contentType = formData.get('contentType') as 'photo' | 'video' | 'reel' | 'story'
    const caption = formData.get('caption') as string
    const shotListText = formData.get('shotList') as string
    const notes = formData.get('notes') as string

    // Parse shot list from textarea
    const shotList = shotListText
      .split('\n')
      .map(shot => shot.trim())
      .filter(shot => shot.length > 0)

    const result = await execute(postIdea.id, {
      title,
      platforms: selectedPlatforms,
      contentType,
      caption: caption || undefined,
      shotList,
      notes: notes || undefined
    })
    
    if (result) {
      toast.success('Post idea updated successfully!')
      setIsOpen(false)
      onSuccess()
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Reset to current platforms when opening
      setSelectedPlatforms(postIdea.platforms)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Post Idea
          </SheetTitle>
          <SheetDescription>
            Update the post idea details
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col h-full px-4 pb-4">
          <form action={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto">
              <MobileInput
                name="title"
                label="Post Title"
                defaultValue={postIdea.title}
                placeholder="e.g., Product Launch Announcement"
                required
              />

              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Platforms</Label>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => {
                    const Icon = platform.icon
                    const isSelected = selectedPlatforms.includes(platform.name)
                    return (
                      <Button
                        key={platform.name}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-12 justify-start gap-2 tap-target relative ${
                          !isSelected && platform.isConfigured 
                            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                            : ''
                        }`}
                        onClick={() => togglePlatform(platform.name)}
                        title={platform.isConfigured ? `${platform.name} (${platform.handle})` : platform.name}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-medium w-4 h-4 flex items-center justify-center">
                            {platform.name.slice(0, 2)}
                          </span>
                        )}
                        {platform.name}
                        {platform.isConfigured && !isSelected && (
                          <CheckCircleIcon className="h-3 w-3 absolute top-1 right-1 text-green-600" />
                        )}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  Platforms with ✓ have social media handles configured
                </p>
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Content Type</Label>
                <Select name="contentType" defaultValue={postIdea.contentType} required>
                  <SelectTrigger className="h-12 text-base tap-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <MobileInput
                name="caption"
                label="Caption (Optional)"
                defaultValue={postIdea.caption || ''}
                placeholder="Write your caption here..."
              />

              {/* Shot List */}
              <div className="space-y-2">
                <Label htmlFor="shotList" className="text-sm font-medium">
                  Shot List (Optional)
                </Label>
                <Textarea
                  id="shotList"
                  name="shotList"
                  defaultValue={postIdea.shotList.join('\n')}
                  placeholder="Enter each shot on a new line..."
                  className="min-h-[80px] text-base tap-target resize-none"
                  rows={3}
                />
              </div>

              <MobileInput
                name="notes"
                label="Notes (Optional)"
                defaultValue={postIdea.notes || ''}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-12"
                loading={loading}
                loadingText="Updating..."
              >
                Update Post Idea
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Post Idea Actions Component - DRY pattern for post idea actions
interface PostIdeaActionsProps {
  postIdea: ExtendedPostIdea
  onToggleStatus: () => void
}

const PostIdeaActions = ({ postIdea, onToggleStatus }: PostIdeaActionsProps) => {
  const { loading, execute } = useAsync(togglePostIdeaStatus)

  const handleToggleStatus = async () => {
    const result = await execute(postIdea.id)
    if (result) {
      onToggleStatus()
    }
  }

  const getStatusAction = () => {
    switch (postIdea.status) {
      case 'planned': return 'Mark as Shot'
      case 'shot': return 'Mark as Uploaded'
      case 'uploaded': return 'Mark as Planned'
      default: return 'Update Status'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <EditPostIdeaForm postIdea={postIdea} onSuccess={() => {}}>
          <DropdownMenuItem 
            className="cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
        </EditPostIdeaForm>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleToggleStatus}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? (
            <LoadingSpinner size="sm" color="gray" className="mr-2" />
          ) : (
            <Badge variant="outline" className="mr-2 h-4 w-4 p-0" />
          )}
          {getStatusAction()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ShootDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { startShoot } = useActiveShoot()
  
  const [shoot, setShoot] = useState<Shoot | null>(null)
  const [postIdeas, setPostIdeas] = useState<ExtendedPostIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Status change functionality using DRY centralized system
  const { loading: statusChangeLoading, execute: executeStatusChange } = useAsync(changeShootStatus)

  // Load shoot and post ideas
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [shootData, postIdeasData] = await Promise.all([
          fetchShoot(shootId),
          fetchPostIdeas(shootId)
        ])
        setShoot(shootData)
        setPostIdeas(postIdeasData)
      } catch (error) {
        console.error('Failed to load shoot data:', error)
        toast.error('Failed to load shoot details')
      } finally {
        setIsLoading(false)
      }
    }

    if (shootId) {
      loadData()
    }
  }, [shootId])

  const handleRefresh = useCallback(async () => {
    if (!shootId) return
    
    try {
      const [shootData, postIdeasData] = await Promise.all([
        fetchShoot(shootId),
        fetchPostIdeas(shootId)
      ])
      setShoot(shootData)
      setPostIdeas(postIdeasData)
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data')
    }
  }, [shootId])

  const handleStartShoot = async () => {
    if (!shoot || statusChangeLoading) return
    
    // First change the shoot status to 'active' using real API with action parameter
    const statusResult = await executeStatusChange(shoot.id.toString(), 'active', 'start')
    if (!statusResult) return
    
    // Then start the active shoot context
    startShoot({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client,
      startedAt: new Date().toISOString()
    })
    
    toast.success('Shoot started successfully!')
    
    // Refresh data to show updated status
    await handleRefresh()
    
    // Navigate to active shoot page
    router.push(`/shoots/${shootId}/active`)
  }

  const handleCompleteShoot = async () => {
    if (!shoot || statusChangeLoading) return
    
    // Change the shoot status to 'completed' using real API with action parameter
    const statusResult = await executeStatusChange(shoot.id.toString(), 'completed', 'complete')
    if (!statusResult) return
    
    toast.success('Shoot completed successfully!')
    
    // Refresh data to show updated status
    await handleRefresh()
  }

  // Utility functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Status color now handled by centralized status management

  if (isLoading) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref="/shoots"
        showBottomNav={false}
        loading={true}
      >
        <div />
      </MobileLayout>
    )
  }

  if (!shoot) {
    return (
      <MobileLayout 
        title="Shoot Not Found"
        backHref="/shoots"
        showBottomNav={false}
      >
        <EmptyState
          icon={Calendar}
          title="Shoot not found"
          description="The shoot you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Shoots",
            onClick: () => router.push('/shoots')
          }}
        />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title={shoot.client}
      backHref="/shoots"
      headerAction={
        <div className="flex items-center gap-2">
          {shoot.status === 'completed' && (
            <Link href={`/shoots/${shootId}/upload`}>
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            </Link>
          )}
          {shoot.status === 'scheduled' && (
            <LoadingButton
              size="sm"
              onClick={handleStartShoot}
              className="h-8 px-3 text-xs"
              loading={statusChangeLoading}
              loadingText="Starting..."
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </LoadingButton>
          )}
          {shoot.status === 'active' && (
            <LoadingButton
              size="sm"
              onClick={handleCompleteShoot}
              className="h-8 px-3 text-xs"
              loading={statusChangeLoading}
              loadingText="Completing..."
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </LoadingButton>
          )}
          <ShootActions shoot={shoot} onSuccess={handleRefresh}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </ShootActions>
        </div>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* Shoot Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{shoot.title}</h1>
            <Badge variant={getStatusColor(shoot.status)}>
              {formatStatusText(shoot.status)}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(shoot.scheduledAt)} at {formatTime(shoot.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(shoot.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{shoot.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{postIdeas.length} post idea{postIdeas.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {shoot.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{shoot.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Post Ideas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Post Ideas</h2>
            <AddPostIdeaForm shootId={shootId} onSuccess={handleRefresh}>
              <Button size="sm" className="h-8 px-3 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </AddPostIdeaForm>
          </div>

          {postIdeas.length > 0 ? (
            <div className="space-y-3">
              {postIdeas.map((postIdea, index) => (
                <div key={postIdea.id}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {postIdea.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {postIdea.platforms.slice(0, 3).map((platform) => {
                              const platformOption = PLATFORM_OPTIONS.find(p => p.name === platform)
                              const Icon = platformOption?.icon
                              return Icon ? (
                                <Icon key={platform} className="h-3 w-3 text-gray-500" />
                              ) : (
                                <span key={platform} className="text-xs text-gray-500">
                                  {platform.slice(0, 2)}
                                </span>
                              )
                            })}
                            {postIdea.platforms.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{postIdea.platforms.length - 3}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {postIdea.contentType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={getStatusColor(postIdea.status)}>
                          {formatStatusText(postIdea.status)}
                        </Badge>
                        <PostIdeaActions 
                          postIdea={postIdea} 
                          onToggleStatus={handleRefresh}
                        />
                      </div>
                    </div>

                    {postIdea.caption && (
                      <p className="text-sm text-gray-600 mb-3">
                        {postIdea.caption}
                      </p>
                    )}

                    {postIdea.shotList.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Shot List ({postIdea.shotList.length})
                        </h4>
                        <ul className="space-y-1">
                          {postIdea.shotList.map((shot, shotIndex) => (
                            <li key={shotIndex} className="text-sm text-gray-600 flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                              {shot}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {postIdea.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Notes:</strong> {postIdea.notes}
                      </div>
                    )}
                  </div>
                  
                  {index < postIdeas.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Plus}
              title="No post ideas yet"
              description="Add your first post idea to start planning your content for this shoot."
              action={{
                label: "Add Post Idea",
                children: (
                  <AddPostIdeaForm shootId={shootId} onSuccess={handleRefresh}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Post Idea
                    </Button>
                  </AddPostIdeaForm>
                )
              }}
            />
          )}
        </div>
      </div>
    </MobileLayout>
  )
} 