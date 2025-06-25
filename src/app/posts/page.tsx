'use client'

import { useState } from 'react'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PostIdeaCard } from '@/components/posts/post-idea-card'
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { AssignToShootDialog } from '@/components/posts/assign-to-shoot-dialog'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { usePosts, type PostIdea } from '@/lib/hooks/use-posts'
import { useClient } from '@/contexts/client-context'
import { Plus, Search, Filter, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function PostsPage() {
  const { selectedClient } = useClient()
  const [editingPost, setEditingPost] = useState<PostIdea | null>(null)
  const [duplicatingPost, setDuplicatingPost] = useState<PostIdea | null>(null)
  const [deletingPost, setDeletingPost] = useState<PostIdea | null>(null)
  const [assigningPost, setAssigningPost] = useState<PostIdea | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    posts,
    loading,
    error,
    filters,
    updateFilters,
    deletePost,
    duplicatePost,
    assignToShoot,
    fetchPosts 
  } = usePosts()

  const handleCreateSuccess = () => {
    // Post is already added to the list by the hook
    fetchPosts()
  }

  const handleEditSuccess = () => {
    // Post is already updated in the list by the hook
    setEditingPost(null)
    fetchPosts()
  }

  const handleDuplicateSuccess = () => {
    // Post is already added to the list by the hook
    setDuplicatingPost(null)
    fetchPosts()
  }

  const handleEdit = (post: PostIdea) => {
    setEditingPost(post)
  }

  const handleDuplicate = async (post: PostIdea) => {
    try {
      await duplicatePost(post)
      toast.success(`"${post.title}" duplicated successfully!`)
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate post')
    }
  }

  const handleDelete = (post: PostIdea) => {
    setDeletingPost(post)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPost) return

    try {
      setIsDeleting(true)
      await deletePost(deletingPost.id)
      toast.success('Post deleted successfully')
      setDeletingPost(null)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingPost(null)
  }

  const handleAssignToShoot = (post: PostIdea) => {
    setAssigningPost(post)
  }

  const handleAssignToShootConfirm = async (postId: number, shootId: number) => {
    await assignToShoot(postId, shootId)
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
  }

  const handleCancelDuplicate = () => {
    setDuplicatingPost(null)
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Posts</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchPosts} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
        <div className="p-4 space-y-4">
          {/* Create Button */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Posts</h1>
            
            <PostIdeaForm 
              mode="create" 
              context="standalone"
              onSuccess={handleCreateSuccess}
              trigger={
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Post
                </Button>
              }
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posts..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select 
              value={filters.status} 
              onValueChange={(value) => updateFilters({ status: value as 'all' | 'planned' | 'shot' | 'uploaded' })}
            >
              <SelectTrigger className="w-32">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="shot">Shot</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-sm text-gray-600">Loading posts...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              icon={FileText}
              title="No post ideas yet"
              description={
                filters.status !== 'all' || filters.search
                  ? "No posts match your current filters. Try adjusting your search or status filter."
                  : "Create your first post idea to start planning content for your clients."
              }
              action={{
                children: (
                  <PostIdeaForm 
                    mode="create" 
                    context="standalone"
                    onSuccess={handleCreateSuccess}
                    trigger={
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Post
                      </Button>
                    }
                  />
                )
              }}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {posts.map((post) => (
              <PostIdeaCard
                key={post.id}
                post={post}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onAssignToShoot={handleAssignToShoot}
                showClient={selectedClient.type === 'all'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Post Dialog */}
      <PostIdeaForm
        mode="edit"
        context="standalone"
        postIdea={editingPost || undefined}
        onSuccess={handleEditSuccess}
        onCancel={handleCancelEdit}
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      />

      {/* Duplicate Post Dialog */}
      <PostIdeaForm
        mode="duplicate"
        context="standalone"
        postIdea={duplicatingPost || undefined}
        onSuccess={handleDuplicateSuccess}
        onCancel={handleCancelDuplicate}
        open={!!duplicatingPost}
        onOpenChange={(open) => !open && setDuplicatingPost(null)}
      />

      {/* Assign to Shoot Dialog */}
      <AssignToShootDialog
        isOpen={!!assigningPost}
        onOpenChange={(open) => !open && setAssigningPost(null)}
        post={assigningPost}
        onAssign={handleAssignToShootConfirm}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deletingPost}
        onOpenChange={(open) => !open && handleDeleteCancel()}
        onConfirm={handleDeleteConfirm}
        title="Delete Post"
        description="Are you sure you want to delete this post idea? This action cannot be undone."
        itemName={deletingPost?.title || ''}
        isLoading={isDeleting}
      />
    </MobileLayout>
  )
} 