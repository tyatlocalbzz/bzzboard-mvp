'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Separator } from '@/components/ui/separator'
import { PostDetailHeader } from '@/components/posts/post-detail-header'
import { PostPlatformsSection } from '@/components/posts/post-platforms-section'
import { PostContentSection } from '@/components/posts/post-content-section'
import { PostShotListSection } from '@/components/posts/post-shot-list-section'
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { AssignToShootDialog } from '@/components/posts/assign-to-shoot-dialog'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { usePostData } from '@/lib/hooks/use-post-data'
import { usePosts } from '@/lib/hooks/use-posts'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { PostDependencies } from '@/lib/types/client'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDuplicateForm, setShowDuplicateForm] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [postDependencies, setPostDependencies] = useState<PostDependencies | null>(null)
  const [loadingDependencies, setLoadingDependencies] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Memoize the onError callback to prevent infinite loops
  const handlePostError = useCallback((error: string) => {
    console.error('Error loading post:', error)
  }, [])

  // Use the custom hook for post data management
  const { post, isLoading, error, refresh } = usePostData({
    postId,
    onError: handlePostError
  })

  // Use posts hook for mutations (duplicate, assign, delete with dependencies)
  const { duplicatePost, assignToShoot, deletePost: deletePostWithDeps, fetchPostDependencies } = usePosts()

  // Action handlers
  const handleEdit = () => setShowEditForm(true)
  
  const handleDuplicate = () => setShowDuplicateForm(true)
  
  const handleAssignToShoot = () => setShowAssignDialog(true)
  
  const handleDelete = async () => {
    setShowDeleteDialog(true)
    
    if (!post) return
    
    // Fetch dependencies for this post
    try {
      setLoadingDependencies(true)
      const dependencies = await fetchPostDependencies(post.id)
      setPostDependencies(dependencies)
    } catch (error) {
      console.error('Error fetching dependencies:', error)
      setPostDependencies(null)
    } finally {
      setLoadingDependencies(false)
    }
  }

  const handleDeleteConfirm = async (cascade: boolean = false) => {
    if (!post) return

    try {
      setIsDeleting(true)
      const result = await deletePostWithDeps(post.id, cascade)
      
      if (cascade && result.deletedItems) {
        const { shoots, files } = result.deletedItems
        let message = `Post "${post.title}" deleted successfully`
        if (shoots > 0 || files > 0) {
          const details = []
          if (shoots > 0) details.push(`${shoots} shoot assignment${shoots !== 1 ? 's' : ''}`)
          if (files > 0) details.push(`${files} file${files !== 1 ? 's' : ''}`)
          message += ` (also removed ${details.join(' and ')})`
        }
        toast.success(message)
      } else {
        toast.success('Post deleted successfully')
      }
      
      setShowDeleteDialog(false)
      setPostDependencies(null)
      router.push('/posts')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicateSuccess = async () => {
    if (!post) return

    try {
      await duplicatePost(post)
      toast.success(`"${post.title}" duplicated successfully!`)
      setShowDuplicateForm(false)
      // Optionally refresh or navigate to the new post
      refresh()
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate post')
    }
  }

  const handleAssignSuccess = async (postId: number, shootId: number) => {
    try {
      await assignToShoot(postId, shootId)
      toast.success('Post assigned to shoot successfully!')
      setShowAssignDialog(false)
      refresh()
    } catch (error) {
      console.error('Assign error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign post to shoot')
    }
  }

  const handleEditSuccess = () => {
    setShowEditForm(false)
    refresh()
  }

  // Show loading state
  if (isLoading) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref="/posts"
        showBottomNav={false}
        loading={true}
      >
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading post data...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  // Show error state
  if (error) {
    return (
      <MobileLayout 
        title="Error"
        backHref="/posts"
        showBottomNav={false}
      >
        <EmptyState
          icon={FileText}
          title="Failed to load post"
          description={error}
          action={{
            label: "Try Again",
            onClick: refresh
          }}
        />
      </MobileLayout>
    )
  }

  if (!post) {
    return (
      <MobileLayout 
        title="Post Not Found"
        backHref="/posts"
        showBottomNav={false}
      >
        <EmptyState
          icon={FileText}
          title="Post not found"
          description="The post you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Posts",
            onClick: () => router.push('/posts')
          }}
        />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title="Post Details"
      backHref="/posts"
      showBottomNav={false}
    >
      {/* Post Header with Actions */}
      <PostDetailHeader 
        post={post}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onAssignToShoot={handleAssignToShoot}
        isDeleting={isDeleting}
      />

      {/* Post Content */}
      <div className="px-3 py-4 space-y-6">
        {/* Platforms Section */}
        <PostPlatformsSection platforms={post.platforms} />
        
        <Separator />
        
        {/* Content Section (Caption & Notes) */}
        <PostContentSection 
          caption={post.caption}
          notes={post.notes}
        />
        
        {(post.caption || post.notes) && <Separator />}
        
        {/* Shot List Section */}
        <PostShotListSection shotList={post.shotList} />
      </div>

      {/* Edit Post Dialog */}
      <PostIdeaForm
        mode="edit"
        context="standalone"
        postIdea={post}
        onSuccess={handleEditSuccess}
        onCancel={() => setShowEditForm(false)}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />

      {/* Duplicate Post Dialog */}
      <PostIdeaForm
        mode="duplicate"
        context="standalone"
        postIdea={post}
        onSuccess={handleDuplicateSuccess}
        onCancel={() => setShowDuplicateForm(false)}
        open={showDuplicateForm}
        onOpenChange={setShowDuplicateForm}
      />

      {/* Assign to Shoot Dialog */}
      <AssignToShootDialog
        isOpen={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        post={post}
        onAssign={handleAssignSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) setPostDependencies(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Post"
        description="Are you sure you want to delete this post idea?"
        itemName={post.title}
        postDependencies={postDependencies || undefined}
        isLoading={isDeleting || loadingDependencies}
      />
    </MobileLayout>
  )
} 