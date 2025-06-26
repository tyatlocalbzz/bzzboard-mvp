'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostIdeaSection } from '@/components/shoots/post-idea-section'
import { PostIdeaForm } from '@/components/posts/post-idea-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StopCircle, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { useClient } from '@/contexts/client-context'
import { useShootData } from '@/lib/hooks/use-shoot-data'
import { useShootActions } from '@/lib/hooks/use-shoot-actions'
import { ShootsApi } from '@/lib/api/shoots-unified'
import { ClientData } from '@/lib/types/client'
import type { ShootClient } from '@/lib/types/shoots'
import { toast } from 'sonner'

export default function ActiveShootPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { elapsedTime, endShoot: endActiveShoot } = useActiveShoot()
  const { clients } = useClient()
  
  const [showCompleted, setShowCompleted] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)

  // Memoize onError callback to prevent infinite loops
  const handleError = useCallback((error: string) => {
    console.error('Failed to load active shoot data:', error)
    toast.error('Failed to load active shoot data')
    router.push(`/shoots/${shootId}`)
  }, [router, shootId])

  // Use the custom hook for data management
  const { shoot, postIdeas, isLoading, refresh } = useShootData({
    shootId,
    onError: handleError
  })

  // Memoize onSuccess callback to prevent infinite loops
  const handleSuccess = useCallback(() => {
    endActiveShoot()
    toast.success('Shoot ended successfully!')
    router.push(`/shoots/${shootId}`)
  }, [endActiveShoot, router, shootId])

  // Use shoot actions hook for ending the shoot
  const { completeShoot, isLoading: endLoading } = useShootActions({
    shoot: shoot!,
    onSuccess: handleSuccess
  })

  // Calculate progress from post ideas
  const { totalPosts, completedPosts, activePostIdeas, completedPostIdeas } = useMemo(() => {
    if (!postIdeas.length) return { totalPosts: 0, completedPosts: 0, activePostIdeas: [], completedPostIdeas: [] }

    // Convert ExtendedPostIdea to PostIdea format with mock shots data
    const convertedPostIdeas = postIdeas.map(idea => ({
      ...idea,
      contentType: idea.contentType as 'photo' | 'video' | 'reel' | 'story',
      shots: idea.shotList.map((shot, index) => ({
        id: index + 1,
        postIdeaId: idea.id,
        text: shot,
        completed: idea.completed || false,
        notes: ''
      }))
    }))

    const active = convertedPostIdeas.filter(idea => !idea.completed)
    const completed = convertedPostIdeas.filter(idea => idea.completed)

    return {
      totalPosts: postIdeas.length,
      completedPosts: completed.length,
      activePostIdeas: active,
      completedPostIdeas: completed
    }
  }, [postIdeas])

  // Handlers for shot management
  const handleShotToggle = useCallback(async (shotId: number) => {
    await ShootsApi.toggleShot(shotId)
    refresh() // Refresh data after toggle
  }, [refresh])

  const handleShotEdit = useCallback(async (shotId: number, text: string, notes?: string) => {
    await ShootsApi.editShot(shotId, text, notes)
    refresh() // Refresh data after edit
    toast.success('Shot updated!')
  }, [refresh])

  const handleAddShot = useCallback(async (postIdeaId: number, shotText: string, notes?: string) => {
    await ShootsApi.addShot(postIdeaId, shotText, notes)
    refresh() // Refresh data after adding
    toast.success('Shot added!')
  }, [refresh])

  const handlePostIdeaClick = useCallback((postIdeaId: number) => {
    router.push(`/shoots/${shootId}#post-idea-${postIdeaId}`)
  }, [router, shootId])

  const handleEndShootClick = useCallback(() => {
    setShowEndDialog(true)
  }, [])

  const handleConfirmEndShoot = useCallback(async () => {
    await completeShoot()
    setShowEndDialog(false)
  }, [completeShoot])

  const handleCancelEndShoot = useCallback(() => {
    setShowEndDialog(false)
  }, [])

  // Helper function to find client override
  const getClientOverride = useCallback((clientName: string): ClientData | null => {
    return clients.find(client => client.name === clientName && client.type === 'client') || null
  }, [clients])

  // Show loading state
  if (isLoading || !shoot) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref={`/shoots/${shootId}`}
        showBottomNav={false}
        showClientSelector={false}
        loading={true}
      >
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <LoadingSpinner size="lg" color="blue" className="mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading shoot data...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  const progressPercentage = totalPosts > 0 ? (completedPosts / totalPosts) * 100 : 0

  // Helper function to get client name as string
  const getClientName = (client: string | ShootClient): string => {
    return typeof client === 'string' ? client : client?.name || 'Unknown Client'
  }

  return (
    <MobileLayout
      title={getClientName(shoot.client)}
      backHref={`/shoots/${shootId}`}
      showBottomNav={true}
      showClientSelector={false}
      headerAction={
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono text-gray-600">
            {elapsedTime}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndShootClick}
            disabled={endLoading}
            className="h-8 px-3 text-xs"
          >
            {endLoading ? (
              <LoadingSpinner size="sm" color="current" className="mr-1" />
            ) : (
              <StopCircle className="h-3 w-3 mr-1" />
            )}
            End
          </Button>
        </div>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Posts Complete</span>
            <span className="text-sm font-medium text-gray-900">
              {completedPosts} of {totalPosts}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Active Post Ideas */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Remaining Shots</h2>
          {activePostIdeas.length > 0 ? (
            <div className="space-y-4">
              {activePostIdeas.map((postIdea) => (
                <PostIdeaSection
                  key={postIdea.id}
                  postIdea={postIdea}
                  onShotToggle={handleShotToggle}
                  onShotEdit={handleShotEdit}
                  onPostIdeaClick={handlePostIdeaClick}
                  onAddShot={handleAddShot}
                  defaultExpanded={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-medium text-gray-900 mb-2">
                🎉 All shots complete!
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Great work! You&apos;ve captured all the planned shots.
              </div>
              <Button onClick={handleEndShootClick} disabled={endLoading}>
                {endLoading ? (
                  <>
                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                    Ending Shoot...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Shoot
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Completed Post Ideas Section */}
        {completedPostIdeas.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  Completed Post Ideas ({completedPostIdeas.length})
                </h2>
                {showCompleted ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {showCompleted && (
                <div className="space-y-4 opacity-60">
                  {completedPostIdeas.map((postIdea) => (
                    <PostIdeaSection
                      key={postIdea.id}
                      postIdea={postIdea}
                      onShotToggle={handleShotToggle}
                      onShotEdit={handleShotEdit}
                      onPostIdeaClick={handlePostIdeaClick}
                      onAddShot={handleAddShot}
                      defaultExpanded={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Add Post Idea FAB */}
      <div className="fixed bottom-20 right-4 z-40">
        <PostIdeaForm
          mode="quick-add"
          context="shoot"
          shootId={shootId}
          clientOverride={getClientOverride(getClientName(shoot.client))}
          onSuccess={refresh}
          displayMode="dialog"
          trigger={
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-6 w-6" />
            </Button>
          }
        />
      </div>

      {/* End Shoot Confirmation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Shoot</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this shoot? This will stop the timer and mark the shoot as complete.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEndShoot}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmEndShoot}
              disabled={endLoading}
              className="flex-1"
            >
              {endLoading ? (
                <>
                  <LoadingSpinner size="sm" color="current" className="mr-2" />
                  Ending...
                </>
              ) : (
                'End Shoot'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  )
} 