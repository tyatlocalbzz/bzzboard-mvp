import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  shootStatusManager, 
  postIdeaStatusManager, 
  userStatusManager, 
  uploadStatusManager,
  ShootStatus,
  PostIdeaStatus,
  UserStatus,
  UploadStatus,
  AllStatusTypes,
  BadgeVariant
} from "@/lib/utils/status"

interface StatusBadgeProps {
  status: AllStatusTypes
  statusType?: 'shoot' | 'postIdea' | 'user' | 'upload' | 'auto'
  className?: string
}

export const StatusBadge = ({ 
  status, 
  statusType = 'auto', 
  className
}: StatusBadgeProps) => {
  // Type-safe status handling
  let variant: BadgeVariant
  let label: string
  
  if (statusType === 'shoot' || ['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
    variant = shootStatusManager.getColor(status as ShootStatus)
    label = shootStatusManager.getLabel(status as ShootStatus)
  } else if (statusType === 'postIdea' || ['planned', 'shot', 'uploaded'].includes(status)) {
    variant = postIdeaStatusManager.getColor(status as PostIdeaStatus)
    label = postIdeaStatusManager.getLabel(status as PostIdeaStatus)
  } else if (statusType === 'user' || ['active', 'inactive', 'pending'].includes(status)) {
    variant = userStatusManager.getColor(status as UserStatus)
    label = userStatusManager.getLabel(status as UserStatus)
  } else if (statusType === 'upload' || ['uploading', 'completed', 'failed', 'paused'].includes(status)) {
    variant = uploadStatusManager.getColor(status as UploadStatus)
    label = uploadStatusManager.getLabel(status as UploadStatus)
  } else {
    variant = 'secondary'
    label = status
  }

  return (
    <Badge 
      variant={variant}
      className={cn(
        "font-medium",
        className
      )}
    >
      {label}
    </Badge>
  )
}

// Convenience components for specific status types
export const ShootStatusBadge = ({ status, className }: { status: ShootStatus; className?: string }) => (
  <StatusBadge status={status} statusType="shoot" className={className} />
)

export const PostIdeaStatusBadge = ({ status, className }: { status: PostIdeaStatus; className?: string }) => (
  <StatusBadge status={status} statusType="postIdea" className={className} />
)

export const UserStatusBadge = ({ status, className }: { status: UserStatus; className?: string }) => (
  <StatusBadge status={status} statusType="user" className={className} />
)

export const UploadStatusBadge = ({ status, className }: { status: UploadStatus; className?: string }) => (
  <StatusBadge status={status} statusType="upload" className={className} />
) 