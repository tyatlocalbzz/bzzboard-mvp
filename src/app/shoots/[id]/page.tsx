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
import { Calendar, Clock, MapPin, Edit, Plus, MoreHorizontal, Users, Instagram, Linkedin, Facebook, Youtube, Trash2, Play } from "lucide-react"
import { formatStatusText } from "@/lib/utils/status"
import { useAsync } from "@/lib/hooks/use-async"
import { useActiveShoot } from "@/contexts/active-shoot-context"
import { toast } from "sonner"

// Types based on database schema
interface Shoot {
  id: number
  title: string
  client: string
  scheduledAt: string
  duration: number
  location: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  notes?: string
}

interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  status: 'planned' | 'shot' | 'uploaded'
  notes?: string
  completed?: boolean
}

interface RescheduleData {
  date: string
  time: string
}

interface PostIdeaData {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList: string[]
  notes?: string
}

interface EditShootData {
  title: string
  client: string
  duration: number
  location: string
  notes?: string
}

// Mock API functions - replace with real API calls
const fetchShoot = async (id: string): Promise<Shoot> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    id: parseInt(id),
    title: "Acme Corp Q1 Content Shoot",
    client: "Acme Corporation",
    scheduledAt: "2024-01-20T14:00:00Z",
    duration: 120,
    location: "Downtown Studio",
    status: "scheduled",
    notes: "Bring extra lighting equipment for product shots"
  }
}

const fetchPostIdeas = async (shootId: string): Promise<PostIdea[]> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log('Fetching post ideas for shoot:', shootId)
  return [
    {
      id: 1,
      title: "Product Launch Announcement",
      platforms: ["Instagram", "LinkedIn"],
      contentType: "photo",
      caption: "Exciting news coming soon! 🚀",
      shotList: ["Hero product shot", "Behind the scenes", "Team reaction"],
      status: "planned",
      completed: false
    },
    {
      id: 2,
      title: "Behind the Scenes Video",
      platforms: ["Instagram", "Facebook"],
      contentType: "video",
      shotList: ["Setup process", "Team working", "Final reveal"],
      status: "shot",
      completed: true
    }
  ]
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

const addPostIdea = async (shootId: string, data: PostIdeaData) => {
  await new Promise(resolve => setTimeout(resolve, 600))
  console.log('Adding post idea:', shootId, data)
  return { 
    id: Date.now(),
    ...data,
    status: 'planned' as const,
    completed: false
  }
}

const editPostIdea = async (postIdeaId: number, data: PostIdeaData) => {
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
            
                         <p className="text-sm text-gray-700 mb-6">
               Are you sure you want to delete &ldquo;<strong>{shoot.title}</strong>&rdquo;? All associated post ideas will also be deleted.
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
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700"
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
    const duration = parseInt(formData.get('duration') as string) || 60
    const location = formData.get('location') as string
    const notes = formData.get('notes') as string

    const result = await execute(shoot.id.toString(), {
      title,
      client,
      duration,
      location,
      notes
    })
    
    if (result) {
      toast.success('Shoot details updated successfully!')
      setIsOpen(false)
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
            <Edit className="h-5 w-5" />
            Edit Shoot Details
          </SheetTitle>
          <SheetDescription>
            Update the shoot information
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col h-full px-4 pb-4">
          <form action={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto">
              <MobileInput
                name="title"
                label="Shoot Title"
                placeholder="e.g., Q1 Product Launch Content"
                defaultValue={shoot.title}
                required
              />

              <MobileInput
                name="client"
                label="Client"
                placeholder="Client name"
                defaultValue={shoot.client}
                required
              />

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
                placeholder="e.g., Downtown Studio, Client Office"
                defaultValue={shoot.location}
                required
              />

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Special requirements, equipment needed, shot list ideas..."
                  className="min-h-[80px] text-base tap-target resize-none"
                  rows={3}
                  defaultValue={shoot.notes || ''}
                />
              </div>
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
                loadingText="Saving..."
              >
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
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

  // Get current date values for defaults
  const currentDate = new Date(shoot.scheduledAt)
  const defaultDate = currentDate.toISOString().split('T')[0]
  const defaultTime = currentDate.toTimeString().slice(0, 5)
  const today = new Date().toISOString().split('T')[0]

  const formContent = (
    <div className="grid grid-cols-2 gap-3">
      <MobileInput
        name="date"
        label="New Date"
        type="date"
        min={today}
        defaultValue={defaultDate}
        required
      />
      <MobileInput
        name="time"
        label="New Time"
        type="time"
        defaultValue={defaultTime}
        required
      />
    </div>
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
      height="60vh"
      maxHeight="400px"
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

  const platforms = [
    { name: 'Instagram', icon: Instagram },
    { name: 'Facebook', icon: Facebook },
    { name: 'LinkedIn', icon: Linkedin },
    { name: 'YouTube', icon: Youtube }
  ]

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
                        className="h-12 justify-start gap-2 tap-target"
                        onClick={() => togglePlatform(platform.name)}
                      >
                        <Icon className="h-4 w-4" />
                        {platform.name}
                      </Button>
                    )
                  })}
                </div>
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
  postIdea: PostIdea
  onSuccess: () => void
}

