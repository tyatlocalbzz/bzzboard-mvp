'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from "@/components/layout/mobile-layout"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/ui/empty-state"
import { ListItem } from "@/components/ui/list-item"
import { Calendar, Upload, Clock, MapPin, Target, UserPlus } from "lucide-react"
import { ScheduleShootForm } from "@/components/shoots/schedule-shoot-form"
import { AddClientWizard } from "@/components/clients/add-client-wizard"
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
  const router = useRouter()

  // Real shoots data will be loaded from API
  const allShoots = useMemo<DashboardShoot[]>(() => [], [])

  // Real post ideas data will be loaded from API
  const allPostIdeas = useMemo<PostIdea[]>(() => [], [])

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
  const todaysShoots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    return filteredShoots.filter(shoot => shoot.date === today)
  }, [filteredShoots])

  // Get recent post ideas (limit to 3 for display)
  const recentPostIdeas = useMemo(() => {
    return filteredPostIdeas.slice(0, 3)
  }, [filteredPostIdeas])

  return (
    <MobileLayout title="Buzzboard">
      <div className="px-3 py-3 space-y-6">


        {/* Today's Shoots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Today&apos;s Shoots</h2>
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
                    className="bg-muted"
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
            <h2 className="text-lg font-semibold text-foreground">Post Ideas</h2>
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
                    className="bg-muted"
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
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ScheduleShootForm onSuccess={() => router.push('/shoots')}>
              <Button className="h-12 flex-col gap-1 text-xs tap-target" variant="outline">
                <Calendar className="h-4 w-4" />
                Schedule Shoot
              </Button>
            </ScheduleShootForm>
            <AddClientWizard>
              <Button className="h-12 flex-col gap-1 text-xs tap-target" variant="outline">
                <UserPlus className="h-4 w-4" />
                Add Client
              </Button>
            </AddClientWizard>
          </div>
          <div className="grid grid-cols-1 gap-3">
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
