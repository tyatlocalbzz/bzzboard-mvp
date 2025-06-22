'use client'

import { ReactNode, Suspense } from "react"
import { cn } from "@/lib/utils"
import { BottomNav } from "./bottom-nav"
import { ClientSelector } from "./client-selector"
import { ActiveShootTimer } from "./active-shoot-timer"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useActiveShoot } from "@/contexts/active-shoot-context"
import { usePathname } from "next/navigation"

interface MobileLayoutProps {
  children: ReactNode
  title?: string
  headerAction?: ReactNode
  showBottomNav?: boolean
  showClientSelector?: boolean
  className?: string
  backHref?: string
  compact?: boolean
  loading?: boolean
}

const LoadingSkeleton = () => (
  <div className="space-y-3 px-3 pt-3">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
  </div>
)

export const MobileLayout = ({ 
  children, 
  title, 
  headerAction, 
  showBottomNav = true,
  showClientSelector = true,
  className,
  backHref,
  compact = false,
  loading = false
}: MobileLayoutProps) => {
  const { isShootActive, activeShoot } = useActiveShoot()
  const pathname = usePathname()

  // Check if we're on the active shoot page (timer banner will be hidden)
  const isOnActiveShootPage = isShootActive && activeShoot && pathname.includes(`/shoots/${activeShoot.id}/active`)
  
  // Show timer banner and adjust spacing only if there's an active shoot AND we're not on the active shoot page
  const showTimerBanner = isShootActive && !isOnActiveShootPage

  return (
    <div className="min-h-screen bg-gray-50 touch-scroll relative">
      {/* Active Shoot Timer - Fixed at very top */}
      <ErrorBoundary>
        <ActiveShootTimer />
      </ErrorBoundary>

      {/* Fixed header that accounts for active shoot timer */}
      <header className={cn(
        "fixed left-0 right-0 z-40 bg-white border-b border-gray-200 safe-area-pt",
        showTimerBanner ? "top-10" : "top-0"
      )}>
        <div className="px-3 h-12 flex items-center justify-between gap-2">
          {/* Left section: Back button + Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {backHref && (
              <Link 
                href={backHref}
                className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0 tap-target"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
            )}
            {title && (
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {title}
              </h1>
            )}
          </div>
          
          {/* Center section: Client Selector */}
          {showClientSelector && (
            <div className="flex-shrink-0">
              <ErrorBoundary>
                <ClientSelector compact />
              </ErrorBoundary>
            </div>
          )}
          
          {/* Right section: Header Action */}
          {headerAction && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      </header>
      
      {/* Scrollable content with proper top spacing using CSS classes */}
      <main 
        className={cn(
          "smooth-scroll relative",
          // Use CSS classes for consistent spacing - only use timer spacing if banner is actually shown
          showTimerBanner ? "header-spacing-with-timer" : "header-spacing-normal",
          showBottomNav ? "bottom-nav-spacing" : "pb-4",
          compact ? "px-2" : "px-0",
          className
        )}
        role="main"
      >
        <ErrorBoundary>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <Suspense fallback={<LoadingSkeleton />}>
              {children}
            </Suspense>
          )}
        </ErrorBoundary>
      </main>
      
      {/* Bottom navigation with enhanced z-index and safe area support */}
      {showBottomNav && (
        <ErrorBoundary>
          <BottomNav />
        </ErrorBoundary>
      )}
    </div>
  )
} 