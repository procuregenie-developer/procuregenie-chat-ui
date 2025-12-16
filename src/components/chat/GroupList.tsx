'use client'

import { MessageCircle } from 'lucide-react'
import { Group } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { GroupListItem } from './GroupListItem'

interface GroupListProps {
  groups: Group[]
  selectedChat: { id: string; type: 'user' | 'group'; name: string } | null
  loading: boolean
  searchQuery: string
  onGroupClick: (group: Group) => void
  onCreateGroup: () => void
}

export const GroupList = ({
  groups,
  selectedChat,
  loading,
  searchQuery,
  onGroupClick,
  onCreateGroup
}: GroupListProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-sm">Loading groups...</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
        <MessageCircle className="h-16 w-16 mb-3 opacity-50" />
        <p className="font-medium mb-1">No groups found</p>
        <p className="text-sm text-muted-foreground mb-4">
          {searchQuery ? 'Try adjusting your search terms' : 'Create a group to start chatting with multiple people'}
        </p>
        <Button onClick={onCreateGroup} size="sm">
          Create Group
        </Button>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1">
      {groups.map((group) => (
        <GroupListItem
          key={group.id}
          group={{
            id: parseInt(group.id),
            name: group.name,
            description: group.description,
            memberCount: group.memberCount,
            lastActivity: group.lastActivity
          }}
          onClick={() => onGroupClick(group)}
          isSelected={selectedChat?.id === group.id && selectedChat?.type === 'group'}
        />
      ))}
    </div>
  )
}