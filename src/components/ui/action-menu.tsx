import * as React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./dropdown-menu"
import { Button } from "./button"
import { LoadingSpinner } from "./loading-spinner"
import { LucideIcon, MoreHorizontal } from "lucide-react"

interface ActionMenuItem {
  label: string
  icon: LucideIcon
  onClick?: () => void
  children?: React.ReactNode
  variant?: 'default' | 'destructive'
  disabled?: boolean
  loading?: boolean
}

interface ActionMenuProps {
  trigger?: React.ReactNode
  items: (ActionMenuItem | 'separator')[]
  align?: 'start' | 'center' | 'end'
  className?: string
}

export const ActionMenu = ({ 
  trigger, 
  items, 
  align = 'end',
  className 
}: ActionMenuProps) => {
  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={className}>
        {items.map((item, index) => {
          if (item === 'separator') {
            return <DropdownMenuSeparator key={`separator-${index}`} />
          }

          const Icon = item.icon
          const isDestructive = item.variant === 'destructive'

          return (
            <DropdownMenuItem
              key={index}
              onClick={item.onClick}
              disabled={item.disabled || item.loading}
              className={`cursor-pointer ${
                isDestructive 
                  ? 'text-red-600 focus:text-red-600 focus:bg-red-50' 
                  : ''
              }`}
              onSelect={item.children ? (e) => e.preventDefault() : undefined}
            >
              {item.loading ? (
                <LoadingSpinner size="md" color="current" className="mr-2" />
              ) : (
                <Icon className="h-4 w-4 mr-2" />
              )}
              {item.children ? (
                item.children
              ) : (
                item.label
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 