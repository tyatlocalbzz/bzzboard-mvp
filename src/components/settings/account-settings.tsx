import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatsCard } from '@/components/ui/stats-card'
import { MenuItemButton } from '@/components/ui/menu-item'
import { getRoleColor, getStatusColor } from '@/lib/utils/status'
import { 
  Shield, 
  Key, 
  Users, 
  Bell, 
  HelpCircle, 
  Edit,
  Calendar,
  Activity
} from 'lucide-react'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { AuthUser } from '@/lib/auth/types'
import Link from 'next/link'

interface AccountSettingsProps {
  user: AuthUser
}

export const AccountSettings = ({ user }: AccountSettingsProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {user.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getRoleColor(user.role)} 
                    className="text-xs"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role}
                  </Badge>
                  
                  <Badge 
                    variant={getStatusColor(user.status)} 
                    className="text-xs"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
              <StatsCard
                title="Account Type"
                value={user.role === 'admin' ? 'Administrator' : 'Team Member'}
                icon={Shield}
              />
              
              <StatsCard
                title="Member Since"
                value={new Date(user.createdAt).toLocaleDateString()}
                icon={Calendar}
              />
            </div>
          </div>
        </div>
      </div>

      {user.isFirstLogin && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Set Password</h2>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <ChangePasswordForm>
                <Button className="w-full h-12 tap-target">
                  <Key className="h-4 w-4 mr-2" />
                  Set Password
                </Button>
              </ChangePasswordForm>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <div className="space-y-2">
          <EditProfileForm user={{ name: user.name, email: user.email }}>
            <MenuItemButton
              icon={Edit}
              title="Edit Profile"
            />
          </EditProfileForm>

          <ChangePasswordForm>
            <MenuItemButton
              icon={Key}
              title="Change Password"
            />
          </ChangePasswordForm>
        </div>
      </div>

      {user.role === 'admin' && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Admin</h2>
            <Link href="/admin/users">
              <MenuItemButton
                icon={Users}
                title="User Management"
              />
            </Link>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">More</h2>
        <div className="space-y-2">
          <MenuItemButton
            icon={Bell}
            title="Notifications"
            disabled
            className="opacity-50 cursor-not-allowed"
          />

          <MenuItemButton
            icon={HelpCircle}
            title="Help & Support"
            disabled
            className="opacity-50 cursor-not-allowed"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <SignOutButton 
          variant="outline" 
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 tap-target"
          showIcon={true}
        />
      </div>
    </div>
  )
} 