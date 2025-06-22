import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatsCard } from '@/components/ui/stats-card'
import { MenuItemButton } from '@/components/ui/menu-item'
import { getRoleColor, getStatusColor } from '@/lib/utils/status'
import { 
  Mail, 
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
      {/* User Profile Summary */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">{user.name}</h3>
            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getRoleColor(user.role)} className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {user.role.toUpperCase()}
              </Badge>
              <Badge variant={getStatusColor(user.status)} className="text-xs">
                {user.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            title="Member Since"
            value={new Date(user.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Last Login"
            value={user.lastLoginAt 
              ? new Date(user.lastLoginAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })
              : 'Never'
            }
            icon={Activity}
            color="green"
          />
        </div>
      </div>

      {/* First Login Welcome */}
      {user.isFirstLogin && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Welcome to Buzzboard!</h2>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-blue-800 font-medium mb-2 text-sm">Complete Your Setup</div>
              <div className="text-blue-700 text-xs mb-3">
                Please set your password to secure your account and get started.
              </div>
              <ChangePasswordForm>
                <Button className="w-full h-12 tap-target">
                  <Key className="h-4 w-4 mr-2" />
                  Set Your Password
                </Button>
              </ChangePasswordForm>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Profile Settings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
        <div className="space-y-2">
          <EditProfileForm user={{ name: user.name, email: user.email }}>
            <MenuItemButton
              icon={Edit}
              title="Edit Profile"
              description="Update your name and email"
            />
          </EditProfileForm>

          <ChangePasswordForm>
            <MenuItemButton
              icon={Key}
              title="Change Password"
              description="Update your account password"
            />
          </ChangePasswordForm>
        </div>
      </div>

      {/* Administration - Only show for admins */}
      {user.role === 'admin' && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Administration</h2>
            <Link href="/admin/users">
              <MenuItemButton
                icon={Users}
                title="User Management"
                description="Manage team members and permissions"
              />
            </Link>
          </div>
        </>
      )}

      <Separator />

      {/* General Settings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">General</h2>
        <div className="space-y-2">
          <MenuItemButton
            icon={Bell}
            title="Notifications"
            description="Coming soon"
            disabled
            className="opacity-50 cursor-not-allowed"
          />

          <MenuItemButton
            icon={HelpCircle}
            title="Help & Support"
            description="Coming soon"
            disabled
            className="opacity-50 cursor-not-allowed"
          />
        </div>
      </div>

      <Separator />

      {/* Sign Out */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Session</h2>
        <SignOutButton 
          variant="outline" 
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 tap-target"
          showIcon={true}
        />
      </div>
    </div>
  )
} 