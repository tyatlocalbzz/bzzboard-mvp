'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserX, Trash2, AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface UserDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userEmail: string
  onConfirm: (type: 'deactivate' | 'hard') => Promise<void>
  isLoading?: boolean
}

export const UserDeleteDialog = ({
  open,
  onOpenChange,
  userName,
  userEmail,
  onConfirm,
  isLoading = false
}: UserDeleteDialogProps) => {
  const [selectedType, setSelectedType] = useState<'deactivate' | 'hard'>('deactivate')

  const handleConfirm = async () => {
    await onConfirm(selectedType)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedType('deactivate')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            Choose how you want to remove <strong>{userName}</strong> ({userEmail}) from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Deactivate Option */}
          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedType === 'deactivate' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedType('deactivate')}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-4 h-4 rounded-full border-2 ${
                selectedType === 'deactivate' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {selectedType === 'deactivate' && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Deactivate Account</span>
                  <Badge variant="outline" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Sets the user status to inactive. The user cannot log in, but all their data is preserved. 
                  This action can be reversed.
                </p>
              </div>
            </div>
          </div>

          {/* Hard Delete Option */}
          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedType === 'hard' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedType('hard')}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-4 h-4 rounded-full border-2 ${
                selectedType === 'hard' 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-gray-300'
              }`}>
                {selectedType === 'hard' && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Permanently Delete</span>
                  <Badge variant="destructive" className="text-xs">Irreversible</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Completely removes the user and all associated data from the system. 
                  <strong className="text-red-600"> This action cannot be undone.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Warning for hard delete */}
          {selectedType === 'hard' && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700">
                  <strong>Warning:</strong> This will permanently delete all user data including:
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    <li>User account and profile</li>
                    <li>Activity history and logs</li>
                    <li>Any associated content or permissions</li>
                  </ul>
                </div>
              </div>
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
          <Button 
            variant={selectedType === 'hard' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                {selectedType === 'deactivate' ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Forever
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 