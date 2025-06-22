import * as React from "react"
import { Button } from "./button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      disabled={disabled || loading}
      className={cn("tap-target", className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {loading ? loadingText || 'Loading...' : children}
    </Button>
  )
})

LoadingButton.displayName = "LoadingButton" 