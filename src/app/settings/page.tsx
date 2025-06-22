import { getCurrentAuthUser } from '@/lib/auth/user-service'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default async function SettingsPage() {
  const user = await getCurrentAuthUser()

  return (
    <MobileLayout title="Settings" showClientSelector={false}>
      <div className="px-3 py-3">
        <SettingsTabs user={user} />
      </div>
    </MobileLayout>
  )
} 