import { User } from '@/lib/db/schema'

export type Permission = 
  | 'user.invite'
  | 'user.manage'
  | 'user.deactivate'
  | 'client.create'
  | 'client.manage'
  | 'shoot.create'
  | 'shoot.manage'
  | 'post.create'
  | 'post.manage'

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'user.invite',
    'user.manage', 
    'user.deactivate',
    'client.create',
    'client.manage',
    'shoot.create',
    'shoot.manage',
    'post.create',
    'post.manage'
  ],
  user: [
    'client.create',
    'shoot.create',
    'post.create'
  ]
}

export const hasPermission = (user: User, permission: Permission): boolean => {
  if (!user.role) return false
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || []
  return userPermissions.includes(permission)
}

export const isAdmin = (user: User): boolean => {
  return user.role === 'admin'
}

export const isActiveUser = (user: User): boolean => {
  return user.status === 'active'
}

export const canAccessAdminFeatures = (user: User): boolean => {
  return isAdmin(user) && isActiveUser(user)
} 