'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ActionMenu } from '@/components/ui/action-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { UserDeleteDialog } from '@/components/ui/user-delete-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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
  Search,
  Calendar
} from 'lucide-react'
import { useUserManagement } from '@/lib/hooks/use-user-management'
import type { User } from '@/lib/db/schema'
import { LucideIcon } from 'lucide-react'

interface UserManagementMobileProps {
  onInviteUser?: () => void
}

type SortOption = 'name' | 'email' | 'role' | 'status' | 'lastLogin'
type FilterOption = 'all' | 'active' | 'inactive' | 'admin' | 'user' | 'pending'

export const UserManagementMobile = ({ onInviteUser }: UserManagementMobileProps) => {
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

  // Local state for mobile interactions
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUserSheet, setShowUserSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Memoized filtered and sorted users
  const filteredUsers = useMemo(() => {
    if (!users) return []

    const filtered = users.filter(user => {
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

    // Sort users
    filtered.sort((a, b) => {
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

    return filtered
  }, [users, searchQuery, filterBy, sortBy])

  const setUserLoading = useCallback((userId: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [userId]: loading }))
  }, [])

  const handleUserAction = useCallback(async (
    user: User, 
    action: 'status' | 'role' | 'resend' | 'delete',
    value?: string
  ) => {
    try {
      if (action !== 'delete') {
        setUserLoading(user.id.toString(), true)
      }
      
      switch (action) {
        case 'status':
          await changeUserStatus(user.id.toString(), value as 'active' | 'inactive')
          break
        case 'role':
          await changeUserRole(user.id.toString(), value as 'admin' | 'user')
          break
        case 'resend':
          await resendInvite(user.id.toString())
          break
        case 'delete':
          setSelectedUser(user)
          setShowDeleteDialog(true)
          return
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error)
    } finally {
      if (action !== 'delete') {
        setUserLoading(user.id.toString(), false)
      }
    }
  }, [changeUserStatus, changeUserRole, resendInvite, setUserLoading])

  const handleDeleteUser = useCallback(async (type: 'deactivate' | 'hard') => {
    if (!selectedUser) return
    
    const userId = selectedUser.id.toString()
    
    try {
      setUserLoading(userId, true)
      await deleteUser(userId, type)
      setShowDeleteDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setUserLoading(userId, false)
    }
  }, [deleteUser, selectedUser, setUserLoading])

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    setShowDeleteDialog(open)
    // Clear loading state when dialog is closed without confirming
    if (!open && selectedUser) {
      setUserLoading(selectedUser.id.toString(), false)
    }
  }, [selectedUser, setUserLoading])

  const openUserDetails = useCallback((user: User) => {
    setSelectedUser(user)
    setShowUserSheet(true)
  }, [])

  const getUserActions = useCallback((user: User) => {
    const actions: Array<{
      label: string
      icon: LucideIcon
      onClick: () => void | Promise<void>
      variant?: 'destructive'
    } | 'separator'> = []

    // Status toggle
    if (user.status === 'active') {
      actions.push({
        label: 'Deactivate',
        icon: UserX,
        onClick: () => handleUserAction(user, 'status', 'inactive'),
        variant: 'destructive' as const
      })
    } else {
      actions.push({
        label: 'Activate',
        icon: UserCheck,
        onClick: () => handleUserAction(user, 'status', 'active')
      })
    }

    // Role toggle
    if (user.role === 'user') {
      actions.push({
        label: 'Promote to Admin',
        icon: Shield,
        onClick: () => handleUserAction(user, 'role', 'admin')
      })
    } else {
      actions.push({
        label: 'Demote to User',
        icon: ShieldOff,
        onClick: () => handleUserAction(user, 'role', 'user'),
        variant: 'destructive' as const
      })
    }

    // Resend invite for pending users
    if (user.isFirstLogin) {
      actions.push({
        label: 'Resend Invite',
        icon: Mail,
        onClick: () => handleUserAction(user, 'resend')
      })
    }

    actions.push('separator')

    // Delete
    actions.push({
      label: 'Delete User',
      icon: Trash2,
      onClick: () => handleUserAction(user, 'delete'),
      variant: 'destructive' as const
    })

    return actions
  }, [handleUserAction])

  const getStatusBadge = useCallback((status: string, isFirstLogin: boolean) => {
    if (isFirstLogin) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending
        </Badge>
      )
    }
    
    return status === 'active' ? (
      <Badge className="bg-green-50 text-green-700 border-green-200">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    )
  }, [])

  const getRoleBadge = useCallback((role: string) => {
    return role === 'admin' ? (
      <Badge className="bg-purple-50 text-purple-700 border-purple-200">
        <Crown className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Users className="h-3 w-3 mr-1" />
        User
      </Badge>
    )
  }, [])

  const formatLastLogin = useCallback((lastLoginAt: Date | null, isFirstLogin: boolean) => {
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
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Team</h1>
            <p className="text-sm text-gray-600">Loading users...</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser} disabled size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Team</h1>
            <p className="text-sm text-red-600">Error loading users</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center py-12 text-red-600">
          <span className="text-center">
            Failed to load users<br />
            <span className="text-sm text-gray-500">{error}</span>
          </span>
        </div>
      </div>
    )
  }

  // Empty state
  if (!users || users.length === 0) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Team</h1>
            <p className="text-sm text-gray-600">No team members yet</p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
        
        <EmptyState
          icon={Users}
          title="No team members"
          description="Get started by inviting your first team member to collaborate on content creation."
          action={onInviteUser ? {
            label: "Invite Team Member",
            onClick: onInviteUser
          } : undefined}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Team</h1>
            <p className="text-sm text-gray-600">
              {stats.total} members • {stats.active} active • {stats.admins} admins
            </p>
          </div>
          {onInviteUser && (
            <Button onClick={onInviteUser} size="sm" className="shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>

        {/* Search and filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Filter and Sort */}
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Sort by Name</option>
                <option value="email">Sort by Email</option>
                <option value="role">Sort by Role</option>
                <option value="status">Sort by Status</option>
                <option value="lastLogin">Sort by Last Login</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="px-4 py-12">
            <EmptyState
              icon={Search}
              title="No results found"
              description="Try adjusting your search or filter criteria"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => openUserDetails(user)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(user.status, user.isFirstLogin)}
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatLastLogin(user.lastLoginAt, user.isFirstLogin)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {loadingStates[user.id.toString()] ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <ActionMenu
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        items={getUserActions(user)}
                        align="end"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Details Sheet */}
      {selectedUser && (
        <Sheet open={showUserSheet} onOpenChange={setShowUserSheet}>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                </Avatar>
                <div>
                  <div className="text-lg font-semibold text-left">{selectedUser.name}</div>
                  <div className="text-sm text-gray-500 text-left">{selectedUser.email}</div>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6">
              {/* Status and Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div>{getStatusBadge(selectedUser.status, selectedUser.isFirstLogin)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <div>{getRoleBadge(selectedUser.role)}</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Joined {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <UserCheck className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {formatLastLogin(selectedUser.lastLoginAt, selectedUser.isFirstLogin)}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedUser.status === 'active' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleUserAction(selectedUser, 'status', 'inactive')
                        setShowUserSheet(false)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleUserAction(selectedUser, 'status', 'active')
                        setShowUserSheet(false)
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                  )}

                  {selectedUser.role === 'user' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleUserAction(selectedUser, 'role', 'admin')
                        setShowUserSheet(false)
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Promote
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleUserAction(selectedUser, 'role', 'user')
                        setShowUserSheet(false)
                      }}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Demote
                    </Button>
                  )}

                  {selectedUser.isFirstLogin && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleUserAction(selectedUser, 'resend')
                        setShowUserSheet(false)
                      }}
                      className="col-span-2"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invitation
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUserSheet(false)
                      handleUserAction(selectedUser, 'delete')
                    }}
                    className="col-span-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* User Delete Dialog */}
      {selectedUser && (
        <UserDeleteDialog
          open={showDeleteDialog}
          onOpenChange={handleDeleteDialogChange}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          onConfirm={handleDeleteUser}
          isLoading={loadingStates[selectedUser.id.toString()]}
        />
      )}
    </div>
  )
} 