'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Link2 } from 'lucide-react'

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

        <div className="space-y-4">
          <div 
            onClick={handleCreateNew}
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Create New</h3>
                <p className="text-sm text-muted-foreground">
                  Create a brand new post idea for this shoot
                </p>
              </div>
            </div>
          </div>

          <div 
            onClick={handleAssignExisting}
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-green-200 dark:hover:border-green-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Link2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Assign Existing</h3>
                <p className="text-sm text-muted-foreground">
                  Add existing post ideas to this shoot
                </p>
              </div>
            </div>
          </div>
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