'use client'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Edit, MoreHorizontal, Unlink } from "lucide-react"
import { useAsync } from "@/lib/hooks/use-async"
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { toast } from "sonner"

interface PostIdeaActionsProps {
  postIdea: {
    id: number
    title: string
    platforms: string[]
    contentType: 'photo' | 'video' | 'reel' | 'story'
    caption?: string
    shotList: string[]
    notes?: string
    status: 'planned' | 'shot' | 'uploaded'
  }
  shootId: string
  onSuccess: () => void
}

export const PostIdeaActions = ({ postIdea, shootId, onSuccess }: PostIdeaActionsProps) => {
  const { loading: toggleLoading, execute: executeToggle } = useAsync(async (postId: number) => {
    // Mock toggle for now - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 400))
    console.log('Toggling post idea status:', postId)
    return { success: true }
  })

  const { loading: removeLoading, execute: executeRemove } = useAsync(async (postId: number, shootId: string) => {
    const response = await fetch(`/api/posts/${postId}/remove-from-shoot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shootId: parseInt(shootId) })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to remove post from shoot')
    }

    return await response.json()
  })

  const handleToggleStatus = async () => {
    const result = await executeToggle(postIdea.id)
    if (result) {
      onSuccess()
    }
  }

  const handleRemoveFromShoot = async () => {
    const result = await executeRemove(postIdea.id, shootId)
    if (result?.success) {
      toast.success(`"${postIdea.title}" removed from shoot`)
      onSuccess()
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
        <PostIdeaForm
          mode="edit"
          context="shoot"
          shootId={shootId}
          postIdea={{
            id: postIdea.id,
            title: postIdea.title,
            platforms: postIdea.platforms,
            contentType: postIdea.contentType,
            caption: postIdea.caption,
            shotList: postIdea.shotList,
            notes: postIdea.notes,
            status: postIdea.status,
            client: null, // Will be populated by context
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          onSuccess={onSuccess}
          trigger={
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          }
        />
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleToggleStatus}
          disabled={toggleLoading}
          className="cursor-pointer"
        >
          {toggleLoading ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Badge variant="outline" className="mr-2 h-4 w-4 p-0" />
          )}
          {getStatusAction()}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRemoveFromShoot}
          disabled={removeLoading}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          {removeLoading ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Unlink className="h-4 w-4 mr-2" />
          )}
          Remove from Shoot
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 