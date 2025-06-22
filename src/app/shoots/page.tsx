'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { ListItem } from "@/components/ui/list-item"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { ActionMenu } from "@/components/ui/action-menu"
import { ContextIndicator } from "@/components/ui/context-indicator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Calendar, MapPin, Clock, Users, Filter, ArrowUpDown } from "lucide-react"
import { ScheduleShootForm } from "@/components/shoots/schedule-shoot-form"
import { useClient } from "@/contexts/client-context"
import { formatStatusText } from "@/lib/utils/status"

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

// Mock data - replace with real API call
const generateMockShoots = (): Shoot[] => {
  const clients = ["Acme Corporation", "TechStart Inc", "StyleCo", "GreenTech Solutions", "Creative Agency"]
  const locations = ["Downtown Studio", "Client Office", "Photo Studio", "Outdoor Location", "Co-working Space"]
  const statuses: Shoot['status'][] = ['scheduled', 'active', 'completed', 'cancelled']
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    title: `${clients[i % clients.length]} Content Shoot ${Math.floor(i / clients.length) + 1}`,
    client: clients[i % clients.length],
    scheduledAt: new Date(Date.now() + (i - 25) * 24 * 60 * 60 * 1000).toISOString(),
    duration: [30, 60, 90, 120, 180, 240][i % 6],
    location: locations[i % locations.length],
    status: statuses[i % statuses.length],
    postIdeasCount: Math.floor(Math.random() * 8) + 1,
    notes: i % 3 === 0 ? "Special equipment needed" : undefined
  }))
}

const ITEMS_PER_PAGE = 10

export default function ShootsPage() {
  const { selectedClient } = useClient()
  const router = useRouter()
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<'all' | Shoot['status']>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')

  // Mock data - in real app, this would come from an API
  const allShoots = useMemo(() => generateMockShoots(), [])

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

  // Get status color
  const getStatusColor = (status: Shoot['status']) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'active': return 'destructive'
      case 'completed': return 'secondary'
      case 'cancelled': return 'outline'
      default: return 'default'
    }
  }

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
        {/* Client Context and Filter Indicator */}
        {(selectedClient.type !== 'all' || statusFilter !== 'all' || sortBy !== 'date-desc') && (
          <ContextIndicator
            title={selectedClient.type !== 'all' ? `Shoots for: ${selectedClient.name}` : 'All Shoots'}
            subtitle={`${sortedShoots.length} shoot${sortedShoots.length !== 1 ? 's' : ''}${statusFilter !== 'all' ? ` • ${formatStatusText(statusFilter)} only` : ''}`}
            metadata={
              (statusFilter !== 'all' || sortBy !== 'date-desc') ? (
                sortBy === 'date-asc' ? 'Oldest first' :
                sortBy === 'title-asc' ? 'A-Z' :
                sortBy === 'title-desc' ? 'Z-A' :
                sortBy === 'date-desc' && statusFilter !== 'all' ? 'Newest first' : undefined
              ) : undefined
            }
          />
        )}

        {/* Shoots List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Shoots</h2>
          {displayedShoots.length > 0 ? (
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