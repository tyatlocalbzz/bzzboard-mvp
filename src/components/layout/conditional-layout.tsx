'use client'

import { usePathname } from 'next/navigation'
import { MobileLayout } from './mobile-layout'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname()
  
  // Auth pages that should not have navigation
  const authPages = [
    '/auth/signin',
    '/auth/signup', 
    '/auth/first-login'
  ]
  
  const isAuthPage = authPages.some(page => pathname.startsWith(page))
  
  // For auth pages, render children directly without MobileLayout
  if (isAuthPage) {
    return <>{children}</>
  }
  
  // For all other pages, use MobileLayout with navigation
  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  )
} 