'use client'

import { useMemo } from 'react'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { ListItem } from "@/components/ui/list-item"
import { ContextIndicator } from "@/components/ui/context-indicator"
import { Calendar, Upload, Clock, MapPin, Target } from "lucide-react"
import { ScheduleShootForm } from "@/components/shoots/schedule-shoot-form"
import { useClient } from "@/contexts/client-context"
import { formatStatusText } from "@/lib/utils/status"

// Mock data types
interface DashboardShoot {
  id: number
  title: string
  client: string
  date: string
  time: string
  location: string
  status: 'scheduled' | 'active' | 'completed'
}

interface PostIdea {
  id: number
  title: string
  client: string
  status: 'planned' | 'shot' | 'uploaded'
  platforms: string[]
}

export default function Dashboard() {
  const { selectedClient } = useClient()

  // Mock shoots data - memoized to prevent recreation on every render
  const allShoots = useMemo<DashboardShoot[]>(() => [
    {
      id: 1,
      title: "Acme Corp Q1 Content",
      client: "Acme Corporation",
      date: "2024-01-15",
      time: "14:00",
      location: "Downtown Studio",
      status: "scheduled"
    },
    {
      id: 2,
      title: "TechStart Social Media",
      client: "TechStart Inc",
      date: "2024-01-15", // Today's shoot
      time: "16:00",
      location: "Client Office",
      status: "scheduled"
    },
    {
      id: 3,
      title: "StyleCo Fashion Shoot",
      client: "StyleCo",
      date: "2024-01-16",
      time: "10:00",
      location: "Photo Studio",
      status: "scheduled"
    }
  ], [])

  // Mock post ideas data - memoized to prevent recreation on every render
  const allPostIdeas = useMemo<PostIdea[]>(() => [
    {
      id: 1,
      title: "Product Launch Announcement",
      client: "Acme Corporation",
      status: "planned",
      platforms: ["Instagram", "LinkedIn"]
    },
    {
      id: 2,
      title: "Behind the Scenes Content",
      client: "TechStart Inc",
      status: "shot",
      platforms: ["Instagram", "Facebook"]
    },
    {
      id: 3,
      title: "Customer Testimonial Video",
      client: "StyleCo",
      status: "uploaded",
      platforms: ["LinkedIn", "YouTube"]
    },
    {
      id: 4,
      title: "Office Culture Showcase",
      client: "TechStart Inc",
      status: "planned",
      platforms: ["LinkedIn", "Instagram"]
    },
    {
      id: 5,
      title: "Spring Collection Preview",
      client: "StyleCo",
      status: "shot",
      platforms: ["Instagram", "TikTok"]
    }
  ], [])

  // Filter data based on selected client - same pattern as shoots page
  const filteredShoots = useMemo(() => {
    if (selectedClient.type === 'all') {
      return allShoots
    }
    return allShoots.filter(shoot => shoot.client === selectedClient.name)
  }, [selectedClient, allShoots])

  const filteredPostIdeas = useMemo(() => {
    if (selectedClient.type === 'all') {
      return allPostIdeas
    }
    return allPostIdeas.filter(idea => idea.client === selectedClient.name)
  }, [selectedClient, allPostIdeas])

  // Get today's shoots (for display)
  const today = new Date().toISOString().split('T')[0]
  const todaysShoots = useMemo(() => {
    return filteredShoots.filter(shoot => shoot.date === today)
  }, [filteredShoots, today])

  // Get recent post ideas (limit to 3 for display)
  const recentPostIdeas = useMemo(() => {
    return filteredPostIdeas.slice(0, 3)
  }, [filteredPostIdeas])

  return (
    <MobileLayout title="Buzzboard">
      <div className="px-3 py-3 space-y-6">
        {/* Client Context Indicator */}
        {selectedClient.type !== 'all' && (
          <ContextIndicator
            title={`Dashboard for: ${selectedClient.name}`}
            subtitle={`${filteredShoots.length} shoots • ${filteredPostIdeas.length} post ideas`}
          />
        )}

        {/* Today's Shoots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Shoots</h2>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
          
          {todaysShoots.length > 0 ? (
            <div className="space-y-3">
              {todaysShoots.map((shoot, index) => (
                <div key={shoot.id}>
                  <ListItem
                    title={shoot.title}
                    badges={[
                      { text: formatStatusText(shoot.status), variant: 'default' }
                    ]}
                    metadata={[
                      { icon: Clock, text: shoot.time },
                      { icon: MapPin, text: shoot.location }
                    ]}
                    className="bg-gray-50"
                  />
                  {index < todaysShoots.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No shoots today"
              description={
                selectedClient.type === 'all' 
                  ? 'Schedule a shoot to get started'
                  : `No shoots scheduled today for ${selectedClient.name}`
              }
            />
          )}
        </div>

        <Separator />

        {/* Recent Post Ideas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Post Ideas</h2>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View All
            </Button>
          </div>
          
          {recentPostIdeas.length > 0 ? (
            <div className="space-y-3">
              {recentPostIdeas.map((idea, index) => (
                <div key={idea.id}>
                  <ListItem
                    title={idea.title}
                    description={idea.platforms.join(", ")}
                    badges={[
                      { 
                        text: idea.status, 
                        variant: idea.status === "planned" ? "secondary" :
                                idea.status === "shot" ? "default" : "outline"
                      }
                    ]}
                    className="bg-gray-50"
                  />
                  {index < recentPostIdeas.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No post ideas"
              description={
                selectedClient.type === 'all' 
                  ? 'Create your first post idea'
                  : `No post ideas for ${selectedClient.name}`
              }
            />
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ScheduleShootForm>
              <Button className="h-12 flex-col gap-1 text-xs tap-target" variant="outline">
                <Calendar className="h-4 w-4" />
                Schedule Shoot
              </Button>
            </ScheduleShootForm>
            <Button className="h-12 flex-col gap-1 text-xs tap-target" variant="outline">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
