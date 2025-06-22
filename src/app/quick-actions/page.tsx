'use client'

import { MobileLayout } from "@/components/layout/mobile-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { Zap } from "lucide-react"

export default function QuickActionsPage() {
  return (
    <MobileLayout title="Quick Actions">
      <div className="px-3 py-3">
        <EmptyState
          icon={Zap}
          title="Quick Actions"
          description="Quick actions will be available here soon."
        />
      </div>
    </MobileLayout>
  )
} 