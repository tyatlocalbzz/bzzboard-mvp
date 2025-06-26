'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { FileUploadZone } from '@/components/ui/file-upload-zone'
import { UploadProgress } from '@/components/ui/upload-progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { EmptyState } from '@/components/ui/empty-state'
import { useAsync } from '@/lib/hooks/use-async'
import { ShootsApi } from '@/lib/api/shoots-unified'
import { toast } from 'sonner'
import { Upload, Folder, FileText, X, AlertCircle } from 'lucide-react'
import type { Shoot, UploadProgress as UploadProgressType, UploadedFile, ShootClient } from '@/lib/types/shoots'

interface PostIdeaUploadSection {
  id: number
  title: string
  platforms: string[]
  files: File[]
  notes: string
  uploadProgress: { [fileName: string]: UploadProgressType }
  uploadedFiles: UploadedFile[]
}

interface ExtendedPostIdea {
  id: number
  title: string
  platforms: string[]
}

export default function UploadContentPage() {
  const router = useRouter()
  const params = useParams()
  const shootId = params.id as string

  const [shoot, setShoot] = useState<Shoot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [postIdeaSections, setPostIdeaSections] = useState<PostIdeaUploadSection[]>([])
  const [miscFiles, setMiscFiles] = useState<File[]>([])
  const [miscNotes, setMiscNotes] = useState('')
  const [miscUploadProgress, setMiscUploadProgress] = useState<{ [fileName: string]: UploadProgressType }>({})
  const [isUploading, setIsUploading] = useState(false)

  const { loading: folderLoading, execute: createFolder } = useAsync(ShootsApi.createDriveFolder)

  // Helper function to get client name as string
  const getClientName = (client: string | ShootClient): string => {
    return typeof client === 'string' ? client : client?.name || 'Unknown Client'
  }

  // Load shoot and post ideas data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/shoots/${shootId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load shoot data')
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load shoot data')
        }

        setShoot(data.shoot)
        
        // Initialize post idea sections
        setPostIdeaSections(
          (data.postIdeas || []).map((idea: ExtendedPostIdea) => ({
            id: idea.id,
            title: idea.title,
            platforms: idea.platforms,
            files: [],
            notes: '',
            uploadProgress: {},
            uploadedFiles: []
          }))
        )
        
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load shoot data')
        router.push(`/shoots/${shootId}`)
      } finally {
        setIsLoading(false)
      }
    }

    if (shootId) {
      loadData()
    }
  }, [shootId, router])

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
      const uploadedFile = await ShootsApi.uploadFile({
        file,
        postIdeaId,
        shootId: parseInt(shootId),
        notes: postIdeaId 
          ? postIdeaSections.find(s => s.id === postIdeaId)?.notes 
          : miscNotes
      })

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
    if (!shoot) return

    setIsUploading(true)
    
    try {
      // First, create the Google Drive folder structure
      const driveFolder = await createFolder(getClientName(shoot.client), shoot.title, new Date(shoot.scheduledAt).toISOString())
      
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
      router.push(`/shoots/${shootId}`)

    } catch (error) {
      console.error('Upload process failed:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const getTotalFiles = () => {
    const postIdeaFiles = postIdeaSections.reduce((total, section) => total + section.files.length, 0)
    return postIdeaFiles + miscFiles.length
  }

  const getUploadingFiles = () => {
    const postIdeaUploading = postIdeaSections.reduce((total, section) => 
      total + Object.keys(section.uploadProgress).length, 0
    )
    const miscUploading = Object.keys(miscUploadProgress).length
    return postIdeaUploading + miscUploading
  }

  const hasFiles = getTotalFiles() > 0
  const canUpload = hasFiles && !isUploading

  if (isLoading) {
    return (
      <MobileLayout 
        title="Upload Content"
        backHref={`/shoots/${shootId}`}
        showBottomNav={false}
        loading={true}
      >
        <div />
      </MobileLayout>
    )
  }

  if (!shoot) {
    return (
      <MobileLayout 
        title="Upload Content"
        backHref={`/shoots/${shootId}`}
        showBottomNav={false}
      >
        <EmptyState
          icon={AlertCircle}
          title="Shoot not found"
          description="The shoot you're trying to upload content for doesn't exist."
          action={{
            label: "Back to Shoots",
            onClick: () => router.push('/shoots')
          }}
        />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout
      title="Upload Content"
      backHref={`/shoots/${shootId}`}
      showBottomNav={false}
      headerAction={
        <LoadingButton
          size="sm"
          onClick={handleSubmit}
          disabled={!canUpload}
          loading={isUploading || folderLoading}
          loadingText="Uploading..."
          className="h-8 px-3 text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload All
        </LoadingButton>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* Shoot Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Folder className="h-4 w-4 text-blue-500" />
            <h2 className="font-medium text-gray-900">{shoot.title}</h2>
          </div>
          <p className="text-sm text-gray-600">Client: {getClientName(shoot.client)}</p>
          <p className="text-sm text-gray-600">
            Date: {new Date(shoot.scheduledAt).toLocaleDateString()}
          </p>
        </div>

        {/* Upload Summary */}
        {hasFiles && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium text-blue-900">Upload Summary</h3>
            </div>
            <p className="text-sm text-blue-700">
              {getTotalFiles()} file{getTotalFiles() !== 1 ? 's' : ''} ready to upload
              {getUploadingFiles() > 0 && ` (${getUploadingFiles()} uploading)`}
            </p>
          </div>
        )}

        {/* Post Ideas Sections */}
        {postIdeaSections.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Post Ideas</h3>
            
            {postIdeaSections.map((section, index) => (
              <div key={section.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{section.title}</h4>
                    <div className="flex items-center gap-1">
                      {section.platforms.slice(0, 2).map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                      {section.platforms.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{section.platforms.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">Files</Label>
                  <FileUploadZone
                    onFilesSelected={(files) => handlePostIdeaFilesSelected(section.id, files)}
                    maxFiles={10}
                    acceptedTypes={['image/*', 'video/*']}
                  />
                </div>

                {/* Selected Files */}
                {section.files.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">
                      Selected Files ({section.files.length})
                    </Label>
                    <div className="space-y-2">
                      {section.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePostIdeaFileRemove(section.id, fileIndex)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {Object.keys(section.uploadProgress).length > 0 && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">Upload Progress</Label>
                    <div className="space-y-2">
                      {Object.entries(section.uploadProgress).map(([fileName, progress]) => (
                        <UploadProgress
                          key={fileName}
                          fileName={fileName}
                          progress={progress}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor={`notes-${section.id}`} className="text-sm font-medium mb-2 block">
                    Notes for Editor (Optional)
                  </Label>
                  <Textarea
                    id={`notes-${section.id}`}
                    value={section.notes}
                    onChange={(e) => handlePostIdeaNotesChange(section.id, e.target.value)}
                    placeholder="Add notes for the editor about this content..."
                    className="text-sm"
                    rows={2}
                  />
                </div>

                {index < postIdeaSections.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        ) : null}

        {/* Miscellaneous Files Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Additional Files</h4>
          
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Files</Label>
            <FileUploadZone
              onFilesSelected={handleMiscFilesSelected}
              maxFiles={10}
              acceptedTypes={['image/*', 'video/*', '.pdf', '.doc', '.docx']}
            />
          </div>

          {/* Selected Misc Files */}
          {miscFiles.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Selected Files ({miscFiles.length})
              </Label>
              <div className="space-y-2">
                {miscFiles.map((file, fileIndex) => (
                  <div key={fileIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMiscFileRemove(fileIndex)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Misc Upload Progress */}
          {Object.keys(miscUploadProgress).length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Upload Progress</Label>
              <div className="space-y-2">
                {Object.entries(miscUploadProgress).map(([fileName, progress]) => (
                  <UploadProgress
                    key={fileName}
                    fileName={fileName}
                    progress={progress}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Misc Notes */}
          <div>
            <Label htmlFor="misc-notes" className="text-sm font-medium mb-2 block">
              Notes for Editor (Optional)
            </Label>
            <Textarea
              id="misc-notes"
              value={miscNotes}
              onChange={(e) => setMiscNotes(e.target.value)}
              placeholder="Add notes about these additional files..."
              className="text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Empty State */}
        {!hasFiles && !isUploading && (
          <EmptyState
            icon={Upload}
            title="No files selected"
            description="Upload your content files to organize them for editing. You can upload files for specific post ideas or add additional files."
          />
        )}

        {/* Upload Button (Mobile) */}
        <div className="sticky bottom-4 pt-4">
          <LoadingButton
            onClick={handleSubmit}
            disabled={!canUpload}
            loading={isUploading || folderLoading}
            loadingText="Uploading..."
            className="w-full h-12 tap-target"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload {getTotalFiles()} File{getTotalFiles() !== 1 ? 's' : ''} to Drive
          </LoadingButton>
        </div>
      </div>
    </MobileLayout>
  )
} 