const EditPostIdeaForm = ({ children, postIdea, onSuccess }: EditPostIdeaFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(postIdea.platforms)
  const { loading, execute } = useAsync(editPostIdea)

  const platforms = [
    { name: 'Instagram', icon: Instagram },
    { name: 'Facebook', icon: Facebook },
    { name: 'LinkedIn', icon: Linkedin },
    { name: 'YouTube', icon: Youtube }
  ]

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

  // Reset selected platforms when opening the form
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedPlatforms(postIdea.platforms)
    }
    setIsOpen(open)
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
                placeholder="e.g., Product Launch Announcement"
                defaultValue={postIdea.title}
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
                        className="h-12 justify-start gap-2 tap-target"
                        onClick={() => togglePlatform(platform.name)}
                      >
                        <Icon className="h-4 w-4" />
                        {platform.name}
                      </Button>
                    )
                  })}
                </div>
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
                placeholder="Write your caption here..."
                defaultValue={postIdea.caption || ''}
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
                  defaultValue={postIdea.shotList.join('\n')}
                />
              </div>

              <MobileInput
                name="notes"
                label="Notes (Optional)"
                placeholder="Any additional notes..."
                defaultValue={postIdea.notes || ''}
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
                loadingText="Saving..."
              >
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Post Idea Actions Component - DRY pattern for reusable actions
interface PostIdeaActionsProps {
  postIdea: PostIdea
  onToggleStatus: () => void
}

