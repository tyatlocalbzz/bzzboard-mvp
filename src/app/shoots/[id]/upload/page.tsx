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
import { useShootData } from '@/lib/hooks/use-shoot-data'
import { useIntegrationStatus } from '@/lib/hooks/use-integration-status'
import { ShootsApi } from '@/lib/api/shoots-unified'
import { toast } from 'sonner'
import { Upload, Folder, FileText, X, AlertCircle, Settings, Mail } from 'lucide-react'
import type { UploadProgress as UploadProgressType, UploadedFile, ShootClient } from '@/lib/types/shoots'
import { SendToEditorDialog } from '@/components/shoots/send-to-editor-dialog'
import { UploadedFilesList } from '@/components/ui/uploaded-files-list'

interface PostIdeaUploadSection {
  id: number
  title: string
  platforms: string[]
  files: File[]
  notes: string
  uploadProgress: { [fileName: string]: UploadProgressType }
  uploadedFiles: UploadedFile[]
}

export default function UploadContentPage() {
  const router = useRouter()
  const params = useParams()
  const shootId = params.id as string

  // Memoize the error handler to prevent infinite loops
  const handleError = useCallback((error: string) => {
    console.error('Failed to load shoot data:', error)
    toast.error('Failed to load shoot data')
    router.push(`/shoots/${shootId}`)
  }, [router, shootId])

  // Use standardized shoot data hook with uploaded files
  const { shoot, postIdeas, miscFiles, isLoading } = useShootData({ 
    shootId, 
    loadPostIdeas: true,
    onError: handleError
  })

  // Check Google Drive integration status
  const { isGoogleDriveConnected, isLoading: integrationsLoading } = useIntegrationStatus()

  const [postIdeaSections, setPostIdeaSections] = useState<PostIdeaUploadSection[]>([])
  const [selectedMiscFiles, setSelectedMiscFiles] = useState<File[]>([])
  const [miscNotes, setMiscNotes] = useState('')
  const [miscUploadProgress, setMiscUploadProgress] = useState<{ [fileName: string]: UploadProgressType }>({})
  const [isUploading, setIsUploading] = useState(false)

  const { loading: folderLoading, execute: createFolder } = useAsync(ShootsApi.createDriveFolder)

  // Helper function to get client name as string
  const getClientName = (client: string | ShootClient): string => {
    return typeof client === 'string' ? client : client?.name || 'Unknown Client'
  }

  // Initialize post idea sections when data loads
  useEffect(() => {
    if (postIdeas && postIdeas.length > 0) {
      setPostIdeaSections(
        postIdeas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          platforms: idea.platforms,
          files: [],
          notes: '',
          uploadProgress: {},
          uploadedFiles: []
        }))
      )
    }
  }, [postIdeas])

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
    setSelectedMiscFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleMiscFileRemove = useCallback((fileIndex: number) => {
    setSelectedMiscFiles(prev => prev.filter((_, index) => index !== fileIndex))
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

      console.log('📦 [UploadPage] Received uploadedFile:', uploadedFile)
      console.log('🔍 [UploadPage] uploadedFile properties:', {
        id: uploadedFile.id,
        fileName: uploadedFile.fileName,
        fileSize: uploadedFile.fileSize,
        hasFileName: !!uploadedFile.fileName,
        hasId: !!uploadedFile.id
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

    console.log('🚀 [UploadPage] Starting upload process for shoot:', shootId)
    console.log('📋 [UploadPage] Shoot data:', {
      id: shoot.id,
      title: shoot.title,
      client: getClientName(shoot.client),
      scheduledAt: shoot.scheduledAt
    })

    setIsUploading(true)
    
    try {
      // First, create the Google Drive folder structure
      console.log('📁 [UploadPage] Creating Google Drive folder...')
      console.log('📤 [UploadPage] Folder creation parameters:', {
        clientName: getClientName(shoot.client),
        shootTitle: shoot.title,
        shootDate: new Date(shoot.scheduledAt).toISOString()
      })

      const driveFolder = await createFolder(getClientName(shoot.client), shoot.title, new Date(shoot.scheduledAt).toISOString())
      
      console.log('📦 [UploadPage] Folder creation result:', driveFolder)
      
      if (!driveFolder) {
        console.error('❌ [UploadPage] No folder returned from createFolder')
        throw new Error('Failed to create Drive folder')
      }

      console.log('✅ [UploadPage] Drive folder created successfully:', driveFolder.name)
      toast.success(`Created Drive folder: ${driveFolder.name}`)

      // Upload all files
      const uploadPromises: Promise<UploadedFile>[] = []

      console.log('📤 [UploadPage] Preparing file uploads...')
      console.log('📊 [UploadPage] Upload summary:', {
        postIdeaSections: postIdeaSections.length,
        totalPostIdeaFiles: postIdeaSections.reduce((total, section) => total + section.files.length, 0),
        miscFiles: miscFiles.length,
        totalFiles: getTotalFiles()
      })

      // Upload post idea files
      for (const section of postIdeaSections) {
        console.log(`📁 [UploadPage] Processing section: ${section.title} (${section.files.length} files)`)
        for (const file of section.files) {
          console.log(`📄 [UploadPage] Queuing upload: ${file.name} (${file.size} bytes)`)
          uploadPromises.push(uploadFile(file, section.id))
        }
      }

      // Upload misc files
      console.log(`📁 [UploadPage] Processing misc files (${selectedMiscFiles.length} files)`)
      for (const file of selectedMiscFiles) {
        console.log(`📄 [UploadPage] Queuing misc upload: ${file.name} (${file.size} bytes)`)
        uploadPromises.push(uploadFile(file))
      }

      console.log(`🚀 [UploadPage] Starting ${uploadPromises.length} file uploads...`)

      // Wait for all uploads to complete
      await Promise.all(uploadPromises)

      console.log('✅ [UploadPage] All uploads completed successfully')
      toast.success('All files uploaded successfully!')
      router.push(`/shoots/${shootId}`)

    } catch (error) {
      console.error('❌ [UploadPage] Upload process failed:', error)
      console.error('🔍 [UploadPage] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      })
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Google Drive connection expired') || 
            error.message.includes('reconnect Google Drive') ||
            error.message.includes('Please reconnect Google Drive in Settings') ||
            error.message.includes('invalid_request') ||
            error.message.includes('invalid_grant') ||
            error.message.includes('refresh_token')) {
          toast.error('Google Drive connection expired. Please reconnect Google Drive in Settings.', {
            duration: 10000,
            action: {
              label: 'Go to Settings',
              onClick: () => router.push('/settings?tab=integrations')
            }
          })
        } else if (error.message.includes('Failed to create Drive folder')) {
          toast.error('Failed to create Google Drive folder. Please check your Google Drive connection.')
        } else if (error.message.includes('not valid JSON')) {
          toast.error('Server response error. Please try again.')
        } else if (error.message.includes('404')) {
          toast.error('Upload service not found. Please contact support.')
        } else if (error.message.includes('Unauthorized')) {
          toast.error('Authentication error. Please check your Google Drive connection in Settings.')
        } else {
          toast.error(`Upload failed: ${error.message}`)
        }
      } else {
        toast.error('Upload failed. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const getTotalFiles = () => {
    return postIdeaSections.reduce((sum, section) => sum + section.files.length, 0) + selectedMiscFiles.length
  }

  const getUploadingFiles = () => {
    return postIdeaSections.reduce((sum, section) => sum + Object.keys(section.uploadProgress).length, 0) + Object.keys(miscUploadProgress).length
  }

  // Check if all content has been uploaded
  const getAllUploadedFiles = () => {
    return postIdeaSections.reduce((sum, section) => sum + section.uploadedFiles.length, 0)
  }

  const hasUploadedContent = getAllUploadedFiles() > 0
  const hasFilesToUpload = getTotalFiles() > 0
  const isAllContentUploaded = hasUploadedContent && !hasFilesToUpload && !isUploading
  const canShowSendToEditor = isAllContentUploaded && shoot?.status === 'completed'

  // Prepare post ideas data for SendToEditorDialog
  const postIdeasWithUploads = postIdeaSections
    .filter(section => section.uploadedFiles.length > 0)
    .map(section => ({
      id: section.id,
      title: section.title,
      platforms: section.platforms,
      contentType: 'photo' as const, // Default, could be enhanced based on file types
      caption: section.notes || undefined,
      notes: section.notes || undefined,
      shotList: [],
      status: 'uploaded' as const,
      uploadedFiles: section.uploadedFiles.map(file => ({
        ...file,
        webViewLink: file.driveFileWebViewLink || '',
        webContentLink: file.driveFileDownloadLink || '',
        driveFileId: file.driveFileId || '',
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        postIdeaId: file.postIdeaId,
        shootId: file.shootId,
        driveFolderId: file.driveFolderId || '',
        driveFileWebViewLink: file.driveFileWebViewLink || '',
        driveFileDownloadLink: file.driveFileDownloadLink || ''
      })),
      driveFolderLink: section.uploadedFiles[0]?.driveFileWebViewLink?.split('/file/')[0] + '/drive/folders/' + section.uploadedFiles[0]?.driveFolderId,
      fileCount: section.uploadedFiles.length
    }))

  const handleSendToEditorSuccess = () => {
    toast.success('Content sent to editor successfully!')
    router.push(`/shoots/${shootId}`)
  }

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
          disabled={!canShowSendToEditor}
          loading={isUploading || folderLoading}
          loadingText="Uploading..."
          className="h-8 px-3 text-xs"
          title={!isGoogleDriveConnected ? "Connect Google Drive in Settings first" : "Upload all files"}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload All
        </LoadingButton>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* Shoot Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Folder className="h-4 w-4 text-blue-500" />
            <h2 className="font-medium text-card-foreground">{shoot.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">Client: {getClientName(shoot.client)}</p>
          <p className="text-sm text-muted-foreground">
            Date: {new Date(shoot.scheduledAt).toLocaleDateString()}
          </p>
        </div>

        {/* Google Drive Connection Warning */}
        {!integrationsLoading && !isGoogleDriveConnected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-red-900">Google Drive Not Connected</h3>
            </div>
            <p className="text-sm text-red-700 mb-3">
              You need to connect Google Drive to upload files. This may happen if your Google Drive connection has expired or been revoked.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings?tab=integrations')}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <Settings className="h-3 w-3 mr-1" />
                Connect Google Drive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-red-600 hover:bg-red-100"
              >
                Refresh Status
              </Button>
            </div>
          </div>
        )}

        {/* Upload Summary */}
        {hasFilesToUpload && (
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
            <h3 className="text-lg font-semibold text-foreground">Post Ideas</h3>
            
            {postIdeaSections.map((section, index) => (
              <div key={section.id} className="bg-card border border-border rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">{section.title}</h4>
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
                        <div key={fileIndex} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePostIdeaFileRemove(section.id, fileIndex)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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

                {/* Uploaded Files */}
                {section.uploadedFiles.length > 0 && section.uploadedFiles[0].id && (
                  <div className="space-y-2 mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground">Uploaded Files:</h5>
                    <UploadedFilesList
                      files={section.uploadedFiles.map(file => ({
                        id: file.id,
                        fileName: file.fileName,
                        fileSize: file.fileSize,
                        mimeType: file.mimeType,
                        driveFileWebViewLink: file.webViewLink,
                        driveFileDownloadLink: file.webContentLink,
                        uploadedAt: file.uploadedAt
                      }))}
                      driveFolder={section.uploadedFiles[0]?.driveFolderId ? {
                        id: section.uploadedFiles[0].driveFolderId,
                        webViewLink: `https://drive.google.com/drive/folders/${section.uploadedFiles[0].driveFolderId}`,
                        path: `/Client/${section.title}/raw-files`
                      } : undefined}
                      title="Uploaded Files"
                      showFolderLink={true}
                    />
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
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="font-medium text-card-foreground mb-4">Additional Files</h4>
          
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Files</Label>
            <FileUploadZone
              onFilesSelected={handleMiscFilesSelected}
              maxFiles={10}
              acceptedTypes={['image/*', 'video/*', '.pdf', '.doc', '.docx']}
            />
          </div>

          {/* Selected Misc Files */}
          {selectedMiscFiles.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Selected Files ({selectedMiscFiles.length})
              </Label>
              <div className="space-y-2">
                {selectedMiscFiles.map((file, fileIndex) => (
                  <div key={fileIndex} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMiscFileRemove(fileIndex)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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

          {/* Uploaded Misc Files */}
          {miscFiles && miscFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              <h5 className="text-sm font-medium text-muted-foreground">Uploaded Misc Files:</h5>
              <UploadedFilesList
                files={miscFiles.map(file => ({
                  id: file.id,
                  fileName: file.fileName,
                  fileSize: file.fileSize,
                  mimeType: file.mimeType,
                  driveFileWebViewLink: file.driveFileWebViewLink,
                  driveFileDownloadLink: file.driveFileDownloadLink,
                  uploadedAt: file.uploadedAt || new Date().toISOString()
                }))}
                driveFolder={miscFiles[0]?.driveFolderId ? {
                  id: miscFiles[0].driveFolderId,
                  webViewLink: `https://drive.google.com/drive/folders/${miscFiles[0].driveFolderId}`,
                  path: `/Client/misc-files`
                } : undefined}
                title="Uploaded Misc Files"
                showFolderLink={true}
              />
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
        {!hasFilesToUpload && !isUploading && (
          <EmptyState
            icon={Upload}
            title="No files selected"
            description="Upload your content files to organize them for editing. You can upload files for specific post ideas or add additional files."
          />
        )}

        {/* Upload Button (Mobile) */}
        <div className="sticky bottom-4 pt-4">
          {canShowSendToEditor ? (
            <SendToEditorDialog
              shootId={parseInt(shootId)}
              shootTitle={shoot?.title || 'Untitled Shoot'}
              postIdeas={postIdeasWithUploads}
              onSuccess={handleSendToEditorSuccess}
            >
              <Button className="w-full h-12 tap-target">
                <Mail className="h-4 w-4 mr-2" />
                Send to Editor
              </Button>
            </SendToEditorDialog>
          ) : (
            <LoadingButton
              onClick={handleSubmit}
              disabled={!hasFilesToUpload || !isGoogleDriveConnected}
              loading={isUploading || folderLoading}
              loadingText="Uploading..."
              className="w-full h-12 tap-target"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload {getTotalFiles()} File{getTotalFiles() !== 1 ? 's' : ''} to Drive
            </LoadingButton>
          )}
        </div>
      </div>
    </MobileLayout>
  )
} 