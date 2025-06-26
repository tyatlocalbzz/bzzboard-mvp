'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  getUserStatusBadgeProps, 
  getUserRoleBadgeProps, 
  getUserInitials, 
  getUserAvatarGradient 
} from '@/lib/utils/user-utils'
import type { User } from '@/lib/db/schema'

// User Status Badge Component
interface UserStatusBadgeProps {
  status: string
  isFirstLogin?: boolean
}

export const UserStatusBadge = ({ status, isFirstLogin = false }: UserStatusBadgeProps) => {
  const props = getUserStatusBadgeProps(status, isFirstLogin)
  const IconComponent = props.icon
  
  return (
    <Badge variant={props.variant} className={props.className}>
      {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
      {props.children}
    </Badge>
  )
}

// User Role Badge Component
interface UserRoleBadgeProps {
  role: string
}

export const UserRoleBadge = ({ role }: UserRoleBadgeProps) => {
  const props = getUserRoleBadgeProps(role)
  const IconComponent = props.icon
  
  return (
    <Badge variant={props.variant} className={props.className}>
      <IconComponent className="h-3 w-3 mr-1" />
      {props.children}
    </Badge>
  )
}

// User Avatar Component
interface UserAvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const UserAvatar = ({ user, size = 'md', className = '' }: UserAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  }
  
  const initials = getUserInitials(user.name)
  const gradient = getUserAvatarGradient(user.id)
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-semibold ${textSizeClasses[size]}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
} 