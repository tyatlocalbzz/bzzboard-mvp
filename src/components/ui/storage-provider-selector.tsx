'use client'

import { HardDrive } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface StorageProviderSelectorProps {
  value: string
  onValueChange: (value: string) => void
  googleDriveConnected?: boolean
  label?: string
  className?: string
}

export const StorageProviderSelector = ({
  value,
  onValueChange,
  googleDriveConnected = false,
  label = "Storage Provider",
  className = ""
}: StorageProviderSelectorProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="google-drive">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-600" />
              <span>Google Drive</span>
              {googleDriveConnected && (
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Connected
                </Badge>
              )}
            </div>
          </SelectItem>
          <SelectItem value="dropbox" disabled>
            <div className="flex items-center gap-2 opacity-50">
              <HardDrive className="h-4 w-4 text-purple-600" />
              <span>Dropbox</span>
              <Badge variant="outline" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
} 