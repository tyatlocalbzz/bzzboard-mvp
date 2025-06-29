'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, User, FileText, Play, CalendarDays } from 'lucide-react'
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
    href: '/posts',
    icon: FileText,
    label: 'Posts',
    activePatterns: ['/posts']
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

  // Show active shoot indicator when there's an active shoot
  const showActiveShootIndicator = isShootActive && activeShoot

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border safe-area-pb">
      <div className={cn(
        "grid h-14",
        showActiveShootIndicator ? "grid-cols-5" : "grid-cols-4"
      )}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.activePatterns)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                "min-h-[44px] relative hover:bg-accent/50",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-none">
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}

        {/* Active Shoot Indicator */}
        {showActiveShootIndicator && (
          <button
            onClick={() => router.push(`/shoots/${activeShoot.id}/active`)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              "min-h-[44px] relative hover:bg-destructive/10",
              "bg-destructive/5 dark:bg-destructive/10",
              pathname.includes(`/shoots/${activeShoot.id}/active`)
                ? "text-destructive" 
                : "text-destructive/80 hover:text-destructive"
            )}
          >
            <Play className="h-5 w-5" />
            <span className="text-xs font-medium leading-none">
              Active
            </span>
            {pathname.includes(`/shoots/${activeShoot.id}/active`) && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-destructive rounded-full" />
            )}
          </button>
        )}
      </div>
    </nav>
  )
} 