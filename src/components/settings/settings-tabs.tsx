'use client'

import { useState } from 'react'
import { User, Settings, Zap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountSettings } from './account-settings'
import { ClientSettingsTab } from './client-settings-tab'
import { IntegrationsTab } from './integrations-tab'
import { AdminSettingsTab } from './admin-settings-tab'
import { AuthUser } from '@/lib/auth/types'

interface SettingsTabsProps {
  user: AuthUser
}

type TabType = 'account' | 'clients' | 'integrations' | 'admin'

const baseTabs = [
  {
    id: 'account' as TabType,
    label: 'Account',
    icon: User
  },
  {
    id: 'clients' as TabType,
    label: 'Clients',
    icon: Settings
  },
  {
    id: 'integrations' as TabType,
    label: 'Integrations',
    icon: Zap
  }
]

const adminTab = {
  id: 'admin' as TabType,
  label: 'Admin',
  icon: Shield
}

export const SettingsTabs = ({ user }: SettingsTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('account')

  // Include admin tab only for admin users
  const tabs = user.role === 'admin' ? [...baseTabs, adminTab] : baseTabs
  const gridCols = tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings user={user} />
      case 'clients':
        return <ClientSettingsTab />
      case 'integrations':
        return <IntegrationsTab user={user} />
      case 'admin':
        return user.role === 'admin' ? <AdminSettingsTab /> : <AccountSettings user={user} />
      default:
        return <AccountSettings user={user} />
    }
  }

  return (
    <div className="space-y-6">
      <div className={cn("grid gap-2 p-1 bg-muted rounded-lg", gridCols)}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-md transition-all duration-200",
                "min-h-[60px] tap-target",
                isActive
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-xs font-medium leading-none">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  )
} 