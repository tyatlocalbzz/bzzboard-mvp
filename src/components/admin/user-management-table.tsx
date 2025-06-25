'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ActionMenu } from '@/components/ui/action-menu'
// TODO: Create these dialog components
// import { UserActivityDialog } from './user-activity-dialog'
// import { EditUserDialog } from './edit-user-dialog'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { 
  Users, 
  UserPlus, 
  Crown, 
  UserCheck, 
  UserX, 
  Mail, 
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldOff,
  LucideIcon
} from 'lucide-react'
import { useUserManagement } from '@/lib/hooks/use-user-management'
import type { User } from '@/lib/db/schema'

interface UserManagementTableProps {
  onInviteUser?: () => void
}

export const UserManagementTable = ({ onInviteUser }: UserManagementTableProps) => {
  const { 
    users, 
    stats, 
    isLoading, 
    error, 
    changeUserStatus, 
    changeUserRole, 
    resendInvite, 
    deleteUser 
  } = useUserManagement()

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // TODO: Add back when dialog components are created
  // const [showActivityDialog, setShowActivityDialog] = useState(false)
  // const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Loading states for individual operations
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setUserLoading = (userId: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [userId]: loading }))
  }

  const handleStatusChange = async (user: User, newStatus: 'active' | 'inactive') => {
    try {
      setUserLoading(user.id.toString(), true)
      await changeUserStatus(user.id.toString(), newStatus)
    } catch (error) {
      console.error('Error changing user status:', error)
    } finally {
      setUserLoading(user.id.toString(), false)
    }
  }

  const handleRoleChange = async (user: User, newRole: 'admin' | 'user') => {
    try {
      setUserLoading(user.id.toString(), true)
      await changeUserRole(user.id.toString(), newRole)
    } catch (error) {
      console.error('Error changing user role:', error)
    } finally {
      setUserLoading(user.id.toString(), false)
    }
  }

  const handleResendInvite = async (user: User) => {
    try {
      setUserLoading(user.id.toString(), true)
      await resendInvite(user.id.toString())
    } catch (error) {
      console.error('Error resending invite:', error)
    } finally {
      setUserLoading(user.id.toString(), false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUser(user.id.toString())
      setShowDeleteDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const getUserActions = (user: User) => {
    const actions: Array<{
      label: string
      icon: LucideIcon
      onClick: () => void
      variant?: 'destructive'
    }> = [
      // TODO: Add back when dialog components are created
      // {
      //   label: 'View Activity',
      //   icon: Activity,
      //   onClick: () => {
      //     setSelectedUser(user)
      //     setShowActivityDialog(true)
      //   }
      // },
      // {
      //   label: 'Edit User',
      //   icon: Edit,
      //   onClick: () => {
      //     setSelectedUser(user)
      //     setShowEditDialog(true)
      //   }
      // }
    ]

    // Add status toggle
    if (user.status === 'active') {
      actions.push({
        label: 'Deactivate',
        icon: UserX,
        onClick: () => handleStatusChange(user, 'inactive'),
        variant: 'destructive' as const
      })
    } else {
      actions.push({
        label: 'Activate',
        icon: UserCheck,
        onClick: () => handleStatusChange(user, 'active')
      })
    }

    // Add role toggle
    if (user.role === 'user') {
      actions.push({
        label: 'Promote to Admin',
        icon: Shield,
        onClick: () => handleRoleChange(user, 'admin')
      })
    } else {
      actions.push({
        label: 'Demote to User',
        icon: ShieldOff,
        onClick: () => handleRoleChange(user, 'user'),
        variant: 'destructive' as const
      })
    }

    // Add resend invite for first-time users
    if (user.isFirstLogin) {
      actions.push({
        label: 'Resend Invite',
        icon: Mail,
        onClick: () => handleResendInvite(user)
      })
    }

    // Add delete option
    actions.push({
      label: 'Delete User',
      icon: Trash2,
      onClick: () => {
        setSelectedUser(user)
        setShowDeleteDialog(true)
      },
      variant: 'destructive' as const
    })

    return actions
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
        <Crown className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge variant="outline">
        <Users className="h-3 w-3 mr-1" />
        User
      </Badge>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage users and their permissions</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center py-12 text-red-600">
          <span>Error loading users: {error}</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage users and their permissions</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser} disabled>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage users and their permissions</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
        
        <EmptyState
          icon={Users}
          title="No users found"
          description="Get started by inviting your first user"
          action={onInviteUser ? {
            label: "Invite User",
            onClick: onInviteUser
          } : undefined}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600">
            {stats.total} total users • {stats.active} active • {stats.admins} admins
          </p>
        </div>
        {onInviteUser && (
          <Button onClick={onInviteUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                          {user.isFirstLogin && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : user.isFirstLogin 
                        ? 'Never (Pending)'
                        : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {loadingStates[user.id.toString()] ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <ActionMenu
                        trigger={
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        items={getUserActions(user)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {selectedUser && (
        <>
          {/* TODO: Create UserActivityDialog and EditUserDialog components */}
          {/* <UserActivityDialog
            open={showActivityDialog}
            onOpenChange={setShowActivityDialog}
            user={selectedUser}
          />
          
          <EditUserDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            user={selectedUser}
            onSuccess={() => {
              setShowEditDialog(false)
              setSelectedUser(null)
            }}
          /> */}
          
          <DeleteConfirmationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title="Delete User"
            description={`Are you sure you want to delete "${selectedUser.name}"? This will deactivate their account.`}
            itemName={selectedUser.name}
            onConfirm={() => handleDeleteUser(selectedUser)}
          />
        </>
      )}
    </div>
  )
} 