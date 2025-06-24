'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  FolderOpen,
  HardDrive
} from 'lucide-react'

interface FolderSelectorProps {
  label: string
  folderName?: string
  folderPath?: string
  folderId?: string
  isConnected: boolean
  notConnectedMessage: string
  onBrowse: () => void
  onClear?: () => void
  helpText?: string
  className?: string
}

export const FolderSelector = ({
  label,
  folderName,
  folderPath,
  folderId,
  isConnected,
  notConnectedMessage,
  onBrowse,
  onClear,
  helpText,
  className = ""
}: FolderSelectorProps) => {
  if (!isConnected) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Label className="text-sm font-medium">{label}</Label>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <HardDrive className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Google Drive Not Connected</p>
              <p className="text-xs text-amber-700 mt-1">
                {notConnectedMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="space-y-3">
        {/* Current Selection */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
          <Folder className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {folderName || 'My Drive (Root)'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {folderPath || '/My Drive'}
            </div>
          </div>
          {folderId && folderId !== 'root' && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Custom
            </Badge>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBrowse}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Select Folder
          </Button>
          {onClear && (folderId && folderId !== 'root') && (
            <Button variant="outline" onClick={onClear} className="px-3">
              Clear
            </Button>
          )}
        </div>
        
        {helpText && (
          <p className="text-xs text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    </div>
  )
} 