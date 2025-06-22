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

// Types
interface Shot {
  id: number
  text: string
  completed: boolean
  postIdeaId: number
  notes?: string
}

interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  shots: Shot[]
}

interface Shoot {
  id: number
  title: string
  client: string
  scheduledAt: string
  duration: number
  location: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  startedAt?: string
}

interface ActiveShootData {
  shoot: Shoot
  postIdeas: PostIdea[]
}

// Mock API functions - replace with real API calls
const fetchActiveShootData = async (shootId: string): Promise<ActiveShootData> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const mockShots: Shot[] = [
    { id: 1, text: "Hero product shot", completed: false, postIdeaId: 1 },
    { id: 2, text: "Behind the scenes setup", completed: true, postIdeaId: 1 },
    { id: 3, text: "Team reaction shot", completed: false, postIdeaId: 1, notes: "Get genuine reactions" },
    { id: 4, text: "Wide establishing shot", completed: false, postIdeaId: 2 },
    { id: 5, text: "Close-up detail work", completed: false, postIdeaId: 2 },
    { id: 6, text: "Customer using product", completed: false, postIdeaId: 3 },
  ]

  const mockPostIdeas: PostIdea[] = [
    {
      id: 1,
      title: "Product Launch Announcement",
      platforms: ["Instagram", "LinkedIn"],
      contentType: "photo",
      shots: mockShots.filter(shot => shot.postIdeaId === 1)
    },
    {
      id: 2,
      title: "BTS Video Content",
      platforms: ["Instagram", "Facebook"],
      contentType: "video",
      shots: mockShots.filter(shot => shot.postIdeaId === 2)
    },
    {
      id: 3,
      title: "Customer Testimonial",
      platforms: ["LinkedIn", "YouTube"],
      contentType: "video",
      shots: mockShots.filter(shot => shot.postIdeaId === 3)
    }
  ]

  return {
    shoot: {
      id: parseInt(shootId),
      title: "Acme Corp Q1 Content",
      client: "Acme Corporation",
      scheduledAt: new Date().toISOString(),
      duration: 120,
      location: "Downtown Studio",
      status: "active",
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() // Started 45 minutes ago
    },
    postIdeas: mockPostIdeas
  }
}

const toggleShot = async (shotId: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))
  console.log('Toggling shot:', shotId)
}

const editShot = async (shotId: number, text: string, notes?: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log('Editing shot:', { shotId, text, notes })
}

const addShot = async (postIdeaId: number, text: string, notes?: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log('Adding shot:', { postIdeaId, text, notes })
}

const addPostIdea = async (shootId: string, postIdea: {
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  shotList?: string
}): Promise<PostIdea> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Create shots from shot list if provided
  const shots: Shot[] = []
  if (postIdea.shotList) {
    const shotLines = postIdea.shotList.split('\n').filter(line => line.trim())
    shotLines.forEach((line, index) => {
      shots.push({
        id: Date.now() + index, // Mock ID
        text: line.trim(),
        completed: false,
        postIdeaId: Date.now() // Will be updated with actual post idea ID
      })
    })
  }
  
  const newPostIdea: PostIdea = {
    id: Date.now(), // Mock ID
    title: postIdea.title,
    platforms: postIdea.platforms,
    contentType: postIdea.contentType,
    shots: shots.map(shot => ({ ...shot, postIdeaId: Date.now() }))
  }
  
  console.log('Adding post idea:', { shootId, postIdea: newPostIdea })
  return newPostIdea
}

const endShoot = async (shootId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log('Ending shoot:', shootId)
}

export default function ActiveShootPage() {
  const params = useParams()
  const router = useRouter()
  const shootId = params.id as string
  const { elapsedTime, endShoot: endActiveShoot } = useActiveShoot()
  
  const [activeData, setActiveData] = useState<ActiveShootData | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  
  // Fetch initial data
  const { loading: dataLoading, execute: executeDataFetch } = useAsync(fetchActiveShootData)
  const { loading: endLoading, execute: executeEndShoot } = useAsync(endShoot)

  // Load shoot data
  useEffect(() => {
    if (shootId) {
      executeDataFetch(shootId).then(data => {
        if (data) {
          setActiveData(data)
        }
      })
    }
  }, [shootId, executeDataFetch])

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
    
    await toggleShot(shotId)
    
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
    await editShot(shotId, text, notes)
    
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
    await addShot(postIdeaId, shotText, notes)
    
    // Update local state with new shot
    const newShot: Shot = {
      id: Date.now(), // Mock ID
      text: shotText,
      completed: false,
      postIdeaId,
      notes
    }
    
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

  const handleAddPostIdea = useCallback(async (postIdeaData: {
    title: string
    platforms: string[]
    contentType: 'photo' | 'video' | 'reel' | 'story'
    caption?: string
    shotList?: string
  }) => {
    const newPostIdea = await addPostIdea(shootId, postIdeaData)
    
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

  if (dataLoading || !activeData) {
    return (
      <MobileLayout 
        title="Loading..."
        backHref={`/shoots/${shootId}`}
        showBottomNav={false}
        showClientSelector={false}
        loading={true}
      >
        <div />
      </MobileLayout>
    )
  }

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