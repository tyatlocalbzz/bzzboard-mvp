'use client'

import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutButton } from './sign-out-button'
import { User, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  showFallback?: boolean
  className?: string
}

export const UserAvatar = ({ 
  size = 'md', 
  showFallback = true,
  className = ''
}: UserAvatarProps) => {
  const { data: session } = useSession()

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12'
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserDisplayName = (): string => {
    if (!session?.user) return 'Guest'
    return session.user.name || session.user.email?.split('@')[0] || 'User'
  }

  const getAvatarImage = (): string | undefined => {
    if (!session?.user) return undefined
    
    // Use Google profile image if available
    if (session.user.image) {
      return session.user.image
    }
    
    // For future: could add Gravatar fallback
    // const email = session.user.email
    // if (email) {
    //   const hash = md5(email.toLowerCase().trim())
    //   return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`
    // }
    
    return undefined
  }

  if (!session?.user) {
    return showFallback ? (
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        <AvatarFallback className="bg-gray-100">
          <User className="h-4 w-4 text-gray-400" />
        </AvatarFallback>
      </Avatar>
    ) : null
  }

  const displayName = getUserDisplayName()
  const initials = getInitials(displayName)
  const avatarImage = getAvatarImage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className={cn(
          "cursor-pointer hover:opacity-80 transition-opacity",
          sizeClasses[size],
          className
        )}>
          {avatarImage && (
            <AvatarImage 
              src={avatarImage} 
              alt={`${displayName}'s avatar`}
              className="object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback className={cn(
            "bg-primary text-primary-foreground font-medium",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex flex-col py-2">
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground truncate">{session.user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="w-full flex items-center py-2">
            <User className="h-4 w-4 mr-2" />
            <span className="text-sm">Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <button className="w-full flex items-center py-2" disabled>
            <Settings className="h-4 w-4 mr-2" />
            <span className="text-sm text-gray-400">Settings</span>
          </button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <SignOutButton 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start p-2 h-auto font-normal text-sm"
            showIcon={true}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Smaller variant for use in headers/nav
 */
export const UserAvatarSmall = ({ className }: { className?: string }) => {
  return <UserAvatar size="sm" className={className} />
}

/**
 * Larger variant for use in profile pages
 */
export const UserAvatarLarge = ({ className }: { className?: string }) => {
  return <UserAvatar size="lg" className={className} />
}

/**
 * Display user info alongside avatar
 */
export const UserAvatarWithInfo = ({ 
  showEmail = false,
  className = ''
}: { 
  showEmail?: boolean
  className?: string 
}) => {
  const { data: session } = useSession()

  if (!session?.user) return null

  const displayName = session.user.name || session.user.email?.split('@')[0] || 'User'
  const isGoogleUser = session.provider === 'google'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <UserAvatar />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {displayName}
          </span>
          {isGoogleUser && (
            <div className="flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                  fill="#4285F4"
                />
                <path 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                  fill="#34A853"
                />
                <path 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
                  fill="#FBBC05"
                />
                <path 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                  fill="#EA4335"
                />
              </svg>
            </div>
          )}
        </div>
        {showEmail && session.user.email && (
          <span className="text-sm text-gray-500 truncate">
            {session.user.email}
          </span>
        )}
      </div>
    </div>
  )
} 