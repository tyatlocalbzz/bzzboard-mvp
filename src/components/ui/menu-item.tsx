import * as React from "react"
import { Button } from "./button"
import { ChevronRight, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItemButtonProps {
  icon: LucideIcon
  title: string
  description?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  showChevron?: boolean
}

export const MenuItemButton = React.forwardRef<HTMLButtonElement, MenuItemButtonProps>(
  ({ icon: Icon, title, description, onClick, disabled = false, className, children, showChevron = true }, ref) => {
    const content = (
      <Button 
        ref={ref}
        variant="ghost" 
        className={cn("w-full justify-between h-12 tap-target", className)}
        onClick={onClick}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <div className="font-medium text-sm">{title}</div>
            {description && (
              <div className="text-xs text-gray-600">{description}</div>
            )}
          </div>
        </div>
        {showChevron && <ChevronRight className="h-4 w-4 text-gray-400" />}
      </Button>
    )

    // If children are provided, wrap the button (for forms/sheets)
    if (children) {
      return <>{React.cloneElement(children as React.ReactElement, {}, content)}</>
    }

    return content
  }
)

MenuItemButton.displayName = "MenuItemButton" 