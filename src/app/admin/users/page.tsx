'use client'

import { useRef } from 'react'
import { MobileLayout } from '@/components/layout/mobile-layout'
import { UserManagementMobile } from '@/components/admin/user-management-mobile'
import { InviteUserForm } from '@/components/admin/invite-user-form'
import { Button } from '@/components/ui/button'

export default function AdminUsersPage() {
  const inviteButtonRef = useRef<HTMLButtonElement>(null)

  const handleInviteUser = () => {
    // Trigger the hidden invite button to open the form
    inviteButtonRef.current?.click()
  }

  return (
    <MobileLayout 
      title="User Management" 
      backHref="/account"
      showClientSelector={false}
    >
      <div className="flex flex-col h-full">
        <UserManagementMobile onInviteUser={handleInviteUser} />
        
        {/* Hidden trigger for mobile-optimized Invite User Form */}
        <InviteUserForm>
          <Button 
            ref={inviteButtonRef}
            style={{ display: 'none' }}
            aria-hidden="true"
          >
            Hidden Trigger
          </Button>
        </InviteUserForm>
      </div>
    </MobileLayout>
  )
} 