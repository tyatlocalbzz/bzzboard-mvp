'use client'

import { ExternalLink, File, Image, Video, Download, Folder } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: number
  fileName: string
  fileSize: number
  mimeType: string
  driveFileWebViewLink?: string
  driveFileDownloadLink?: string
  uploadedAt: string
}

interface UploadedFilesListProps {
  files: UploadedFile[]
  driveFolder?: {
    id: string
    webViewLink: string
    path: string
  }
  title?: string
  showFolderLink?: boolean
  emptyMessage?: string
  className?: string
}

export const UploadedFilesList = ({
  files,
  driveFolder,
  title,
  showFolderLink = true,
  emptyMessage = "No files uploaded yet",
  className
}: UploadedFilesListProps) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />
    }
    if (mimeType.startsWith('video/')) {
      return <Video className="h-4 w-4 text-purple-500" />
    }
    return <File className="h-4 w-4 text-gray-500" />
  }

  if (files.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <File className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      {(title || showFolderLink) && (
        <div className="flex items-center justify-between">
          {title && (
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Folder className="h-4 w-4" />
              {title}
              <Badge variant="secondary" className="text-xs">
                {files.length}
              </Badge>
            </h4>
          )}
          {showFolderLink && driveFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(driveFolder.webViewLink, '_blank')}
              className="h-8 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Folder
            </Button>
          )}
        </div>
      )}

      {/* Files */}
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => file.driveFileWebViewLink && window.open(file.driveFileWebViewLink, '_blank')}
          >
            <div className="flex-shrink-0">
              {getFileIcon(file.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatBytes(file.fileSize)}</span>
                <span>•</span>
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
            </div>
            {file.driveFileDownloadLink && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(file.driveFileDownloadLink, '_blank')
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 