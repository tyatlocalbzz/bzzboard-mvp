'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostIdeaSection } from '@/components/shoots/post-idea-section'
import { QuickAddAction } from '@/components/shoots/quick-add-action'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StopCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useAsync } from '@/lib/hooks/use-async'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { toast } from 'sonner'
import { shootsApi } from '@/lib/api/shoots'
import type { ActiveShootData, PostIdeaData } from '@/lib/types/shoots'

export default function ActiveShootPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { elapsedTime, endShoot: endActiveShoot } = useActiveShoot()
  
  const [activeData, setActiveData] = useState<ActiveShootData | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  
  // Fetch initial data
  const { loading: endLoading, execute: executeEndShoot } = useAsync(shootsApi.endShoot)

  // Load shoot data
  useEffect(() => {
    const loadData = async () => {
      if (!shootId) {
        console.log('❌ No shootId provided')
        return
      }
      
      try {
        console.log('🔍 Loading active shoot data for ID:', shootId)
        setIsInitialLoading(true)
        
        // Direct API call instead of using useAsync
        const data = await shootsApi.fetchActiveShootData(shootId)
        console.log('📊 Received data:', data)
        console.log('📊 Data type:', typeof data)
        console.log('📊 Data keys:', data ? Object.keys(data) : 'null')
        
        if (data && data.shoot && data.postIdeas) {
          setActiveData(data)
          console.log('✅ Active data set successfully')
        } else {
          console.error('❌ Invalid data structure received:', data)
          
          // Show error instead of fallback data
          console.error('❌ Invalid data structure - redirecting to shoot details')
          toast.error('Failed to load active shoot data')
          router.push(`/shoots/${shootId}`)
        }
      } catch (error) {
        console.error('❌ Error loading data:', error)
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        })
        
        // Show error and redirect instead of fallback data
        console.error('❌ Error loading active shoot - redirecting to shoot details')
        toast.error('Failed to load active shoot data')
        router.push(`/shoots/${shootId}`)
      } finally {
        setIsInitialLoading(false)
        console.log('🏁 Loading completed, isInitialLoading set to false')
      }
    }

    loadData()
  }, [shootId, router]) // Added router dependency

  // Calculate progress
  const { totalPosts, completedPosts, activePostIdeas, completedPostIdeas } = useMemo(() => {
    if (!activeData) return { totalPosts: 0, completedPosts: 0, activePostIdeas: [], completedPostIdeas: [] }

    // Separate post ideas into active (has incomplete shots) and completed (all shots done)
    const active = activeData.postIdeas.filter(idea => 
      idea.shots.some(shot => !shot.completed)
    )
    
    const completedIdeas = activeData.postIdeas.filter(idea => 
      idea.shots.length > 0 && idea.shots.every(shot => shot.completed)
    )

    return {
      totalPosts: activeData.postIdeas.length,
      completedPosts: completedIdeas.length,
      activePostIdeas: active,
      completedPostIdeas: completedIdeas
    }
  }, [activeData])

  // Handlers
  const handleShotToggle = useCallback(async (shotId: number) => {
    if (!activeData) return
    
    await shootsApi.toggleShot(shotId)
    
    // Update local state
    setActiveData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        postIdeas: prev.postIdeas.map(idea => ({
          ...idea,
          shots: idea.shots.map(shot => 
            shot.id === shotId ? { ...shot, completed: !shot.completed } : shot
          )
        }))
      }
    })
  }, [activeData])

  const handleShotEdit = useCallback(async (shotId: number, text: string, notes?: string) => {
    await shootsApi.editShot(shotId, text, notes)
    
    // Update local state
    setActiveData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        postIdeas: prev.postIdeas.map(idea => ({
          ...idea,
          shots: idea.shots.map(shot => 
            shot.id === shotId ? { ...shot, text, notes } : shot
          )
        }))
      }
    })
    
    toast.success('Shot updated!')
  }, [])

  const handleAddShot = useCallback(async (postIdeaId: number, shotText: string, notes?: string) => {
    const newShot = await shootsApi.addShot(postIdeaId, shotText, notes)
    
    // Update local state with new shot
    setActiveData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        postIdeas: prev.postIdeas.map(idea => 
          idea.id === postIdeaId 
            ? { ...idea, shots: [...idea.shots, newShot] }
            : idea
        )
      }
    })
    
    toast.success('Shot added!')
  }, [])

  const handleAddPostIdea = useCallback(async (postIdeaData: PostIdeaData) => {
    const newPostIdea = await shootsApi.addPostIdea(shootId, postIdeaData)
    
    // Update local state with new post idea
    setActiveData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        postIdeas: [...prev.postIdeas, newPostIdea]
      }
    })
    
    toast.success('Post idea added!')
  }, [shootId])

  const handlePostIdeaClick = useCallback((postIdeaId: number) => {
    // Navigate to post idea details (back to shoot details page with focus on specific post idea)
    router.push(`/shoots/${shootId}#post-idea-${postIdeaId}`)
  }, [router, shootId])

  const handleEndShootClick = useCallback(() => {
    setShowEndDialog(true)
  }, [])

  const handleConfirmEndShoot = useCallback(async () => {
    await executeEndShoot(shootId)
    endActiveShoot() // End the global active shoot
    setShowEndDialog(false)
    toast.success('Shoot ended successfully!')
    router.push(`/shoots/${shootId}`)
  }, [executeEndShoot, shootId, router, endActiveShoot])

  const handleCancelEndShoot = useCallback(() => {
    setShowEndDialog(false)
  }, [])

  // Show loading state
  if (isInitialLoading || !activeData) {
    console.log('🔄 Rendering loading state - isInitialLoading:', isInitialLoading, 'activeData:', !!activeData)
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

  console.log('✅ Rendering active shoot page with data:', activeData)

  const progressPercentage = totalPosts > 0 ? (completedPosts / totalPosts) * 100 : 0

  return (
    <MobileLayout
      title={activeData.shoot.client}
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
      <QuickAddAction
        onAddPostIdea={handleAddPostIdea}
      />

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