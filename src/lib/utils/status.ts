export type StatusType = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'planned' | 'shot' | 'uploaded' | 'pending' | 'inactive'

export type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary'

export const getStatusColor = (status: StatusType): BadgeVariant => {
  switch (status) {
    case 'scheduled':
    case 'active':
    case 'planned':
      return 'default'
    case 'completed':
    case 'shot':
    case 'uploaded':
      return 'outline'
    case 'cancelled':
    case 'inactive':
      return 'destructive'
    case 'pending':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export const getRoleColor = (role: string): BadgeVariant => {
  return role === 'admin' ? 'default' : 'secondary'
}

export const formatStatusText = (status: StatusType): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
} 