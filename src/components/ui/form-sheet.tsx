import * as React from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet"
import { Button } from "./button"
import { LoadingButton } from "./loading-button"
import { LucideIcon } from "lucide-react"

interface FormSheetProps {
  trigger: React.ReactNode
  formContent: React.ReactNode
  title: string
  description: string
  icon?: LucideIcon
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
  submitText: string
  loadingText: string
}

export const FormSheet = ({
  trigger,
  formContent,
  title,
  description,
  icon: Icon,
  isOpen,
  onOpenChange,
  onSubmit,
  loading,
  submitText,
  loadingText
}: FormSheetProps) => {
  const handleSubmit = async (formData: FormData) => {
    await onSubmit(formData)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px]">
        {(title || description || Icon) && (
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </SheetTitle>
            <SheetDescription>
              {description}
            </SheetDescription>
          </SheetHeader>
        )}
        
        <div className="flex flex-col h-full pt-2">
          <form action={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-4 py-2">
                {formContent}
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 p-4 border-t bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 tap-target"
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-12"
                loading={loading}
                loadingText={loadingText}
              >
                {submitText}
              </LoadingButton>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
} 