'use client'

import { ReactNode, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import { useClient } from '@/contexts/client-context'
import { Calendar, Clock, Users } from 'lucide-react'

interface ScheduleShootFormProps {
  children: ReactNode
}

interface ScheduleShootData {
  title: string
  clientName: string
  date: string
  time: string
  duration: number
  location: string
  notes?: string
}

// Mock API function - replace with real API call
const scheduleShoot = async (data: ScheduleShootData) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Mock validation
  if (!data.title || !data.clientName || !data.date || !data.time) {
    throw new Error('Please fill in all required fields')
  }
  
  console.log('Scheduling shoot:', data)
  
  // Mock success response
  return { 
    id: Date.now(),
    message: 'Shoot scheduled successfully',
    ...data 
  }
}

export const ScheduleShootForm = ({ children }: ScheduleShootFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { loading, execute, error } = useAsync(scheduleShoot)
  const { selectedClient, clients } = useClient()

  // Get available clients (excluding "All Clients")
  const availableClients = clients.filter(client => client.type === 'client')

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string
    const clientName = formData.get('clientName') as string
    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const duration = parseInt(formData.get('duration') as string) || 60
    const location = formData.get('location') as string
    const notes = formData.get('notes') as string

    const result = await execute({
      title,
      clientName,
      date,
      time,
      duration,
      location,
      notes
    })
    
    if (result) {
      toast.success('Shoot scheduled successfully!')
      setIsOpen(false)
      router.refresh()
    }
  }

  // Get today's date for min date input
  const today = new Date().toISOString().split('T')[0]

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule New Shoot
          </SheetTitle>
          <SheetDescription>
            Plan a content creation session with your client
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col h-full px-4 pb-4">
          <form action={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto">
              {/* Shoot Title */}
              <MobileInput
                name="title"
                label="Shoot Title"
                placeholder="e.g., Q1 Product Launch Content"
                required
                error={error && error.includes('title') ? 'Title is required' : undefined}
              />

              {/* Client Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client</Label>
                <Select 
                  name="clientName" 
                  defaultValue={selectedClient.type === 'client' ? selectedClient.name : ''}
                  required
                >
                  <SelectTrigger className="h-12 text-base tap-target">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Choose a client" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.name}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{client.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <MobileInput
                  name="date"
                  label="Date"
                  type="date"
                  min={today}
                  required
                  error={error && error.includes('date') ? 'Date is required' : undefined}
                />
                <MobileInput
                  name="time"
                  label="Time"
                  type="time"
                  required
                  error={error && error.includes('time') ? 'Time is required' : undefined}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Duration</Label>
                <Select name="duration" defaultValue="60">
                  <SelectTrigger className="h-12 text-base tap-target">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <MobileInput
                name="location"
                label="Location"
                placeholder="e.g., Downtown Studio, Client Office"
                required
                helperText="Where will the shoot take place?"
              />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Special requirements, equipment needed, shot list ideas..."
                  className="min-h-[80px] text-base tap-target resize-none"
                  rows={3}
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-12"
                loading={loading}
                loadingText="Scheduling..."
              >
                Schedule Shoot
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
} 