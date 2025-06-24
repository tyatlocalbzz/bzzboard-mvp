'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, User, Plus, Play, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveShoot } from '@/contexts/active-shoot-context'

const navItems = [
  {
    href: '/',
    icon: Home,
    label: 'Home',
    activePatterns: ['/']
  },
  {
    href: '/shoots',
    icon: CalendarDays,
    label: 'Schedule',
    activePatterns: ['/shoots', '/calendar']
  },
  {
    href: '/quick-actions',
    icon: Plus,
    label: 'Quick',
    activePatterns: ['/quick-actions'],
    isAction: true
  },
  {
    href: '/settings',
    icon: User,
    label: 'Settings',
    activePatterns: ['/settings', '/account', '/profile', '/admin']
  }
]

export const BottomNav = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { activeShoot, isShootActive } = useActiveShoot()

  const isActive = (patterns: string[]) => {
    return patterns.some(pattern => {
      if (pattern === '/') {
        return pathname === pattern
      }
      if (pattern === '/shoots') {
        // Special case: /shoots should not match active shoot pages, but should include calendar
        return (pathname.startsWith('/shoots') && !pathname.includes('/active')) || pathname.startsWith('/calendar')
      }
      return pathname.startsWith(pattern)
    })
  }

  const handleQuickAction = () => {
    if (isShootActive && activeShoot) {
      // If there's an active shoot, go to it instead of quick actions
      router.push(`/shoots/${activeShoot.id}/active`)
    } else {
      // Otherwise go to quick actions
      router.push('/quick-actions')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
      <div className="grid grid-cols-5 h-14">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.activePatterns)
          
          // Special handling for the quick action button
          if (item.isAction) {
            const ActionIcon = isShootActive ? Play : Plus
            const actionLabel = isShootActive ? 'Active' : 'Quick'
            const actionActive = isShootActive ? pathname.includes(`/shoots/${activeShoot?.id}/active`) : active
            
            return (
              <button
                key={item.href}
                onClick={handleQuickAction}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  "min-h-[44px] relative",
                  actionActive 
                    ? "text-blue-600" 
                    : "text-gray-500 hover:text-gray-700",
                  isShootActive ? "bg-red-50" : "bg-blue-50"
                )}
              >
                <ActionIcon className={cn(
                  "h-5 w-5",
                  isShootActive ? "text-red-600" : "text-blue-600"
                )} />
                <span className="text-xs font-medium leading-none">
                  {actionLabel}
                </span>
                {actionActive && (
                  <div className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full",
                    isShootActive ? "bg-red-600" : "bg-blue-600"
                  )} />
                )}
              </button>
            )
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                "min-h-[44px] relative",
                active 
                  ? "text-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-none">
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
} 