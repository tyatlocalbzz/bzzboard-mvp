'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useActiveShoot } from '@/contexts/active-shoot-context'
import { useState, useEffect } from 'react'

export const ActiveShootTimer = () => {
  const { activeShoot, elapsedTime, isShootActive, isHydrated } = useActiveShoot()
  const router = useRouter()
  const pathname = usePathname()
  const [isClientReady, setIsClientReady] = useState(false)

  // Ensure component is fully hydrated before showing time-sensitive content
  useEffect(() => {
    setIsClientReady(true)
  }, [])

  // Don't render anything until hydrated to prevent flash
  if (!isHydrated || !isClientReady) {
    return null
  }

  if (!isShootActive || !activeShoot) {
    return null
  }

  // Don't show the banner if we're already on the active shoot page
  const isOnActiveShootPage = pathname.includes(`/shoots/${activeShoot.id}/active`)
  if (isOnActiveShootPage) {
    return null
  }

  const handleGoToShoot = () => {
    router.push(`/shoots/${activeShoot.id}/active`)
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground safe-area-pt active-shoot-timer animate-slide-down">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-destructive/90 transition-colors rounded-sm mx-2 px-3 h-full"
        onClick={handleGoToShoot}
      >
        <div className="text-sm font-medium truncate leading-none">
          {activeShoot.client}
        </div>
        <div className="text-sm font-mono tabular-nums leading-none">
          {elapsedTime}
        </div>
      </div>
    </div>
  )
} 