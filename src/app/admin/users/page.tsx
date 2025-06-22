import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { getAllUsers } from '@/lib/db/users'
import { redirect } from 'next/navigation'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatsCard } from '@/components/ui/stats-card'
import { ListItem } from '@/components/ui/list-item'
import { EmptyState } from '@/components/ui/empty-state'
import { InviteUserForm } from '@/components/admin/invite-user-form'
import { getRoleColor, getStatusColor } from '@/lib/utils/status'
import { 
  Clock, 
  Plus,
  User,
  Users as UsersIcon,
  UserCheck,
  Crown
} from 'lucide-react'

export default async function AdminUsersPage() {
  const currentUser = await getCurrentAuthUser()
  
  // Simple admin check
  if (currentUser.role !== 'admin' || currentUser.status !== 'active') {
    redirect('/')
  }

  const allUsers = await getAllUsers()

  const getUserStats = () => {
    const total = allUsers.length
    const active = allUsers.filter(u => u.status === 'active').length
    const admins = allUsers.filter(u => u.role === 'admin').length
    
    return { total, active, admins }
  }

  const stats = getUserStats()

  return (
    <MobileLayout 
      title="User Management" 
      backHref="/account"
      showClientSelector={false}
      headerAction={
        <InviteUserForm>
          <Button size="sm" className="h-8 px-3 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Invite
          </Button>
        </InviteUserForm>
      }
    >
      <div className="px-3 py-3 space-y-6">
        {/* User Stats */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatsCard
              title="Total Users"
              value={stats.total}
              icon={UsersIcon}
              color="blue"
            />
            <StatsCard
              title="Active"
              value={stats.active}
              icon={UserCheck}
              color="green"
            />
            <StatsCard
              title="Admins"
              value={stats.admins}
              icon={Crown}
              color="purple"
            />
          </div>
        </div>

        <Separator />

        {/* Users List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          {allUsers.length > 0 ? (
            <div className="space-y-3">
              {allUsers.map((user, index) => (
                <div key={user.id}>
                  <ListItem
                    title={user.name}
                    subtitle={user.email}
                    avatar={{
                      text: user.name?.charAt(0).toUpperCase() || 'U',
                      color: "bg-blue-600"
                    }}
                    badges={[
                      ...(user.id === currentUser.dbId ? [{ text: 'You', variant: 'outline' as const }] : []),
                      ...(user.isFirstLogin ? [{ text: 'First Login', variant: 'secondary' as const }] : []),
                      { text: user.role.toUpperCase(), variant: getRoleColor(user.role) },
                      { text: user.status.toUpperCase(), variant: getStatusColor(user.status) }
                    ]}
                    metadata={[
                      { 
                        icon: User, 
                        text: `Joined ${new Date(user.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}`
                      },
                      { 
                        icon: Clock, 
                        text: user.lastLoginAt 
                          ? `Active ${new Date(user.lastLoginAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}`
                          : 'Never logged in'
                      }
                    ]}
                  />
                  
                  {/* Add separator between users, but not after the last one */}
                  {index < allUsers.length - 1 && (
                    <Separator className="ml-15" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <EmptyState
              icon={UsersIcon}
              title="No users yet"
              description="Invite team members to get started with collaboration."
              action={{
                label: "Invite Your First User",
                children: (
                  <InviteUserForm>
                    <Button className="tap-target">
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Your First User
                    </Button>
                  </InviteUserForm>
                )
              }}
            />
          )}
        </div>
      </div>
    </MobileLayout>
  )
} 