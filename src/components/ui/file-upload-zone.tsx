'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, File, Image, Video, Eye } from 'lucide-react'
import { Button } from './button'
import NextImage from 'next/image'

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  onFileRemove?: (index: number) => void
  acceptedTypes?: string[]
  maxFiles?: number
  maxFileSize?: number // in bytes
  disabled?: boolean
  className?: string
  selectedFiles?: File[]
  showPreview?: boolean
}

export const FileUploadZone = ({
  onFilesSelected,
  onFileRemove,
  acceptedTypes = ['image/*', 'video/*'],
  maxFiles = 10,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
  className,
  selectedFiles = [],
  showPreview = true
}: FileUploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<{ [fileName: string]: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create preview URLs for image files
  useEffect(() => {
    const newPreviewUrls: { [fileName: string]: string } = {}
    
    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/') && !previewUrls[file.name]) {
        newPreviewUrls[file.name] = URL.createObjectURL(file)
      }
    })
    
    if (Object.keys(newPreviewUrls).length > 0) {
      setPreviewUrls(prev => ({ ...prev, ...newPreviewUrls }))
    }

    // Cleanup function to revoke URLs when component unmounts or files change
    return () => {
      Object.values(newPreviewUrls).forEach(url => {
        URL.revokeObjectURL(url)
      })
    }
  }, [selectedFiles, previewUrls])

  // Cleanup preview URLs when files are removed
  useEffect(() => {
    const currentFileNames = selectedFiles.map(file => file.name)
    const urlsToRevoke: string[] = []
    
    Object.keys(previewUrls).forEach(fileName => {
      if (!currentFileNames.includes(fileName)) {
        urlsToRevoke.push(previewUrls[fileName])
      }
    })
    
    if (urlsToRevoke.length > 0) {
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(fileName => {
          if (!currentFileNames.includes(fileName)) {
            delete updated[fileName]
          }
        })
        return updated
      })
    }
  }, [selectedFiles, previewUrls])

  const validateFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
    
    // Check file count
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return false
    }

    // Check file sizes and types
    for (const file of fileArray) {
      if (file.size > maxFileSize) {
        setError(`File "${file.name}" is too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`)
        return false
      }

      const fileType = file.type
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.slice(0, -1))
        }
        return fileType === type
      })

      if (!isValidType) {
        setError(`File "${file.name}" type not supported`)
        return false
      }
    }

    setError(null)
    return true
  }, [selectedFiles.length, maxFiles, maxFileSize, acceptedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0 && validateFiles(files)) {
      onFilesSelected(Array.from(files))
    }
  }, [disabled, validateFiles, onFilesSelected])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && validateFiles(files)) {
      onFilesSelected(Array.from(files))
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [validateFiles, onFilesSelected])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleFileRemove = useCallback((index: number) => {
    const file = selectedFiles[index]
    if (file && previewUrls[file.name]) {
      URL.revokeObjectURL(previewUrls[file.name])
      setPreviewUrls(prev => {
        const updated = { ...prev }
        delete updated[file.name]
        return updated
      })
    }
    if (onFileRemove) {
      onFileRemove(index)
    }
  }, [selectedFiles, previewUrls, onFileRemove])

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" aria-label="Image file" />
    }
    if (file.type.startsWith('video/')) {
      return <Video className="h-4 w-4" aria-label="Video file" />
    }
    return <File className="h-4 w-4" aria-label="File" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Upload Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer tap-target',
          isDragOver && !disabled
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-1">
          {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-gray-500">
          Max {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)}MB each
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* File Preview List */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Files ({selectedFiles.length})
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* File Preview or Icon */}
                <div className="flex-shrink-0">
                  {file.type.startsWith('image/') && previewUrls[file.name] ? (
                    <div className="relative">
                      <NextImage
                        src={previewUrls[file.name]}
                        alt={`Preview of ${file.name}`}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover rounded border"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity rounded">
                        <Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center bg-gray-200 rounded border text-gray-500">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {file.type.startsWith('image/') && (
                    <p className="text-xs text-gray-400">
                      Image file
                    </p>
                  )}
                </div>
                
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                  onClick={() => handleFileRemove(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 