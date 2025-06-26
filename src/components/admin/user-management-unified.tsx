'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ActionMenu } from '@/components/ui/action-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { UserDeleteDialog } from '@/components/ui/user-delete-dialog'
import { Input } from '@/components/ui/input'
import { UserStatusBadge, UserRoleBadge, UserAvatar } from '@/components/ui/user-badges'
import { 
  Users, 
  UserPlus, 
  Search,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { useUserManagement } from '@/lib/hooks/use-user-management'
import { 
  getUserActions, 
  filterUsers, 
  sortUsers, 
  calculateUserStats, 
  formatLastLogin, 
  formatJoinDate,
  type UserSortOption, 
  type UserFilterOption 
} from '@/lib/utils/user-utils'
import type { User } from '@/lib/db/schema'

interface UserManagementUnifiedProps {
  onInviteUser?: () => void
  variant?: 'mobile' | 'desktop' | 'auto'
}

export const UserManagementUnified = ({ 
  onInviteUser, 
  variant = 'auto' 
}: UserManagementUnifiedProps) => {
  const { 
    users, 
    isLoading, 
    error, 
    changeUserStatus, 
    changeUserRole, 
    resendInvite, 
    deleteUser 
  } = useUserManagement()

  // Local state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUserSheet, setShowUserSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<UserSortOption>('name')
  const [filterBy, setFilterBy] = useState<UserFilterOption>('all')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Determine display variant
  const isMobile = variant === 'mobile' || (variant === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768)

  // Memoized filtered and sorted users
  const filteredUsers = useMemo(() => {
    if (!users) return []
    const filtered = filterUsers(users, searchQuery, filterBy)
    return sortUsers(filtered, sortBy)
  }, [users, searchQuery, filterBy, sortBy])

  // Calculate stats
  const stats = useMemo(() => {
    return calculateUserStats(users || [])
  }, [users])

  // Loading state management
  const setUserLoading = useCallback((userId: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [userId]: loading }))
  }, [])

  // User action handlers
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

  // Delete handler
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

  // User actions generator
  const userActionHandlers = useMemo(() => ({
    onStatusChange: async (user: User, status: 'active' | 'inactive') => {
      await handleUserAction(user, 'status', status)
    },
    onRoleChange: async (user: User, role: 'admin' | 'user') => {
      await handleUserAction(user, 'role', role)
    },
    onResendInvite: async (user: User) => {
      await handleUserAction(user, 'resend')
    },
    onDelete: (user: User) => {
      handleUserAction(user, 'delete')
    }
  }), [handleUserAction])

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Team</h1>
              <p className="text-sm text-muted-foreground">
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as UserFilterOption)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
                  onChange={(e) => setSortBy(e.target.value as UserSortOption)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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

        {/* Mobile Users List */}
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
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-4 hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowUserSheet(true)
                      }}
                    >
                      <UserAvatar user={user} size="md" className="shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name}
                          </p>
                          <UserRoleBadge role={user.role} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2">
                          <UserStatusBadge status={user.status} isFirstLogin={user.isFirstLogin} />
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
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
                          items={getUserActions(user, userActionHandlers)}
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
                  <UserAvatar user={selectedUser} size="lg" />
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
                    <div><UserStatusBadge status={selectedUser.status} isFirstLogin={selectedUser.isFirstLogin} /></div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div><UserRoleBadge role={selectedUser.role} /></div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Joined {formatJoinDate(selectedUser.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="space-y-6">
      {/* Desktop Header */}
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

      {/* Desktop Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as UserFilterOption)}
          className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as UserSortOption)}
          className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="name">Sort by Name</option>
          <option value="email">Sort by Email</option>
          <option value="role">Sort by Role</option>
          <option value="status">Sort by Status</option>
          <option value="lastLogin">Sort by Last Login</option>
        </select>
      </div>

      {/* Desktop Table */}
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
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserAvatar user={user} size="sm" className="shrink-0" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                          {user.isFirstLogin && (
                            <span className="ml-2 text-xs text-yellow-600">
                              (Pending)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserStatusBadge status={user.status} isFirstLogin={user.isFirstLogin} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserRoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastLogin(user.lastLoginAt, user.isFirstLogin)}
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
                        items={getUserActions(user, userActionHandlers)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Delete Dialog */}
      {selectedUser && (
        <UserDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          onConfirm={handleDeleteUser}
          isLoading={loadingStates[selectedUser.id.toString()]}
        />
      )}
    </div>
  )
} 