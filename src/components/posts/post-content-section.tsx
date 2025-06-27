'use client'

interface PostContentSectionProps {
  caption?: string
  notes?: string
  className?: string
}

export const PostContentSection = ({ 
  caption,
  notes,
  className = ""
}: PostContentSectionProps) => {
  // Don't render if no content
  if (!caption && !notes) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {caption && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Caption</h3>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {caption}
            </p>
          </div>
        </div>
      )}
      
      {notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Notes</h3>
          <div className="p-3 bg-muted/30 rounded-lg border border-muted">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {notes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 