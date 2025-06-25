'use client'

import { PostIdea } from '@/lib/hooks/use-posts'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Calendar, Users, FileText, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PostIdeaCardProps {
  post: PostIdea
  onEdit?: (post: PostIdea) => void
  onDelete?: (post: PostIdea) => void
  onDuplicate?: (post: PostIdea) => void
  onAssignToShoot?: (post: PostIdea) => void
  onClick?: (post: PostIdea) => void
  showClient?: boolean
  className?: string
}

export const PostIdeaCard = ({
  post,
  onEdit,
  onDelete,
  onDuplicate,
  onAssignToShoot,
  onClick,
  showClient = false,
  className
}: PostIdeaCardProps) => {
  const handleCardClick = () => {
    if (onClick) {
      onClick(post)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(post)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(post)
    }
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDuplicate) {
      onDuplicate(post)
    }
  }

  const handleAssignToShoot = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAssignToShoot) {
      onAssignToShoot(post)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800'
      case 'shot':
        return 'bg-yellow-100 text-yellow-800'
      case 'uploaded':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const hasActions = onEdit || onDelete || onDuplicate || onAssignToShoot

  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-gray-50",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">
                {post.title}
              </h3>
            </div>
            
            {showClient && post.client && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="h-3 w-3" />
                <span>{post.client.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge 
              status={post.status} 
              className={getStatusColor(post.status)}
            />
            
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onAssignToShoot && (
                    <DropdownMenuItem onClick={handleAssignToShoot}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Assign to Shoot
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1">
          {post.platforms.map((platform) => (
            <Badge 
              key={platform} 
              variant="secondary" 
              className="text-xs"
            >
              {platform}
            </Badge>
          ))}
        </div>

        {/* Caption Preview */}
        {post.caption && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {post.caption}
          </p>
        )}

        {/* Shot List Count */}
        {post.shotList && post.shotList.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <FileText className="h-3 w-3" />
            <span>{post.shotList.length} shot{post.shotList.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Created {formatDate(post.createdAt)}</span>
          {post.updatedAt !== post.createdAt && (
            <span>Updated {formatDate(post.updatedAt)}</span>
          )}
        </div>
      </div>
    </Card>
  )
} 