import { useState, useEffect } from 'react'
import { X, Search, User, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface User {
  id: string
  username: string
  email: string
}

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated: () => void
  getUsersApi: (params: {
    currentPage: number
    limit: number
    moduleValue: number
    search: string
  }) => Promise<{ data: User[] }>
  createGroup: (params: {
    name: string
    groupUsers: number[]
  }) => Promise<any>
}

export default function CreateGroupModal({
  open,
  onOpenChange,
  onGroupCreated,
  getUsersApi,
  createGroup
}: CreateGroupModalProps) {
  const [step, setStep] = useState<'name' | 'users'>('name')
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Fetch users for selection
  const fetchUsers = async (search = '') => {
    setLoading(true)
    try {
      const response = await getUsersApi({
        currentPage: 1,
        limit: 50,
        moduleValue: 0,
        search
      })
      setUsers(response.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && step === 'users') {
      fetchUsers()
    }
  }, [open, step])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const timeoutId = setTimeout(() => {
      fetchUsers(query)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return

    setCreating(true)
    try {
      await createGroup({
        name: groupName.trim(),
        groupUsers: selectedUsers.map(id => parseInt(id))
      })

      onGroupCreated()
      handleClose()
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setStep('name')
    setGroupName('')
    setSelectedUsers([])
    setSearchQuery('')
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {step === 'name' ? 'Create Group' : 'Add Members'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'name' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Group Name
                </label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep('users')}
                  disabled={!groupName.trim()}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Selected Users ({selectedUsers.length})
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedUsers.map(userId => {
                      const user = users.find(u => u.id === userId)
                      return user ? (
                        <div
                          key={userId}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {user.username}
                          <button
                            onClick={() => toggleUserSelection(userId)}
                            className="hover:text-primary/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedUsers.includes(user.id)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground'
                      }`}>
                      {selectedUsers.includes(user.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <User className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-medium">{user.username}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="text-center text-muted-foreground py-4">
                    Loading users...
                  </div>
                )}

                {!loading && users.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No users found
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('name')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateGroup}
                    disabled={selectedUsers.length === 0 || creating}
                  >
                    {creating ? 'Creating...' : 'Create Group'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}