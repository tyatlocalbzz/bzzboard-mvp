'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { AlertTriangle, Trash2, Database, FileText, Calendar, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-time'

interface ClientDependencies {
  shoots: number
  postIdeas: number
  clientSettings: number
  uploadedFiles: number
}

interface PostDependencies {
  shoots: {
    id: number
    title: string
    scheduledAt: string
    status: string
    client: string
  }[]
  uploadedFiles: number
  hasShootDependencies: boolean
  hasFileDependencies: boolean
}

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  itemName: string
  onConfirm: (cascade?: boolean) => Promise<void>
  dependencies?: ClientDependencies
  postDependencies?: PostDependencies
  isLoading?: boolean
}

export const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  dependencies,
  postDependencies,
  isLoading = false
}: DeleteConfirmationDialogProps) => {
  const [confirmCascade, setConfirmCascade] = useState(false)
  
  const hasClientDependencies = dependencies && (
    dependencies.shoots > 0 || 
    dependencies.postIdeas > 0 || 
    dependencies.clientSettings > 0 ||
    dependencies.uploadedFiles > 0
  )

  const hasPostDependencies = postDependencies && (
    postDependencies.hasShootDependencies || 
    postDependencies.hasFileDependencies
  )

  const hasDependencies = hasClientDependencies || hasPostDependencies

  const handleConfirm = async () => {
    console.log('🗑️ [DeleteConfirmationDialog] Confirming delete with cascade:', confirmCascade)
    await onConfirm(confirmCascade)
    setConfirmCascade(false)
  }

  const handleCancel = () => {
    setConfirmCascade(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Content section - outside DialogDescription to avoid HTML nesting issues */}
        <div className="space-y-3">
          {hasDependencies ? (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ This {postDependencies ? 'post idea' : 'client'} has associated data that will also be deleted:
                </div>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {/* Client dependencies */}
                  {dependencies?.shoots && dependencies.shoots > 0 && (
                    <li className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {dependencies.shoots} shoot{dependencies.shoots !== 1 ? 's' : ''}
                    </li>
                  )}
                  {dependencies?.postIdeas && dependencies.postIdeas > 0 && (
                    <li className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {dependencies.postIdeas} post idea{dependencies.postIdeas !== 1 ? 's' : ''}
                    </li>
                  )}
                  {dependencies?.uploadedFiles && dependencies.uploadedFiles > 0 && (
                    <li className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      {dependencies.uploadedFiles} uploaded file{dependencies.uploadedFiles !== 1 ? 's' : ''}
                    </li>
                  )}
                  {dependencies?.clientSettings && dependencies.clientSettings > 0 && (
                    <li className="flex items-center gap-2">
                      <Settings className="h-3 w-3" />
                      {dependencies.clientSettings} setting{dependencies.clientSettings !== 1 ? 's' : ''}
                    </li>
                  )}
                  
                  {/* Post dependencies */}
                  {postDependencies?.hasShootDependencies && (
                    <li className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {postDependencies.shoots.length} shoot{postDependencies.shoots.length !== 1 ? 's' : ''}
                    </li>
                  )}
                  {postDependencies?.hasFileDependencies && (
                    <li className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      {postDependencies.uploadedFiles} uploaded file{postDependencies.uploadedFiles !== 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
                
                {/* Show detailed shoot info for posts */}
                {postDependencies?.hasShootDependencies && (
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <div className="text-xs font-medium text-yellow-800 mb-2">Assigned to shoots:</div>
                    <div className="space-y-1">
                      {postDependencies.shoots.slice(0, 3).map((shoot) => (
                        <div key={shoot.id} className="text-xs text-yellow-700 flex items-center gap-2">
                          <Calendar className="h-2.5 w-2.5" />
                          <span className="font-medium">{shoot.title}</span>
                          <span>•</span>
                          <span>{formatDate(shoot.scheduledAt)}</span>
                          <span>•</span>
                          <span className="capitalize">{shoot.status}</span>
                        </div>
                      ))}
                      {postDependencies.shoots.length > 3 && (
                        <div className="text-xs text-yellow-600 italic">
                          +{postDependencies.shoots.length - 3} more shoots
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  id="confirm-cascade"
                  checked={confirmCascade}
                  onChange={(e) => setConfirmCascade(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="confirm-cascade" className="text-sm text-red-700 cursor-pointer">
                  <span className="font-medium">I understand this action cannot be undone.</span>
                  <br />
                  Delete <strong>{itemName}</strong> and all associated data permanently.
                </label>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
            disabled={hasDependencies && !confirmCascade}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {hasDependencies ? 'All' : itemName}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 