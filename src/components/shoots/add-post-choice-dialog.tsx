'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Link2, PlusCircle, ArrowRight } from 'lucide-react'

interface AddPostChoiceDialogProps {
  children: React.ReactNode
  onCreateNew: () => void
  onAssignExisting: () => void
}

export const AddPostChoiceDialog = ({ 
  children, 
  onCreateNew, 
  onAssignExisting 
}: AddPostChoiceDialogProps) => {
  const [open, setOpen] = useState(false)

  const handleCreateNew = () => {
    setOpen(false)
    onCreateNew()
  }

  const handleAssignExisting = () => {
    setOpen(false)
    onAssignExisting()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            Add Post Idea
          </DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to add a post idea to this shoot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Create New Option */}
          <Card 
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-2 hover:border-blue-200"
            onClick={handleCreateNew}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PlusCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create New</h3>
                  <p className="text-sm text-gray-600">
                    Create a new post idea from scratch
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Card>

          {/* Assign Existing Option */}
          <Card 
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-2 hover:border-green-200"
            onClick={handleAssignExisting}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Assign Existing</h3>
                  <p className="text-sm text-gray-600">
                    Choose from existing post ideas
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Card>
        </div>

        <div className="pt-2">
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 