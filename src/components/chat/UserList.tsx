'use client'

import { Users, Star } from 'lucide-react'
import { User } from '@/types/chat'
import { UserListItem } from './UserListItem'

interface UserListProps {
    users: User[]
    frequentContacts: User[]
    userView: 'chatted' | 'all'
    searchQuery: string
    selectedChat: { id: string; type: 'user' | 'group'; name: string } | null
    loading: boolean
    onUserClick: (user: User) => void
}

export const UserList = ({
    users,
    frequentContacts,
    userView,
    searchQuery,
    selectedChat,
    loading,
    onUserClick
}: UserListProps) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p className="text-sm">Loading users...</p>
            </div>
        )
    }

    if (users.length === 0 && frequentContacts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
                <Users className="h-16 w-16 mb-3 opacity-50" />
                <p className="font-medium mb-1">No users found</p>
                <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms' : 'Start a conversation with someone'}
                </p>
            </div>
        )
    }

    return (
        <div className="p-3 space-y-4">
            {/* Frequent Contacts Section */}
            {frequentContacts.length > 0 && userView === 'chatted' && !searchQuery && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Frequent Contacts
                        </h4>
                    </div>
                    <div className="space-y-1">
                        {frequentContacts.map((user) => (
                            <UserListItem
                                key={user.id}
                                user={{
                                    id: user.id,
                                    name: user.username,
                                    avatar: user.avatar,
                                    status: user.status,
                                    role: 'User',
                                    email: user.email,
                                    online: user.online,
                                    lastMessage: user.lastMessage
                                }}
                                onClick={() => onUserClick(user)}
                                onViewDetails={() => { }}
                                showDetailsButton={false}
                                isSelected={selectedChat?.id === user.id && selectedChat?.type === 'user'}
                                showOnlineStatus={true}
                            />
                        ))}
                    </div>
                    <div className="border-t border-border/50 my-2"></div>
                </div>
            )}

            {/* Regular Users List */}
            {users.length > 0 && (
                <div className="space-y-1">
                    {userView === 'chatted' && !searchQuery && frequentContacts.length > 0 && (
                        <div className="px-2 mb-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                All Contacts
                            </h4>
                        </div>
                    )}
                    {users.map((user) => (
                        <UserListItem
                            key={user.id}
                            user={{
                                id: user.id,
                                name: user.username,
                                avatar: user.avatar,
                                status: user.status,
                                role: 'User',
                                email: user.email,
                                online: user.online,
                                lastMessage: user.lastMessage
                            }}
                            onClick={() => onUserClick(user)}
                            onViewDetails={() => { }}
                            showDetailsButton={false}
                            isSelected={selectedChat?.id === user.id && selectedChat?.type === 'user'}
                            showOnlineStatus={true}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}