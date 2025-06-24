'use client'

import { useState } from 'react'
import { User, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountSettings } from './account-settings'
import { ClientSettingsTab } from './client-settings-tab'
import { IntegrationsTab } from './integrations-tab'
import { AuthUser } from '@/lib/auth/types'

interface SettingsTabsProps {
  user: AuthUser
}

type TabType = 'account' | 'clients' | 'integrations'

const tabs = [
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

export const SettingsTabs = ({ user }: SettingsTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('account')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings user={user} />
      case 'clients':
        return <ClientSettingsTab />
      case 'integrations':
        return <IntegrationsTab user={user} />
      default:
        return <AccountSettings user={user} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
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
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5",
                isActive ? "text-blue-600" : "text-gray-500"
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