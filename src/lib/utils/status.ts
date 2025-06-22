// Centralized Status Management System
// This eliminates all DRY violations by providing a single source of truth for status handling

export type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary'

// Status type definitions
export type ShootStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type PostIdeaStatus = 'planned' | 'shot' | 'uploaded'
export type UserStatus = 'active' | 'inactive' | 'pending'
export type UploadStatus = 'uploading' | 'completed' | 'failed' | 'paused'
export type AllStatusTypes = ShootStatus | PostIdeaStatus | UserStatus | UploadStatus

// Status configuration interface
interface StatusConfig<T extends string> {
  label: string
  color: BadgeVariant
  textColor: string
  bgColor: string
  transitions?: T[]
  icon?: string
}

// Centralized status configurations
const SHOOT_STATUS_CONFIG: Record<ShootStatus, StatusConfig<ShootStatus>> = {
  scheduled: {
    label: 'Scheduled',
    color: 'default',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    transitions: ['active', 'cancelled']
  },
  active: {
    label: 'Active',
    color: 'destructive',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    transitions: ['completed', 'cancelled']
  },
  completed: {
    label: 'Completed',
    color: 'secondary',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    transitions: []
  },
  cancelled: {
    label: 'Cancelled',
    color: 'outline',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    transitions: ['scheduled']
  }
}

const POST_IDEA_STATUS_CONFIG: Record<PostIdeaStatus, StatusConfig<PostIdeaStatus>> = {
  planned: {
    label: 'Planned',
    color: 'default',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    transitions: ['shot']
  },
  shot: {
    label: 'Shot',
    color: 'secondary',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    transitions: ['uploaded', 'planned']
  },
  uploaded: {
    label: 'Uploaded',
    color: 'outline',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    transitions: ['planned']
  }
}

const USER_STATUS_CONFIG: Record<UserStatus, StatusConfig<UserStatus>> = {
  active: {
    label: 'Active',
    color: 'secondary',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    transitions: ['inactive']
  },
  inactive: {
    label: 'Inactive',
    color: 'destructive',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    transitions: ['active']
  },
  pending: {
    label: 'Pending',
    color: 'default',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    transitions: ['active', 'inactive']
  }
}

const UPLOAD_STATUS_CONFIG: Record<UploadStatus, StatusConfig<UploadStatus>> = {
  uploading: {
    label: 'Uploading...',
    color: 'default',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    transitions: ['completed', 'failed', 'paused']
  },
  completed: {
    label: 'Completed',
    color: 'secondary',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    transitions: []
  },
  failed: {
    label: 'Failed',
    color: 'destructive',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    transitions: ['uploading']
  },
  paused: {
    label: 'Paused',
    color: 'outline',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    transitions: ['uploading', 'failed']
  }
}

// Generic StatusManager class
export class StatusManager<T extends string> {
  constructor(private config: Record<T, StatusConfig<T>>) {}

  getColor(status: T): BadgeVariant {
    return this.config[status]?.color || 'secondary'
  }

  getLabel(status: T): string {
    return this.config[status]?.label || status
  }

  getTextColor(status: T): string {
    return this.config[status]?.textColor || 'text-gray-600'
  }

  getBgColor(status: T): string {
    return this.config[status]?.bgColor || 'bg-gray-50'
  }

  getValidTransitions(status: T): T[] {
    return this.config[status]?.transitions || []
  }

  canTransitionTo(from: T, to: T): boolean {
    const transitions = this.getValidTransitions(from)
    return transitions.includes(to)
  }

  getAllStatuses(): T[] {
    return Object.keys(this.config) as T[]
  }

  getStatusConfig(status: T): StatusConfig<T> | undefined {
    return this.config[status]
  }
}

// Pre-configured status managers
export const shootStatusManager = new StatusManager(SHOOT_STATUS_CONFIG)
export const postIdeaStatusManager = new StatusManager(POST_IDEA_STATUS_CONFIG)
export const userStatusManager = new StatusManager(USER_STATUS_CONFIG)
export const uploadStatusManager = new StatusManager(UPLOAD_STATUS_CONFIG)

// Convenience functions for backward compatibility
export const getStatusColor = (status: AllStatusTypes | undefined | null): BadgeVariant => {
  // Handle undefined/null status
  if (!status) {
    return 'secondary'
  }
  
  // Determine which manager to use based on status value
  if (['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
    return shootStatusManager.getColor(status as ShootStatus)
  }
  if (['planned', 'shot', 'uploaded'].includes(status)) {
    return postIdeaStatusManager.getColor(status as PostIdeaStatus)
  }
  if (['active', 'inactive', 'pending'].includes(status)) {
    return userStatusManager.getColor(status as UserStatus)
  }
  if (['uploading', 'completed', 'failed', 'paused'].includes(status)) {
    return uploadStatusManager.getColor(status as UploadStatus)
  }
  return 'secondary'
}

export const formatStatusText = (status: AllStatusTypes | undefined | null): string => {
  // Handle undefined/null status
  if (!status) {
    return 'Unknown'
  }
  
  // Determine which manager to use based on status value
  if (['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
    return shootStatusManager.getLabel(status as ShootStatus)
  }
  if (['planned', 'shot', 'uploaded'].includes(status)) {
    return postIdeaStatusManager.getLabel(status as PostIdeaStatus)
  }
  if (['active', 'inactive', 'pending'].includes(status)) {
    return userStatusManager.getLabel(status as UserStatus)
  }
  if (['uploading', 'completed', 'failed', 'paused'].includes(status)) {
    return uploadStatusManager.getLabel(status as UploadStatus)
  }
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Role-related functions (keeping existing functionality)
export const getRoleColor = (role: string): BadgeVariant => {
  return role === 'admin' ? 'default' : 'secondary'
}

// Legacy type for backward compatibility
export type StatusType = AllStatusTypes 