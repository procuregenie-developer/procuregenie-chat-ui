import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Search, Users, MessageCircle, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserListItem } from "./UserListItem";
import { GroupListItem } from "./GroupListItem";
import CreateGroupModal from "./CreateGroupModal";
import { UserDetails } from "./UserDetails";
import { GroupDetails } from "./GroupDetails";
interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  online: boolean;
  lastMessage?: string;
  avatar?: string;
  lastSeen?: string;
  isActive?: boolean;
}
interface Group {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  isMember?: boolean;
  createdBy?: string;
  createdAt?: string;
  avatar?: string;
}

interface ChatListProps {
  getAllUsers: (params: { currentPage: number, totalRecords: number, search: string, moduleValue: number }) => Promise<any>;
  getAllGroups: (params: { page: number, limit: number, search?: string }) => Promise<any>;
  onClose: () => void;
  onSelectChat: (id: number, type: "user" | "group", name: string) => void;
  createGroup: (params: {
    name: string
    groupUsers: number[]
  }) => Promise<any>
}

export const ChatList = ({ getAllUsers, getAllGroups, onClose, onSelectChat, createGroup }: ChatListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [userView, setUserView] = useState<'chatted' | 'all'>('chatted');
  const [frequentContacts, setFrequentContacts] = useState<User[]>([]);


  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreGroups, setHasMoreGroups] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Details view states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  const limit = 20;

  // Fetch data with pagination
  const fetchUsers = useCallback(async (page: number, search = "", reset = false) => {
    if (reset) {
      setUsersPage(1);
      setHasMoreUsers(true);
    }

    const currentPage = reset ? 1 : page;
    setLoading(currentPage === 1);
    setLoadingMore(currentPage > 1);

    try {
      const response = await getAllUsers(
        {
          currentPage, totalRecords: limit, search, moduleValue: userView === 'chatted' ? 1 : 0
        }
      );

      if (response?.status === "success") {
        const usersList = response?.data || [];
        const totalUsers = response?.pagination?.total || 0;

        if (reset) {
          setUsers(usersList);

          // Calculate frequent contacts
          const frequent = usersList
            .filter((user: User) => user.lastMessage)
            .slice(0, 3);
          setFrequentContacts(frequent);
        } else {
          setUsers(prev => [...prev, ...usersList]);
        }

        setHasMoreUsers(users.length + usersList.length < totalUsers);

        if (currentPage === 1) {
          setUsersPage(1);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getAllUsers, userView, users.length]);

  const fetchGroups = useCallback(async (page: number, search = "", reset = false) => {
    if (reset) {
      setGroupsPage(1);
      setHasMoreGroups(true);
    }

    const currentPage = reset ? 1 : page;
    setLoading(currentPage === 1);
    setLoadingMore(currentPage > 1);

    try {
      const response = await getAllGroups({ page: currentPage, limit, search });

      if (response?.status === "success") {
        const groupsList = response?.data || [];
        const totalGroups = response?.pagination?.total || 0;

        if (reset) {
          setGroups(groupsList);
        } else {
          setGroups(prev => [...prev, ...groupsList]);
        }

        setHasMoreGroups(groups.length + groupsList.length < totalGroups);

        if (currentPage === 1) {
          setGroupsPage(1);
        }
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getAllGroups, groups.length]);

  // Initial data fetch
  useEffect(() => {
    if (activeTab === "users") {

      fetchUsers(1, "", true);
    } else {
      fetchGroups(1, "", true);
    }
  }, [activeTab, fetchUsers, fetchGroups]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === "users") {
        fetchUsers(1, searchTerm, true);
      } else {
        fetchGroups(1, searchTerm, true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeTab, fetchUsers, fetchGroups]);

  // Handle user view change
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(1, searchTerm, true);
    }
  }, [userView, fetchUsers]);

  // Load more data
  const loadMoreUsers = useCallback(() => {
    if (!loadingMore && hasMoreUsers) {
      const nextPage = usersPage + 1;
      setUsersPage(nextPage);
      fetchUsers(nextPage, searchTerm, false);
    }
  }, [loadingMore, hasMoreUsers, usersPage, searchTerm, fetchUsers]);

  const loadMoreGroups = useCallback(() => {
    if (!loadingMore && hasMoreGroups) {
      const nextPage = groupsPage + 1;
      setGroupsPage(nextPage);
      fetchGroups(nextPage, searchTerm, false);
    }
  }, [loadingMore, hasMoreGroups, groupsPage, searchTerm, fetchGroups]);

  // Scroll event handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      if (activeTab === "users") {
        loadMoreUsers();
      } else {
        loadMoreGroups();
      }
    }
  }, [activeTab, loadMoreUsers, loadMoreGroups]);

  // Refresh groups after creating a new one
  const refreshGroups = async () => {
    await fetchGroups(1, searchTerm, true);
  };

  // Filter users based on search term (client-side fallback)
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Filter groups based on search term (client-side fallback)
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;

    return groups.filter((group) =>
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  // Get remaining users (excluding frequent contacts)
  const getRemainingUsers = () => {
    if (userView === 'all' && !searchTerm) {
      const frequentIds = frequentContacts.map(u => u.id);
      return filteredUsers.filter(user => !frequentIds.includes(user.id));
    }
    const frequentIds = frequentContacts.map(u => u.id);
    return filteredUsers.filter(user => !frequentIds.includes(user.id));
  };

  // Handler functions
  const handleTabChange = (value: string) => {
    setActiveTab(value as "users" | "groups");
    setSearchTerm("");
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
  };

  const handleUserClick = (user: User) => {
    onSelectChat(user.id, "user", user.username);
  };

  const handleGroupClick = (group: Group) => {
    onSelectChat(group.id, "group", group.name);
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleViewGroupDetails = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const handleCloseUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUser(null);
  };

  const handleCloseGroupDetails = () => {
    setShowGroupDetails(false);
    setSelectedGroup(null);
  };

  return (
    <>
      <div className="fixed bottom-24 min-h-[60%] right-6 w-80 bg-card rounded-lg shadow-2xl z-40 border border-border animate-in slide-in-from-bottom-2 fade-in duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Messaging</h3>
            <div className="flex items-center gap-1">
              {activeTab === 'groups' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateGroup}
                  className="h-8 w-8 rounded-full hover:bg-accent"
                  title="Create group"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* User View Toggle */}
        {activeTab === 'users' && (
          <div className="flex gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <Button
              variant={userView === 'chatted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setUserView('chatted')}
              className="flex-1 text-xs"
            >
              Chatted
            </Button>
            <Button
              variant={userView === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setUserView('all')}
              className="flex-1 text-xs"
            >
              All Users
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >

          {/* Tabs Header */}
          <TabsList className="w-full rounded-none border-b bg-transparent">
            <TabsTrigger
              value="users"
              className="flex-1 flex items-center gap-2 data-[state=active]:bg-accent"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>

            <TabsTrigger
              value="groups"
              className="flex-1 flex items-center gap-2 data-[state=active]:bg-accent"
            >
              <MessageCircle className="h-4 w-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent
            value="users"
            className="min-h-[60%] overflow-y-auto m-0 p-0"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <UserListContent
                users={getRemainingUsers()}
                frequentContacts={frequentContacts}
                userView={userView}
                searchTerm={searchTerm}
                onSelectUser={handleUserClick}
                onViewUserDetails={handleViewUserDetails}
                onClearSearch={clearSearch}
                hasMoreUsers={hasMoreUsers}
                loadingMore={loadingMore}
                onScroll={handleScroll}
                onLoadMore={loadMoreUsers}
              />
            )}
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent
            value="groups"
            className="min-h-[60%] overflow-y-auto m-0 p-0"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                <p>Loading groups...</p>
              </div>
            ) : (
              <GroupListContent
                groups={filteredGroups}
                searchTerm={searchTerm}
                onSelectGroup={handleGroupClick}
                onViewGroupDetails={handleViewGroupDetails}
                onCreateGroup={handleCreateGroup}
                onClearSearch={clearSearch}
                hasMoreGroups={hasMoreGroups}
                loadingMore={loadingMore}
                onScroll={handleScroll}
                onLoadMore={loadMoreGroups}
              />
            )}
          </TabsContent>

        </Tabs>

      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={refreshGroups}
        createGroup={createGroup}
        getUsersApi={getAllUsers}
      />

      {/* User Details Modal */}
      <UserDetails
        user={selectedUser}
        open={showUserDetails}
        onOpenChange={setShowUserDetails}
        onClose={handleCloseUserDetails}
        onStartChat={handleUserClick}
      />

      {/* Group Details Modal */}
      <GroupDetails
        group={selectedGroup}
        open={showGroupDetails}
        onOpenChange={setShowGroupDetails}
        onClose={handleCloseGroupDetails}
        onJoinChat={handleGroupClick}
      />
    </>
  );
};

