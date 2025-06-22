'use client'

import { useState, useCallback } from 'react'
import { FormSheet } from '@/components/ui/form-sheet'
import { FileUploadZone } from '@/components/ui/file-upload-zone'
import { UploadProgress } from '@/components/ui/upload-progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAsync } from '@/lib/hooks/use-async'
import { shootsApi } from '@/lib/api/shoots'
import { toast } from 'sonner'
import { Upload, Folder, FileText } from 'lucide-react'
import type { Shoot, UploadProgress as UploadProgressType, UploadedFile } from '@/lib/types/shoots'

interface PostIdeaUploadSection {
  id: number
  title: string
  platforms: string[]
  files: File[]
  notes: string
  uploadProgress: { [fileName: string]: UploadProgressType }
  uploadedFiles: UploadedFile[]
}

interface UploadContentFormProps {
  children: React.ReactNode
  shoot: Shoot
  postIdeas: Array<{
    id: number
    title: string
    platforms: string[]
  }>
  onSuccess: () => void
}

export const UploadContentForm = ({ 
  children, 
  shoot, 
  postIdeas, 
  onSuccess 
}: UploadContentFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [postIdeaSections, setPostIdeaSections] = useState<PostIdeaUploadSection[]>(
    postIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      platforms: idea.platforms,
      files: [],
      notes: '',
      uploadProgress: {},
      uploadedFiles: []
    }))
  )
  const [miscFiles, setMiscFiles] = useState<File[]>([])
  const [miscNotes, setMiscNotes] = useState('')
  const [miscUploadProgress, setMiscUploadProgress] = useState<{ [fileName: string]: UploadProgressType }>({})
  const [isUploading, setIsUploading] = useState(false)

  const { loading: folderLoading, execute: createFolder } = useAsync(shootsApi.createDriveFolder)

  const handlePostIdeaFilesSelected = useCallback((postIdeaId: number, newFiles: File[]) => {
    setPostIdeaSections(prev => prev.map(section => 
      section.id === postIdeaId 
        ? { ...section, files: [...section.files, ...newFiles] }
        : section
    ))
  }, [])

  const handlePostIdeaFileRemove = useCallback((postIdeaId: number, fileIndex: number) => {
    setPostIdeaSections(prev => prev.map(section => 
      section.id === postIdeaId 
        ? { ...section, files: section.files.filter((_, index) => index !== fileIndex) }
        : section
    ))
  }, [])

  const handlePostIdeaNotesChange = useCallback((postIdeaId: number, notes: string) => {
    setPostIdeaSections(prev => prev.map(section => 
      section.id === postIdeaId 
        ? { ...section, notes }
        : section
    ))
  }, [])

  const handleMiscFilesSelected = useCallback((newFiles: File[]) => {
    setMiscFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleMiscFileRemove = useCallback((fileIndex: number) => {
    setMiscFiles(prev => prev.filter((_, index) => index !== fileIndex))
  }, [])

  const updateUploadProgress = useCallback((
    postIdeaId: number | null, 
    fileName: string, 
    progress: UploadProgressType
  ) => {
    if (postIdeaId === null) {
      // Misc file upload
      setMiscUploadProgress(prev => ({
        ...prev,
        [fileName]: progress
      }))
    } else {
      // Post idea file upload
      setPostIdeaSections(prev => prev.map(section => 
        section.id === postIdeaId 
          ? { 
              ...section, 
              uploadProgress: { ...section.uploadProgress, [fileName]: progress }
            }
          : section
      ))
    }
  }, [])

  const uploadFile = async (file: File, postIdeaId?: number) => {
    try {
      const uploadedFile = await shootsApi.uploadFile(
        {
          file,
          postIdeaId,
          shootId: shoot.id,
          notes: postIdeaId 
            ? postIdeaSections.find(s => s.id === postIdeaId)?.notes 
            : miscNotes
        },
        (progress) => updateUploadProgress(postIdeaId || null, file.name, progress)
      )

      // Add to uploaded files list
      if (postIdeaId) {
        setPostIdeaSections(prev => prev.map(section => 
          section.id === postIdeaId 
            ? { 
                ...section, 
                uploadedFiles: [...section.uploadedFiles, uploadedFile],
                files: section.files.filter(f => f.name !== file.name)
              }
            : section
        ))
      }

      return uploadedFile
    } catch (error) {
      console.error('Upload failed:', error)
      updateUploadProgress(postIdeaId || null, file.name, {
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        status: 'failed'
      })
      throw error
    }
  }

  const handleSubmit = async () => {
    setIsUploading(true)
    
    try {
      // First, create the Google Drive folder structure
      const driveFolder = await createFolder(shoot.client, shoot.title, shoot.scheduledAt)
      
      if (!driveFolder) {
        throw new Error('Failed to create Drive folder')
      }

      toast.success(`Created Drive folder: ${driveFolder.name}`)

      // Upload all files
      const uploadPromises: Promise<UploadedFile>[] = []

      // Upload post idea files
      for (const section of postIdeaSections) {
        for (const file of section.files) {
          uploadPromises.push(uploadFile(file, section.id))
        }
      }

      // Upload misc files
      for (const file of miscFiles) {
        uploadPromises.push(uploadFile(file))
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises)

      toast.success('All files uploaded successfully!')
      onSuccess()
      setIsOpen(false)

    } catch (error) {
      console.error('Upload process failed:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const getTotalFiles = () => {
    return postIdeaSections.reduce((total, section) => total + section.files.length, 0) + miscFiles.length
  }

  const getUploadingFiles = () => {
    const postIdeaUploading = postIdeaSections.reduce((total, section) => 
      total + Object.values(section.uploadProgress).filter(p => p.status === 'uploading').length, 0
    )
    const miscUploading = Object.values(miscUploadProgress).filter(p => p.status === 'uploading').length
    return postIdeaUploading + miscUploading
  }

  const formContent = (
    <div className="space-y-6">
      {/* Drive Folder Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Folder className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Google Drive Folder</span>
        </div>
        <p className="text-sm text-blue-700">
          Files will be organized in: <strong>{shoot.client}</strong> → <strong>[{new Date(shoot.scheduledAt).toISOString().split('T')[0]}] {shoot.title}</strong>
        </p>
      </div>

      {/* Post Idea Sections */}
      {postIdeaSections.map((section, index) => (
        <div key={section.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
            <div className="flex gap-1">
              {section.platforms.map(platform => (
                <Badge key={platform} variant="outline" className="text-xs">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>

          <FileUploadZone
            onFilesSelected={(files) => handlePostIdeaFilesSelected(section.id, files)}
            onFileRemove={(index) => handlePostIdeaFileRemove(section.id, index)}
            selectedFiles={section.files}
            maxFiles={20}
            className="border border-gray-200 rounded-lg p-4"
          />

          {/* Upload Progress for this section */}
          {Object.entries(section.uploadProgress).map(([fileName, progress]) => (
            <UploadProgress
              key={fileName}
              fileName={fileName}
              progress={progress}
              className="ml-4"
            />
          ))}

          <div className="space-y-2">
            <Label htmlFor={`notes-${section.id}`} className="text-sm font-medium">
              Editor Notes for {section.title}
            </Label>
            <Textarea
              id={`notes-${section.id}`}
              placeholder="Special instructions for the video editor..."
              value={section.notes}
              onChange={(e) => handlePostIdeaNotesChange(section.id, e.target.value)}
              className="min-h-[80px] text-base tap-target resize-none"
              rows={3}
            />
          </div>

          {index < postIdeaSections.length - 1 && <Separator />}
        </div>
      ))}

      {/* Misc Files Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Miscellaneous Files</h3>
          <Badge variant="outline" className="text-xs">Optional</Badge>
        </div>

        <FileUploadZone
          onFilesSelected={handleMiscFilesSelected}
          onFileRemove={handleMiscFileRemove}
          selectedFiles={miscFiles}
          maxFiles={10}
          className="border border-gray-200 rounded-lg p-4"
        />

        {/* Upload Progress for misc files */}
        {Object.entries(miscUploadProgress).map(([fileName, progress]) => (
          <UploadProgress
            key={fileName}
            fileName={fileName}
            progress={progress}
            className="ml-4"
          />
        ))}

        <div className="space-y-2">
          <Label htmlFor="misc-notes" className="text-sm font-medium">
            Notes for Miscellaneous Files
          </Label>
          <Textarea
            id="misc-notes"
            placeholder="Notes about these files..."
            value={miscNotes}
            onChange={(e) => setMiscNotes(e.target.value)}
            className="min-h-[60px] text-base tap-target resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Upload Summary */}
      {getTotalFiles() > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900">
              Ready to Upload: {getTotalFiles()} file{getTotalFiles() !== 1 ? 's' : ''}
            </span>
            {getUploadingFiles() > 0 && (
              <span className="text-blue-600">
                Uploading: {getUploadingFiles()} file{getUploadingFiles() !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <FormSheet
      trigger={children}
      formContent={formContent}
      title="Upload Content"
      description={`Upload processed content for ${shoot.title}`}
      icon={Upload}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      loading={isUploading || folderLoading}
      submitText="Upload All Files"
      loadingText="Uploading..."
    />
  )
} 