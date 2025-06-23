'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { ListItem } from "@/components/ui/list-item"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { ActionMenu } from "@/components/ui/action-menu"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Calendar, MapPin, Clock, Users, Filter, ArrowUpDown } from "lucide-react"
import { ScheduleShootForm } from "@/components/shoots/schedule-shoot-form"
import { useClient } from "@/contexts/client-context"
import { formatStatusText, getStatusColor } from "@/lib/utils/status"

// Mock shoot data type
interface Shoot {
  id: number
  title: string
  client: string
  scheduledAt: string
  duration: number // in minutes
  location: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  postIdeasCount: number
  notes?: string
}

// Real API function to fetch shoots
const fetchShoots = async (clientName?: string): Promise<Shoot[]> => {
  const params = new URLSearchParams()
  if (clientName && clientName !== 'All Clients') {
    params.append('client', clientName)
  }
  
  const response = await fetch(`/api/shoots${params.toString() ? `?${params.toString()}` : ''}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch shoots: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shoots')
  }
  
  return data.shoots || []
}

const ITEMS_PER_PAGE = 10

export default function ShootsPage() {
  const { selectedClient } = useClient()
  const router = useRouter()
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [allShoots, setAllShoots] = useState<Shoot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<'all' | Shoot['status']>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')

  // Load shoots from API
  useEffect(() => {
    const loadShoots = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const shoots = await fetchShoots(selectedClient.type === 'all' ? undefined : selectedClient.name)
        setAllShoots(shoots)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shoots')
        console.error('Error loading shoots:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadShoots()
  }, [selectedClient])

  // Navigate to shoot details
  const handleShootClick = useCallback((shootId: number) => {
    router.push(`/shoots/${shootId}`)
  }, [router])

  // Filter shoots based on selected client and status filter
  const filteredShoots = useMemo(() => {
    let shoots = allShoots
    
    // Filter by client
    if (selectedClient.type !== 'all') {
      shoots = shoots.filter(shoot => shoot.client === selectedClient.name)
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      shoots = shoots.filter(shoot => shoot.status === statusFilter)
    }
    
    return shoots
  }, [selectedClient, allShoots, statusFilter])

  // Sort shoots based on selected sort option
  const sortedShoots = useMemo(() => {
    return [...filteredShoots].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        case 'date-desc':
          return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        default:
          return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      }
    })
  }, [filteredShoots, sortBy])

  // Get shoots to display (with pagination)
  const displayedShoots = useMemo(() => {
    return sortedShoots.slice(0, displayCount)
  }, [sortedShoots, displayCount])

  // Check if there are more shoots to load
  const hasMore = displayCount < sortedShoots.length

  // Load more function with simulated delay
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Status color now handled by centralized status management

  // Filter menu items
  const filterMenuItems = [
    {
      label: 'All Status',
      icon: Filter,
      onClick: () => setStatusFilter('all')
    },
    {
      label: 'Scheduled',
      icon: Filter,
      onClick: () => setStatusFilter('scheduled')
    },
    {
      label: 'Active',
      icon: Filter,
      onClick: () => setStatusFilter('active')
    },
    {
      label: 'Completed',
      icon: Filter,
      onClick: () => setStatusFilter('completed')
    },
    {
      label: 'Cancelled',
      icon: Filter,
      onClick: () => setStatusFilter('cancelled')
    }
  ]

  // Sort menu items
  const sortMenuItems = [
    {
      label: 'Date (Newest First)',
      icon: ArrowUpDown,
      onClick: () => setSortBy('date-desc')
    },
    {
      label: 'Date (Oldest First)',
      icon: ArrowUpDown,
      onClick: () => setSortBy('date-asc')
    },
    'separator' as const,
    {
      label: 'Title (A-Z)',
      icon: ArrowUpDown,
      onClick: () => setSortBy('title-asc')
    },
    {
      label: 'Title (Z-A)',
      icon: ArrowUpDown,
      onClick: () => setSortBy('title-desc')
    }
  ]

  return (
    <MobileLayout 
      title="Shoots"
      headerAction={
        <div className="flex items-center gap-1">
          <ActionMenu
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${statusFilter !== 'all' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
              </Button>
            }
            items={filterMenuItems}
          />
          <ActionMenu
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 ${sortBy !== 'date-desc' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            }
            items={sortMenuItems}
          />
          <ScheduleShootForm>
            <Button size="sm" className="h-8 px-3 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          </ScheduleShootForm>
        </div>
      }
    >
      <div className="px-3 py-3 space-y-6">

        {/* Shoots List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Shoots</h2>
          
          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : displayedShoots.length > 0 ? (
            <div className="space-y-3">
              {displayedShoots.map((shoot, index) => (
                <div key={shoot.id}>
                  <ListItem
                    title={shoot.title}
                    subtitle={selectedClient.type === 'all' ? shoot.client : undefined}
                    badges={[
                      { text: formatStatusText(shoot.status), variant: getStatusColor(shoot.status) }
                    ]}
                    metadata={[
                      { icon: Calendar, text: formatDate(shoot.scheduledAt) },
                      { icon: Clock, text: `${formatTime(shoot.scheduledAt)} (${formatDuration(shoot.duration)})` },
                      { icon: MapPin, text: shoot.location },
                      { icon: Users, text: `${shoot.postIdeasCount} post idea${shoot.postIdeasCount !== 1 ? 's' : ''}` }
                    ]}
                    notes={shoot.notes}
                    onClick={() => handleShootClick(shoot.id)}
                    ariaLabel={`View details for ${shoot.title}`}
                  />
                  
                  {/* Add separator between shoots, but not after the last one */}
                  {index < displayedShoots.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-12 tap-target"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <LoadingSpinner size="md" color="gray" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${sortedShoots.length - displayCount} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <EmptyState
              icon={Calendar}
              title="No shoots found"
              description={
                selectedClient.type === 'all' 
                  ? "You haven't scheduled any shoots yet. Create your first shoot to get started."
                  : `No shoots scheduled for ${selectedClient.name}. Schedule a shoot to get started.`
              }
              action={{
                label: "Schedule Your First Shoot",
                children: (
                  <ScheduleShootForm>
                    <Button className="tap-target">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Your First Shoot
                    </Button>
                  </ScheduleShootForm>
                )
              }}
            />
          )}
        </div>
      </div>
    </MobileLayout>
  )
}