// User List Content Component
interface UserListContentProps {
  users: User[];
  frequentContacts: User[];
  userView: 'chatted' | 'all';
  searchTerm: string;
  onSelectUser: (user: User) => void;
  onViewUserDetails: (user: User) => void;
  onClearSearch: () => void;
  hasMoreUsers: boolean;
  loadingMore: boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onLoadMore: () => void;
}

const UserListContent = ({
  users,
  frequentContacts,
  userView,
  searchTerm,
  onSelectUser,
  onViewUserDetails,
  onClearSearch,
  hasMoreUsers,
  loadingMore,
  onScroll,
  onLoadMore
}: UserListContentProps) => {
  if (users.length === 0 && frequentContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">
          {searchTerm ? "No users found" : "No users available"}
        </p>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSearch}
            className="mt-2"
          >
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="p-3 space-y-4 max-h-96 overflow-y-auto"
      onScroll={onScroll}
    >
      {/* Frequent Contacts Section */}
      {frequentContacts.length > 0 && userView === 'chatted' && !searchTerm && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Frequent Contacts
            </h4>
          </div>
          <div className="space-y-1">
            {frequentContacts.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                onClick={() => onSelectUser(user)}
                onViewDetails={() => onViewUserDetails(user)}
                isSelected={false}
                showOnlineStatus={true}
                showDetailsButton={true}
              />
            ))}
          </div>
          <div className="border-t border-border/50 my-2"></div>
        </div>
      )}

      {/* Regular Users List */}
      {users.length > 0 && (
        <div className="space-y-1">
          {userView === 'chatted' && !searchTerm && frequentContacts.length > 0 && (
            <div className="px-2 mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                All Contacts
              </h4>
            </div>
          )}
          {users.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              onClick={() => onSelectUser(user)}
              onViewDetails={() => onViewUserDetails(user)}
              isSelected={false}
              showOnlineStatus={true}
              showDetailsButton={true}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMoreUsers && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// Group List Content Component
interface GroupListContentProps {
  groups: Group[];
  searchTerm: string;
  onSelectGroup: (group: Group) => void;
  onViewGroupDetails: (group: Group) => void;
  onCreateGroup: () => void;
  onClearSearch: () => void;
  hasMoreGroups: boolean;
  loadingMore: boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onLoadMore: () => void;
}

const GroupListContent = ({
  groups,
  searchTerm,
  onSelectGroup,
  onViewGroupDetails,
  onCreateGroup,
  onClearSearch,
  hasMoreGroups,
  loadingMore,
  onScroll,
  onLoadMore
}: GroupListContentProps) => {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">
          {searchTerm ? "No groups found" : "No groups available"}
        </p>
        <div className="flex gap-2 mt-2">
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
            >
              Clear search
            </Button>
          )}
          <Button
            onClick={onCreateGroup}
            size="sm"
          >
            Create Group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 space-y-1 max-h-96 overflow-y-auto"
      onScroll={onScroll}
    >
      {groups.map((group) => (
        <GroupListItem
          key={group.id}
          group={group}
          onClick={() => onSelectGroup(group)}
          onViewDetails={() => onViewGroupDetails(group)}
          isSelected={false}
          showDetailsButton={true}
        />
      ))}

      {/* Load More Button */}
      {hasMoreGroups && (
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};