'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Calendar } from "lucide-react"
import { formatStatusText, getStatusColor } from "@/lib/utils/status"
import { useClient } from '@/contexts/client-context'
import { useShootData } from '@/lib/hooks/use-shoot-data'
import { ShootHeader } from '@/components/shoots/shoot-header'
import { ShootActions } from '@/components/shoots/shoot-actions'
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { AddPostChoiceDialog } from '@/components/shoots/add-post-choice-dialog'
import { AssignExistingPostsDialog } from '@/components/shoots/assign-existing-posts-dialog'
import { PostIdeaActions } from '@/components/shoots/post-idea-actions'
import { PLATFORM_OPTIONS } from '@/lib/constants/platforms'
import type { ClientData } from '@/lib/types/client'
import type { ShootClient } from '@/lib/types/shoots'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function ShootDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { clients } = useClient()
  
  const [showCreatePostForm, setShowCreatePostForm] = useState(false)
  const [showAssignPostsDialog, setShowAssignPostsDialog] = useState(false)

  // Use the custom hook for data management
  const { shoot, postIdeas, isLoading, error, refresh } = useShootData({
    shootId,
    loadPostIdeas: true
  })

  const handleCreateNewPost = () => setShowCreatePostForm(true)
  const handleAssignExistingPost = () => setShowAssignPostsDialog(true)
  
  // Helper function to find client override
  const getClientOverride = useCallback((clientName: string): ClientData | null => {
    return clients.find(client => client.name === clientName && client.type === 'client') || null
  }, [clients])

  // Helper function to get client name as string
  const getClientName = (client: string | ShootClient): string => {
    return typeof client === 'string' ? client : client?.name || 'Unknown Client'
  }

  // Show loading state
  if (isLoading) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref="/shoots"
        showBottomNav={false}
        loading={true}
      >
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading shoot data...</p>
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
        backHref="/shoots"
        showBottomNav={false}
      >
        <EmptyState
          icon={Calendar}
          title="Failed to load shoot"
          description={error}
          action={{
            label: "Try Again",
            onClick: refresh
          }}
        />
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
      title={getClientName(shoot.client)}
      backHref="/shoots"
      headerAction={
        <ShootActions 
          shoot={shoot} 
          onSuccess={refresh}
        >
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ShootActions>
      }
    >
      {/* Shoot Header with Actions */}
      <ShootHeader 
        shoot={shoot}
        postIdeasCount={postIdeas.length}
        onRefresh={refresh}
      />

      <Separator />

      {/* Post Ideas */}
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Post Ideas</h2>
          <AddPostChoiceDialog 
            onCreateNew={handleCreateNewPost}
            onAssignExisting={handleAssignExistingPost}
          >
            <Button size="sm" className="h-8 px-3 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </AddPostChoiceDialog>
        </div>

        {postIdeas.length > 0 ? (
          <div className="space-y-3">
            {postIdeas.map((postIdea, index) => (
              <div key={postIdea.id}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-card-foreground truncate">
                        {postIdea.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {postIdea.platforms.slice(0, 3).map((platform) => {
                            const platformOption = PLATFORM_OPTIONS.find(p => p.name === platform)
                            const Icon = platformOption?.icon
                            return Icon ? (
                              <Icon key={platform} className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <span key={platform} className="text-xs text-muted-foreground">
                                {platform.slice(0, 2)}
                              </span>
                            )
                          })}
                          {postIdea.platforms.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{postIdea.platforms.length - 3}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {postIdea.contentType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getStatusColor(postIdea.status)}>
                        {formatStatusText(postIdea.status)}
                      </Badge>
                      <PostIdeaActions 
                        postIdea={{
                          ...postIdea,
                          contentType: postIdea.contentType as 'photo' | 'video' | 'reel' | 'story'
                        }} 
                        shootId={shootId}
                        onSuccess={refresh}
                      />
                    </div>
                  </div>

                  {postIdea.caption && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {postIdea.caption}
                    </p>
                  )}

                  {postIdea.shotList.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Shot List ({postIdea.shotList.length})
                      </h4>
                      <ul className="space-y-1">
                        {postIdea.shotList.map((shot, shotIndex) => (
                          <li key={shotIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0" />
                            {shot}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {postIdea.notes && (
                    <div className="mt-3 p-2 bg-muted rounded text-sm text-muted-foreground">
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
                <PostIdeaForm
                  mode="create"
                  context="shoot"
                  shootId={shootId}
                  clientOverride={getClientOverride(getClientName(shoot.client))}
                  onSuccess={refresh}
                  displayMode="dialog"
                  trigger={
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Post Idea
                    </Button>
                  }
                />
              )
            }}
          />
        )}
      </div>

      {/* Create Post Form */}
      <PostIdeaForm
        open={showCreatePostForm}
        onOpenChange={setShowCreatePostForm}
        mode="create"
        context="shoot"
        shootId={shootId}
        clientOverride={getClientOverride(getClientName(shoot.client))}
        onSuccess={() => {
          refresh()
          setShowCreatePostForm(false)
        }}
        onCancel={() => setShowCreatePostForm(false)}
        displayMode="dialog"
      />

      {/* Assign Existing Posts Dialog */}
      <AssignExistingPostsDialog
        open={showAssignPostsDialog}
        onOpenChange={setShowAssignPostsDialog}
        shootId={shootId}
        onSuccess={refresh}
      />
    </MobileLayout>
  )
} 