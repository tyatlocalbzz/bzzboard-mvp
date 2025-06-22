'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

interface SignOutButtonProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  showIcon?: boolean
  className?: string
}

export const SignOutButton = ({ 
  variant = 'ghost', 
  size = 'sm',
  showIcon = true,
  className 
}: SignOutButtonProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({
        callbackUrl: '/auth/signin',
        redirect: true
      })
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className}
    >
      {showIcon && <LogOut className="h-4 w-4 mr-2" />}
      {isSigningOut ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
} 