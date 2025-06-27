'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Copy, Trash2, Calendar } from 'lucide-react'
import { formatStatusText, getStatusColor } from '@/lib/utils/status'
import { formatDate } from '@/lib/utils/date-time'
import type { PostIdea } from '@/lib/hooks/use-posts'

interface PostDetailHeaderProps {
  post: PostIdea
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAssignToShoot: () => void
  isDeleting?: boolean
}

export const PostDetailHeader = ({ 
  post,
  onEdit,
  onDuplicate,
  onDelete,
  onAssignToShoot,
  isDeleting = false
}: PostDetailHeaderProps) => {
  return (
    <div className="px-3 py-4 border-b border-border bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground mb-2 leading-tight">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={getStatusColor(post.status)}>
              {formatStatusText(post.status)}
            </Badge>
            <span>•</span>
            <span className="capitalize">{post.contentType}</span>
            {post.client && (
              <>
                <span>•</span>
                <span>{post.client.name}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Created {formatDate(post.createdAt)}</span>
            {post.updatedAt !== post.createdAt && (
              <>
                <span>•</span>
                <span>Updated {formatDate(post.updatedAt)}</span>
              </>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={isDeleting}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit Post</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onDuplicate} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              <span>Duplicate Post</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onAssignToShoot} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Assign to Shoot</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 