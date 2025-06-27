'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { MobileInput } from '@/components/ui/mobile-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, FileText, Folder } from 'lucide-react'
import { toast } from 'sonner'
import { useAsync } from '@/lib/hooks/use-async'
import type { PostIdeaWithUploads } from '@/lib/types/shoots'

interface SendToEditorDialogProps {
  children: React.ReactNode
  shootId: number
  shootTitle: string
  postIdeas: PostIdeaWithUploads[]
  onSuccess?: () => void
}

interface SendToEditorRequest {
  editorEmail: string
  customMessage?: string
}

const sendToEditor = async (shootId: number, data: SendToEditorRequest) => {
  const response = await fetch(`/api/shoots/${shootId}/send-to-editor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to send content to editor')
  }

  return response.json()
}

export const SendToEditorDialog = ({
  children,
  shootId,
  shootTitle,
  postIdeas,
  onSuccess
}: SendToEditorDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [editorEmail, setEditorEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [emailError, setEmailError] = useState('')

  const { loading, execute } = useAsync(sendToEditor)

  const totalFiles = postIdeas.reduce((sum, idea) => sum + idea.fileCount, 0)
  const postIdeasWithFiles = postIdeas.filter(idea => idea.fileCount > 0)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setEditorEmail(email)
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handleSubmit = async () => {
    // Validate email
    if (!editorEmail.trim()) {
      setEmailError('Editor email is required')
      return
    }

    if (!validateEmail(editorEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    // Check if there are files to send
    if (totalFiles === 0) {
      toast.error('No files found to send to editor')
      return
    }

    try {
      const result = await execute(shootId, {
        editorEmail: editorEmail.trim(),
        customMessage: customMessage.trim() || undefined
      })

      if (result?.success) {
        toast.success(`Content sent to ${editorEmail} successfully!`)
        setIsOpen(false)
        resetForm()
        onSuccess?.()
      }
    } catch (error) {
      console.error('Send to editor failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send content to editor')
    }
  }

  const resetForm = () => {
    setEditorEmail('')
    setCustomMessage('')
    setEmailError('')
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send to Editor
          </DialogTitle>
          <DialogDescription>
            Send organized content links to your editor for post-production work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          {/* Content Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Content Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shoot:</span>
                <span className="font-medium">{shootTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Post Ideas:</span>
                <span className="font-medium">{postIdeasWithFiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Files:</span>
                <span className="font-medium">{totalFiles}</span>
              </div>
            </div>

            {/* Post Ideas Preview */}
            {postIdeasWithFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Post Ideas:</p>
                {postIdeasWithFiles.slice(0, 3).map((idea) => (
                  <div key={idea.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{idea.title}</span>
                    <span className="text-muted-foreground ml-2">{idea.fileCount} files</span>
                  </div>
                ))}
                {postIdeasWithFiles.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{postIdeasWithFiles.length - 3} more post ideas
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Editor Email Input */}
          <MobileInput
            label="Editor Email *"
            type="email"
            placeholder="editor@example.com"
            value={editorEmail}
            onChange={handleEmailChange}
            error={emailError}
            validationState={emailError ? 'invalid' : editorEmail && validateEmail(editorEmail) ? 'valid' : 'idle'}
            required
          />

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="customMessage" className="text-sm font-medium">
              Custom Message (Optional)
            </Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add any specific instructions or notes for the editor..."
              className="min-h-[80px] resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A professional email will be sent with organized Drive links and shoot details
            </p>
          </div>

          {/* What will be sent */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">What will be sent:</p>
                <ul className="text-blue-700 space-y-0.5 text-xs">
                  <li>• Professional email with shoot details</li>
                  <li>• Organized Google Drive folder links</li>
                  <li>• Post idea descriptions and notes</li>
                  <li>• Platform and content type information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            className="flex-1"
            loading={loading}
            loadingText="Sending..."
            disabled={!editorEmail || !!emailError || totalFiles === 0}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send to Editor
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
} 