const PostIdeaActions = ({ postIdea, onToggleStatus }: PostIdeaActionsProps) => {
  const { loading, execute } = useAsync(togglePostIdeaStatus)

  const handleToggleStatus = async () => {
    const result = await execute(postIdea.id)
    if (result) {
      toast.success('Status updated!')
      onToggleStatus()
    }
  }

  const getNextStatus = () => {
    switch (postIdea.status) {
      case 'planned': return 'shot'
      case 'shot': return 'uploaded'
      case 'uploaded': return 'planned'
      default: return 'planned'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100"
          aria-label="Post idea actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleToggleStatus}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? (
            <LoadingSpinner size="md" color="current" className="mr-2" />
          ) : (
            <Edit className="h-4 w-4 mr-2" />
          )}
          Mark as {getNextStatus()}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <EditPostIdeaForm postIdea={postIdea} onSuccess={onToggleStatus}>
          <DropdownMenuItem 
            className="cursor-pointer text-gray-600"
            onSelect={(e) => e.preventDefault()}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
        </EditPostIdeaForm>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ShootDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { startShoot, isShootActive, activeShoot } = useActiveShoot()
  
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch shoot data
  const { data: shoot, loading: shootLoading, execute: executeShoot } = useAsync(fetchShoot)
  
  // Fetch post ideas
  const { data: postIdeas, loading: postIdeasLoading, execute: executePostIdeas } = useAsync(fetchPostIdeas)

  // Auto-fetch data when shootId or refreshKey changes
  useEffect(() => {
    if (shootId) {
      executeShoot(shootId)
      executePostIdeas(shootId)
    }
  }, [shootId, refreshKey, executeShoot, executePostIdeas])

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleStartShoot = () => {
    if (!shoot) return
    
    // Check if there's already an active shoot
    if (isShootActive && activeShoot && activeShoot.id !== shoot.id) {
      toast.error('You already have an active shoot. Please end it first.')
      return
    }
    
    // Start the shoot
    startShoot({
      id: shoot.id,
      title: shoot.title,
      client: shoot.client,
      startedAt: new Date().toISOString()
    })
    
    toast.success('Shoot started!')
    router.push(`/shoots/${shootId}/active`)
  }

  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'active': return 'destructive'
      case 'completed': return 'secondary'
      case 'cancelled': return 'outline'
      case 'planned': return 'secondary'
      case 'shot': return 'default'
      case 'uploaded': return 'outline'
      default: return 'default'
    }
  }

  if (shootLoading || !shoot) {
    return (
      <MobileLayout 
        title="Loading..." 
        backHref="/shoots"
        loading={true}
      >
        <div />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout 
      title={shoot.title}
      backHref="/shoots"
      showClientSelector={false}
      headerAction={
        <ShootActions shoot={shoot} onSuccess={handleRefresh}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            aria-label="Shoot actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ShootActions>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* Shoot Information */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Shoot Details</h2>
          <div className="space-y-3">
            {/* Status and Client */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{shoot.client}</div>
                <div className="text-xs text-gray-600">Client</div>
              </div>
              <Badge variant={getStatusColor(shoot.status)} className="text-xs">
                {formatStatusText(shoot.status)}
              </Badge>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-100">
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-900">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Date</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatDate(shoot.scheduledAt)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-900">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Time</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatTime(shoot.scheduledAt)} ({formatDuration(shoot.duration)})
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1 text-sm text-gray-900 mb-1">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Location</span>
              </div>
              <div className="text-xs text-gray-600">{shoot.location}</div>
            </div>

            {/* Notes */}
            {shoot.notes && (
              <div className="pt-3 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-900 mb-1">Notes</div>
                <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                  {shoot.notes}
                </div>
              </div>
            )}
          </div>
          
          {/* Start Shoot Button - Only show if shoot is scheduled */}
          {shoot.status === 'scheduled' && (
            <div className="pt-3 border-t border-gray-100">
              {isShootActive && activeShoot && activeShoot.id === shoot.id ? (
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  onClick={() => router.push(`/shoots/${shootId}/active`)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Continue Active Shoot
                </Button>
              ) : (
                <Button
                  className="w-full h-12 text-base font-medium"
                  onClick={handleStartShoot}
                  disabled={!!(isShootActive && activeShoot && activeShoot.id !== shoot.id)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Shoot
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Post Ideas Section */}
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
          
          {postIdeasLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : postIdeas && postIdeas.length > 0 ? (
            <div className="space-y-3">
              {postIdeas.map((idea, index) => (
                <div key={idea.id}>
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{idea.title}</h4>
                        <div className="text-xs text-gray-600 mt-1">
                          {idea.platforms.join(", ")} • {idea.contentType}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Badge variant={getStatusColor(idea.status)} className="text-xs">
                          {idea.status}
                        </Badge>
                        <PostIdeaActions postIdea={idea} onToggleStatus={handleRefresh} />
                      </div>
                    </div>

                    {idea.caption && (
                      <div className="text-xs text-gray-600 mb-2 italic">
                        &ldquo;{idea.caption}&rdquo;
                      </div>
                    )}

                    {idea.shotList.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Shots:</span> {idea.shotList.join(", ")}
                      </div>
                    )}
                  </div>
                  
                  {/* Add separator between post ideas, but not after the last one */}
                  {index < postIdeas.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No post ideas yet"
              description="Add your first post idea to get started"
            />
          )}
        </div>
      </div>
    </MobileLayout>
  )
} 