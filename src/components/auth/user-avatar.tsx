'use client'

import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  compact?: boolean
}

export const UserAvatar = ({ compact = false }: UserAvatarProps) => {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Skeleton className={compact ? "h-7 w-7 rounded-full" : "h-8 w-8 rounded-full"} />
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null
  }

  const user = session.user
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className={cn(
          "cursor-pointer hover:opacity-80 transition-opacity",
          compact ? "h-7 w-7" : "h-8 w-8"
        )}>
          <AvatarFallback className={cn(
            "bg-primary text-primary-foreground font-medium",
            compact ? "text-xs" : "text-sm"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex flex-col py-2">
          <span className="font-medium text-sm">{user.name}</span>
          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
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