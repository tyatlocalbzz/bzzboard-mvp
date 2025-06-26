'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConflictEvent {
  title: string
  startTime: string
  endTime: string
}

interface ConflictWarningSectionProps {
  conflicts: ConflictEvent[]
  loading: boolean
  onForceCreate: () => void
  onForceCalendarCreate: () => void
  onModifyTime: () => void
}

export const ConflictWarningSection = ({
  conflicts,
  loading,
  onForceCreate,
  onForceCalendarCreate,
  onModifyTime
}: ConflictWarningSectionProps) => {
  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
            Calendar Conflicts Detected
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
            The following events overlap with your proposed shoot time:
          </p>
          
          {/* Conflict List */}
          <div className="space-y-2 mb-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="bg-card border border-border rounded p-2 text-sm">
                <div className="font-medium text-card-foreground">{conflict.title}</div>
                <div className="text-muted-foreground">
                  {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onForceCreate}
                disabled={loading}
                className="flex-1"
              >
                Create Shoot Only
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onForceCalendarCreate}
                disabled={loading}
                className="flex-1"
              >
                Create Both Anyway
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onModifyTime}
              disabled={loading}
              className="w-full"
            >
              Modify Time Instead
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 