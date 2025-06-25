'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Link2, Plus } from 'lucide-react'
import { PLATFORM_OPTIONS } from '@/lib/constants/platforms'
import { toast } from 'sonner'

interface PostIdea {
  id: number
  title: string
  platforms: string[]
  contentType: 'photo' | 'video' | 'reel' | 'story'
  caption?: string
  status: 'planned' | 'shot' | 'uploaded'
}

interface AssignExistingPostsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shootId: string
  onSuccess: () => void
}

export const AssignExistingPostsDialog = ({ 
  open, 
  onOpenChange, 
  shootId, 
  onSuccess 
}: AssignExistingPostsDialogProps) => {
  const [posts, setPosts] = useState<PostIdea[]>([])
  const [filteredPosts, setFilteredPosts] = useState<PostIdea[]>([])
  const [selectedPostIds, setSelectedPostIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchAvailablePosts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shoots/${shootId}/available-posts`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch available posts')
      }

      const data = await response.json()
      if (data.success) {
        setPosts(data.posts || [])
      } else {
        throw new Error(data.error || 'Failed to fetch available posts')
      }
    } catch (error) {
      console.error('Error fetching available posts:', error)
      toast.error('Failed to load available post ideas')
    } finally {
      setLoading(false)
    }
  }, [shootId])

  // Fetch available posts when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailablePosts()
    }
  }, [open, fetchAvailablePosts])

  // Filter posts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = posts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.platforms.some(platform => platform.toLowerCase().includes(query)) ||
        post.contentType.toLowerCase().includes(query)
      )
      setFilteredPosts(filtered)
    }
  }, [posts, searchQuery])

  const handlePostToggle = (postId: number) => {
    const newSelected = new Set(selectedPostIds)
    if (newSelected.has(postId)) {
      newSelected.delete(postId)
    } else {
      newSelected.add(postId)
    }
    setSelectedPostIds(newSelected)
  }

  const handleAssignPosts = async () => {
    if (selectedPostIds.size === 0) {
      toast.error('Please select at least one post idea')
      return
    }

    try {
      setAssigning(true)
      
      // Assign each selected post to the shoot
      const promises = Array.from(selectedPostIds).map(postId =>
        fetch(`/api/posts/${postId}/assign-to-shoot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shootId: parseInt(shootId) })
        })
      )

      const responses = await Promise.all(promises)
      const failedAssignments = responses.filter(response => !response.ok)

      if (failedAssignments.length > 0) {
        throw new Error(`Failed to assign ${failedAssignments.length} post idea(s)`)
      }

      toast.success(`Successfully assigned ${selectedPostIds.size} post idea(s) to shoot`)
      onSuccess()
      onOpenChange(false)
      
      // Reset state
      setSelectedPostIds(new Set())
      setSearchQuery('')
      
    } catch (error) {
      console.error('Error assigning posts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign posts')
    } finally {
      setAssigning(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedPostIds(new Set())
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-green-600" />
            Assign Existing Posts
          </DialogTitle>
          <DialogDescription>
            Select post ideas to assign to this shoot.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search post ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Posts List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-sm text-gray-600">Loading posts...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              icon={Plus}
              title={searchQuery ? 'No posts found' : 'No post ideas available'}
              description={
                searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create some post ideas first before assigning them to shoots'
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePostToggle(post.id)}
                >
                  <Checkbox
                    checked={selectedPostIds.has(post.id)}
                    onCheckedChange={() => handlePostToggle(post.id)}
                    className="mt-0.5"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {post.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {post.platforms.slice(0, 3).map((platform) => {
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
                        {post.platforms.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{post.platforms.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 capitalize">
                        {post.contentType}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {post.status}
                      </Badge>
                    </div>

                    {post.caption && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {post.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleAssignPosts}
            disabled={selectedPostIds.size === 0 || assigning}
            className="flex-1"
          >
            {assigning ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Assigning...
              </>
            ) : (
              `Assign ${selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 