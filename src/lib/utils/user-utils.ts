import { 
  Users, 
  Crown, 
  UserCheck, 
  UserX,
  Mail,
  Shield,
  ShieldOff,
  Trash2,
  LucideIcon
} from 'lucide-react'
import type { User } from '@/lib/db/schema'

// User status badge utilities - returns props for Badge component
export const getUserStatusBadgeProps = (status: string, isFirstLogin: boolean = false) => {
  if (isFirstLogin) {
    return {
      variant: 'outline' as const,
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      children: 'Pending',
      icon: null
    }
  }
  
  return status === 'active' ? {
    variant: 'default' as const,
    className: 'bg-green-50 text-green-700 border-green-200',
    children: 'Active',
    icon: UserCheck
  } : {
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    children: 'Inactive',
    icon: UserX
  }
}

// User role badge utilities - returns props for Badge component
export const getUserRoleBadgeProps = (role: string) => {
  return role === 'admin' ? {
    variant: 'default' as const,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    children: 'Admin',
    icon: Crown
  } : {
    variant: 'outline' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    children: 'User',
    icon: Users
  }
}

// User avatar utilities
export const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const getUserAvatarGradient = (userId: number): string => {
  // Generate consistent gradient based on user ID
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-blue-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
    'from-teal-500 to-cyan-600',
    'from-indigo-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-yellow-500 to-orange-600'
  ]
  
  return gradients[userId % gradients.length]
}

// Last login formatting utilities
export const formatLastLogin = (lastLoginAt: Date | null, isFirstLogin: boolean): string => {
  if (isFirstLogin) return 'Pending invitation'
  if (!lastLoginAt) return 'Never logged in'
  
  const now = new Date()
  const loginDate = new Date(lastLoginAt)
  const diffInDays = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  
  return loginDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: loginDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

// User action utilities
export interface UserAction {
  label: string
  icon: LucideIcon
  onClick: () => void | Promise<void>
  variant?: 'destructive'
}

export const getUserActions = (
  user: User,
  handlers: {
    onStatusChange: (user: User, status: 'active' | 'inactive') => Promise<void>
    onRoleChange: (user: User, role: 'admin' | 'user') => Promise<void>
    onResendInvite: (user: User) => Promise<void>
    onDelete: (user: User) => void
  }
): (UserAction | 'separator')[] => {
  const actions: (UserAction | 'separator')[] = []

  // Status toggle
  if (user.status === 'active') {
    actions.push({
      label: 'Deactivate',
      icon: UserX,
      onClick: () => handlers.onStatusChange(user, 'inactive'),
      variant: 'destructive' as const
    })
  } else {
    actions.push({
      label: 'Activate',
      icon: UserCheck,
      onClick: () => handlers.onStatusChange(user, 'active')
    })
  }

  // Role toggle
  if (user.role === 'user') {
    actions.push({
      label: 'Promote to Admin',
      icon: Shield,
      onClick: () => handlers.onRoleChange(user, 'admin')
    })
  } else {
    actions.push({
      label: 'Demote to User',
      icon: ShieldOff,
      onClick: () => handlers.onRoleChange(user, 'user'),
      variant: 'destructive' as const
    })
  }

  // Resend invite for pending users
  if (user.isFirstLogin) {
    actions.push({
      label: 'Resend Invite',
      icon: Mail,
      onClick: () => handlers.onResendInvite(user)
    })
  }

  actions.push('separator')

  // Delete
  actions.push({
    label: 'Delete User',
    icon: Trash2,
    onClick: () => handlers.onDelete(user),
    variant: 'destructive' as const
  })

  return actions
}

// User filtering and sorting utilities
export type UserSortOption = 'name' | 'email' | 'role' | 'status' | 'lastLogin'
export type UserFilterOption = 'all' | 'active' | 'inactive' | 'admin' | 'user' | 'pending'

export const filterUsers = (users: User[], searchQuery: string, filterBy: UserFilterOption): User[] => {
  return users.filter(user => {
    // Search filter
    const searchMatch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Status/role filter
    const statusMatch = (() => {
      switch (filterBy) {
        case 'active': return user.status === 'active'
        case 'inactive': return user.status === 'inactive'
        case 'admin': return user.role === 'admin'
        case 'user': return user.role === 'user'
        case 'pending': return user.isFirstLogin
        default: return true
      }
    })()

    return searchMatch && statusMatch
  })
}

export const sortUsers = (users: User[], sortBy: UserSortOption): User[] => {
  return [...users].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'email':
        return a.email.localeCompare(b.email)
      case 'role':
        return a.role.localeCompare(b.role)
      case 'status':
        return a.status.localeCompare(b.status)
      case 'lastLogin':
        const aDate = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
        const bDate = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
        return bDate - aDate
      default:
        return 0
    }
  })
}

// User stats calculation
export interface UserStats {
  total: number
  active: number
  admins: number
  pending: number
}

export const calculateUserStats = (users: User[]): UserStats => {
  return {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    pending: users.filter(u => u.isFirstLogin).length
  }
}

// User display utilities
export const getUserDisplayName = (user: User): string => {
  return user.name || user.email.split('@')[0] || 'User'
}

export const formatJoinDate = (createdAt: Date): string => {
  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
} 