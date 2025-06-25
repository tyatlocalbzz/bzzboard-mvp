import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface UploadProgressType {
  uploadedBytes: number
  totalBytes: number
  percentage: number
  status: 'uploading' | 'completed' | 'failed'
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  url: string
}

interface FileUploadSection {
  id: number | null // null for misc files
  title?: string
  files: File[]
  notes: string
  uploadProgress: { [fileName: string]: UploadProgressType }
  uploadedFiles: UploadedFile[]
}

interface UseFileUploadOptions {
  shootId: string
  postIdeas: Array<{ id: number; title: string; platforms: string[] }>
}

interface UseFileUploadReturn {
  sections: FileUploadSection[]
  miscSection: FileUploadSection
  isUploading: boolean
  addFiles: (sectionId: number | null, files: File[]) => void
  removeFile: (sectionId: number | null, fileIndex: number) => void
  updateNotes: (sectionId: number | null, notes: string) => void
  uploadAll: () => Promise<void>
  getTotalFiles: () => number
  getUploadingFiles: () => number
}

export const useFileUpload = ({ 
  shootId, // Will be used for API calls
  postIdeas 
}: UseFileUploadOptions): UseFileUploadReturn => {
  const [sections, setSections] = useState<FileUploadSection[]>(() =>
    postIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      files: [],
      notes: '',
      uploadProgress: {},
      uploadedFiles: []
    }))
  )

  const [miscSection, setMiscSection] = useState<FileUploadSection>({
    id: null,
    files: [],
    notes: '',
    uploadProgress: {},
    uploadedFiles: []
  })

  const [isUploading, setIsUploading] = useState(false)

  const addFiles = useCallback((sectionId: number | null, newFiles: File[]) => {
    if (sectionId === null) {
      setMiscSection(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }))
    } else {
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, files: [...section.files, ...newFiles] }
          : section
      ))
    }
  }, [])

  const removeFile = useCallback((sectionId: number | null, fileIndex: number) => {
    if (sectionId === null) {
      setMiscSection(prev => ({
        ...prev,
        files: prev.files.filter((_, index) => index !== fileIndex)
      }))
    } else {
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, files: section.files.filter((_, index) => index !== fileIndex) }
          : section
      ))
    }
  }, [])

  const updateNotes = useCallback((sectionId: number | null, notes: string) => {
    if (sectionId === null) {
      setMiscSection(prev => ({ ...prev, notes }))
    } else {
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, notes }
          : section
      ))
    }
  }, [])

  const uploadAll = useCallback(async () => {
    setIsUploading(true)
    
    try {
      // Mock upload for now - replace with actual API calls
      console.log('Uploading files for shoot:', shootId)
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('All files uploaded successfully!')
      
    } catch (error) {
      console.error('Upload process failed:', error)
      toast.error('Upload failed. Please try again.')
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [shootId])

  const getTotalFiles = useCallback(() => {
    const sectionFiles = sections.reduce((total, section) => total + section.files.length, 0)
    return sectionFiles + miscSection.files.length
  }, [sections, miscSection])

  const getUploadingFiles = useCallback(() => {
    const sectionUploading = sections.reduce((total, section) => 
      total + Object.keys(section.uploadProgress).length, 0
    )
    const miscUploading = Object.keys(miscSection.uploadProgress).length
    return sectionUploading + miscUploading
  }, [sections, miscSection])

  return {
    sections,
    miscSection,
    isUploading,
    addFiles,
    removeFile,
    updateNotes,
    uploadAll,
    getTotalFiles,
    getUploadingFiles
  }
}
