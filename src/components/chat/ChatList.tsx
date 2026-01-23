import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X, Search, Users, MessageCircle, Plus, ChevronDown, Star, Clock,
  Sparkles, Info, User, Check, Mail, Calendar, Loader2,
  Box,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  BadgeCheck,
  UserMinus,
  RotateCcw,
  Save,
  Settings,
  Edit3
} from "lucide-react";
import { Socket } from "socket.io-client";

// Types
interface UserType {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  online: boolean;
  lastMessage?: string;
  messageExists?: boolean;
  avatar?: string;
  lastSeen?: string;
  isActive?: boolean;
}

interface GroupType {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  modelCount?: number;
  createdByUser: {
    id: string;
    name: string;
  };
  isMember?: boolean;
  createdBy?: number;
  createdAt?: string;
  avatar?: string;
}

interface PaginationType {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

interface ChatListProps {
  getAllUsers: (params: {
    currentPage: number;
    totalRecords: number;
    search: string;
    moduleValue: number;
  }) => Promise<any>;
  getAllGroups: (params: {
    page: number;
    limit: number;
    search?: string;
  }) => Promise<any>;
  onClose: () => void;
  onSelectChat: (id: number, type: "user" | "group", name: string) => void;
  createGroup: (params: {
    name: string;
    groupUsers: number[];
  }) => Promise<any>;
  socket: Socket;
  ISDEPLOYE?: boolean;
  currentUserId: number;
  currentUserName: string;
  assignedUsers: (params: {
    groupId: number;
    unlinkAssigned: number[];
    notAssigned: number[];
    groupName: string;
  }) => Promise<any>;
  getGroupManageUsers: (params: {
    groupId: number;
    assigned: number;
    search: string;
    page: number;
    limit: number;
  }) => Promise<any>;
}

// Main ChatList Component
export const ChatList = ({
  getAllUsers,
  getAllGroups,
  onClose,
  onSelectChat,
  createGroup,
  assignedUsers,
  socket,
  currentUserId,
  getGroupManageUsers
}: ChatListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [userView, setUserView] = useState<'chatted' | 'all' | ''>('chatted');
  const [frequentContacts, setFrequentContacts] = useState<UserType[]>([]);
  // Pagination states
  const [usersPagination, setUsersPagination] = useState<PaginationType>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasMore: true,
    hasPrevious: false
  });

  const [groupsPagination, setGroupsPagination] = useState<PaginationType>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasMore: true,
    hasPrevious: false
  });

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Track loaded pages
  const loadedUsersPages = useRef<Set<number>>(new Set([1]));
  const loadedGroupsPages = useRef<Set<number>>(new Set([1]));

  // Details view states
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const limit = 10;

  // SIMPLIFIED: Fetch users with pagination
  const fetchUsers = useCallback(async (page: number, search = "", reset = false, isLoadPrevious = false) => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;

      if (reset) {
        setUsers([]);
        loadedUsersPages.current.clear();
        loadedUsersPages.current.add(1);
        setUsersPagination({
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          hasMore: true,
          hasPrevious: false
        });
        setLoading(true);
      } else if (isLoadPrevious) {
        setLoadingPrevious(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getAllUsers({
        currentPage: page,
        totalRecords: limit,
        search,
        moduleValue: userView === 'chatted' ? 1 : 0
      });

      if (response?.status === "success") {
        const usersList = response?.data || [];
        const totalUsers = response?.totalRecords || 0;
        const totalPages = response?.totalPages || 1;
        const currentPage = response?.currentPage || page;

        // Mark this page as loaded
        loadedUsersPages.current.add(page);

        if (reset) {
          setUsers(usersList);
          if (userView === 'chatted' && !search) {
            const frequent = usersList
              .filter((user: UserType) => user.messageExists)
              .slice(0, 3);
            setFrequentContacts(frequent);
          } else {
            setFrequentContacts([]);
          }
        } else if (isLoadPrevious) {
          // Prepend for previous data
          setUsers(prev => {
            const existingIds = new Set(prev.map(u => u.id));
            const newUsers = usersList.filter((user: UserType) => !existingIds.has(user.id));
            return [...newUsers, ...prev];
          });
        } else {
          // Append for next data
          setUsers(prev => {
            const existingIds = new Set(prev.map(u => u.id));
            const newUsers = usersList.filter((user: UserType) => !existingIds.has(user.id));
            return [...prev, ...newUsers];
          });
        }
        setUsersPagination(prev => ({
          ...prev,
          currentPage,
          totalPages,
          totalRecords: totalUsers,
          hasMore: currentPage < totalPages,
          hasPrevious: currentPage > 1
        }));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsersPagination(prev => ({ ...prev, hasMore: false, hasPrevious: false }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLoadingPrevious(false);
      isFetching.current = false;
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [getAllUsers, userView, isInitialLoad]);
  // SIMPLIFIED: Fetch groups with pagination
  const fetchGroups = useCallback(async (page: number, search = "", reset = false, isLoadPrevious = false) => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;

      if (reset) {
        setGroups([]);
        loadedGroupsPages.current.clear();
        loadedGroupsPages.current.add(1);
        setGroupsPagination({
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          hasMore: true,
          hasPrevious: false
        });
        setLoading(true);
      } else if (isLoadPrevious) {
        setLoadingPrevious(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getAllGroups({
        page: page,
        limit,
        search
      });

      if (response?.status === "success") {
        const groupsList = response?.data || [];
        const totalGroups = response?.pagination?.totalRecords || 0;
        const totalPages = response?.pagination?.totalPages || 1;
        const currentPage = response?.pagination?.currentPage || page;

        loadedGroupsPages.current.add(page);

        if (reset) {
          setGroups(groupsList);
        } else if (isLoadPrevious) {
          setGroups(prev => {
            const existingIds = new Set(prev.map(g => g.id));
            const newGroups = groupsList.filter((group: GroupType) => !existingIds.has(group.id));
            return [...newGroups, ...prev];
          });
        } else {
          setGroups(prev => {
            const existingIds = new Set(prev.map(g => g.id));
            const newGroups = groupsList.filter((group: GroupType) => !existingIds.has(group.id));
            return [...prev, ...newGroups];
          });
        }

        setGroupsPagination(prev => ({
          ...prev,
          currentPage,
          totalPages,
          totalRecords: totalGroups,
          hasMore: currentPage < totalPages,
          hasPrevious: currentPage > 1
        }));
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setGroupsPagination(prev => ({ ...prev, hasMore: false, hasPrevious: false }));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLoadingPrevious(false);
      isFetching.current = false;
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [getAllGroups, isInitialLoad]);

  // Initial data fetch
  // useEffect(() => {
  //   if (activeTab === "users") {
  //     fetchUsers(1, searchTerm, true, false);
  //   } else {
  //     fetchGroups(1, searchTerm, true, false);
  //   }
  // }, [activeTab, userView]);
  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    setConnectionStatus('connecting');

    const handleRecentChatsMessages = (data: any) => {
      if (data?.fromUserId == currentUserId || data?.toUserId == currentUserId) {
        fetchUsers(1, searchTerm, true, false);
      };
    };

    const handleDisconnect = () => {
      console.log('❌ Socket.IO disconnected');
      setConnectionStatus('disconnected');
    };

    socket.on('recent_chats_messages', handleRecentChatsMessages);
    socket.on('disconnect', handleDisconnect);

    return () => {
      // Remove event listeners
      socket.off('recent_chats_messages', handleRecentChatsMessages);
      socket.off('disconnect', handleDisconnect);
    };
  }, [currentUserId]);
  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (activeTab === "users") {
        fetchUsers(1, searchTerm, true, false);
      } else {
        fetchGroups(1, searchTerm, true, false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, activeTab, userView]);

  // Load more data (scrolling down)
  const loadMoreUsers = useCallback(() => {
    if (!loadingMore && !loading && usersPagination.hasMore && !isFetching.current) {
      const nextPage = usersPagination.currentPage + 1;
      fetchUsers(nextPage, searchTerm, false, false);
    }
  }, [loadingMore, loading, usersPagination, searchTerm, fetchUsers]);

  const loadMoreGroups = useCallback(() => {
    if (!loadingMore && !loading && groupsPagination.hasMore && !isFetching.current) {
      const nextPage = groupsPagination.currentPage + 1;
      fetchGroups(nextPage, searchTerm, false, false);
    }
  }, [loadingMore, loading, groupsPagination, searchTerm, fetchGroups]);

  // Load previous data (scrolling up)
  const loadPreviousUsers = useCallback(() => {
    if (!loadingPrevious && !loading && usersPagination.hasPrevious && !isFetching.current) {
      const prevPage = usersPagination.currentPage - 1;
      if (!loadedUsersPages.current.has(prevPage)) {
        fetchUsers(prevPage, searchTerm, false, true);
      }
    }
  }, [loadingPrevious, loading, usersPagination, searchTerm, fetchUsers]);

  const loadPreviousGroups = useCallback(() => {
    if (!loadingPrevious && !loading && groupsPagination.hasPrevious && !isFetching.current) {
      const prevPage = groupsPagination.currentPage - 1;
      if (!loadedGroupsPages.current.has(prevPage)) {
        fetchGroups(prevPage, searchTerm, false, true);
      }
    }
  }, [loadingPrevious, loading, groupsPagination, searchTerm, fetchGroups]);

  // SIMPLIFIED: Scroll handler - UPDATED with better detection
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Check if we're at the bottom (within 50px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;

    // Check if we're at the top (within 50px)
    const isAtTop = scrollTop <= 50;


    if (isAtTop && !loadingPrevious && !loading && !isFetching.current) {
      if (activeTab === "users" && usersPagination.hasPrevious) {
        loadPreviousUsers();
      } else if (activeTab === "groups" && groupsPagination.hasPrevious) {
        loadPreviousGroups();
      }
    }

    if (isAtBottom && !loadingMore && !loading && !isFetching.current) {
      if (activeTab === "users" && usersPagination.hasMore) {
        loadMoreUsers();
      } else if (activeTab === "groups" && groupsPagination.hasMore) {
        loadMoreGroups();
      }
    }
  }, [activeTab, loadingMore, loadingPrevious, loading, usersPagination, groupsPagination, loadMoreUsers, loadMoreGroups, loadPreviousUsers, loadPreviousGroups]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (searchTerm) return users;
    const frequentIds = frequentContacts.map(u => u.id);
    return users.filter(user => !frequentIds.includes(user.id));
  }, [users, frequentContacts, searchTerm]);

  // Handlers
  const clearSearch = () => setSearchTerm("");
  const handleCreateGroup = () => setShowCreateGroup(true);
  const handleViewUserDetails = (user: UserType) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };
  const handleViewGroupDetails = (group: GroupType) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };
  const handleUserClick = (user: UserType) => {
    onSelectChat(user.id, "user", user.username);
  };
  const handleGroupClick = (group: GroupType) => {
    onSelectChat(group.id, "group", group.name);
  };
  const refreshGroups = async () => {
    await fetchGroups(1, searchTerm, true, false);
  };

  // Add manual load buttons for testing
  const handleLoadMoreClick = () => {
    if (activeTab === "users") {
      loadMoreUsers();
    } else {
      loadMoreGroups();
    }
  };

  const handleLoadPreviousClick = () => {
    if (activeTab === "users") {
      loadPreviousUsers();
    } else {
      loadPreviousGroups();
    }
  };

  // The styles remain the same...
  const styles = `
    /* Your existing styles here - they remain unchanged */
    .chat-list-container {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 420px;
      min-hight:200px;
      max-height: 85vh;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 1000;
      overflow: hidden;
      animation: slideInUp 0.3s ease-out;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* ... rest of your CSS styles ... */

    .chat-list-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 200px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%);
      pointer-events: none;
      z-index: 0;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Header */
    .chat-header {
      position: relative;
      padding: 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: transparent;
      z-index: 1;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-icon-wrapper {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: linear-gradient(135deg, #1933c9ff 0%, #a855f7 50%, #ec4899 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .header-icon-wrapper svg {
      width: 22px;
      height: 22px;
      color: white;
    }

    .online-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background: #10b981;
      border-radius: 50%;
      border: 3px solid white;
      animation: pulse 2s ease-in-out infinite;
    }

    .header-text h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }

    .header-subtitle {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      font-size: 13px;
      color: #6b7280;
    }

    .header-subtitle svg {
      width: 14px;
      height: 14px;
    }

    .header-actions {
      display: flex;
      gap: 6px;
    }

    .icon-button {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: #6b7280;
    }

    .icon-button:hover {
      background: rgba(99, 102, 241, 0.1);
      color: #1933c9ff;
    }

    .icon-button.close:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .icon-button svg {
      width: 18px;
      height: 18px;
    }

    /* Search */
    .search-wrapper {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #9ca3af;
      pointer-events: none;
      transition: color 0.2s ease;
    }

    .search-input {
      width: 100%;
      height: 48px;
      padding: 0 48px 0 48px;
      border: 2px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      font-size: 15px;
      background: rgba(255, 255, 255, 0.6);
      transition: all 0.2s ease;
      outline: none;
      color: #1a1a1a;
      box-sizing: border-box;
    }

    .search-input:focus {
      background: white;
      border-color: #1933c9ff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    .search-input:focus + .search-icon {
      color: #1933c9ff;
    }

    .clear-button {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: #6b7280;
    }

    .clear-button:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    /* View Toggle */
    .view-toggle {
      display: flex;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.02);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .toggle-button {
      flex: 1;
      height: 40px;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      background: transparent;
      color: #6b7280;
    }

    .toggle-button svg {
      width: 16px;
      height: 16px;
    }

    .toggle-button.active {
      background: linear-gradient(135deg, #1933c9ff 0%, #8b5cf6 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .toggle-button:not(.active):hover {
      background: rgba(0, 0, 0, 0.04);
    }

    /* Tabs */
    .tabs-container {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: transparent;
    }

    .tabs-list {
      display: flex;
      height: 56px;
    }

    .tab-trigger {
      flex: 1;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
      color: #6b7280;
      transition: all 0.2s ease;
      position: relative;
    }

    .tab-trigger svg {
      width: 18px;
      height: 18px;
    }

    .tab-trigger.active {
      color: #1933c9ff;
      background: rgba(99, 102, 241, 0.05);
    }

    .tab-trigger.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #1933c9ff 0%, #8b5cf6 100%);
      border-radius: 3px 3px 0 0;
    }

    .tab-trigger:not(.active):hover {
      color: #4b5563;
      background: rgba(0, 0, 0, 0.02);
    }

    /* Content Area */
    .content-area {
      flex: 1;
      overflow-y: auto;
      max-height: 1000px;
      min-height: 400px;
    }

    .content-area::-webkit-scrollbar {
      width: 8px;
    }

    .content-area::-webkit-scrollbar-track {
      background: transparent;
    }

    .content-area::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 4px;
    }

    .content-area::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
    }

    .spinner-wrapper {
      position: relative;
      width: 56px;
      height: 56px;
    }

    .spinner {
      width: 56px;
      height: 56px;
      border: 4px solid rgba(99, 102, 241, 0.15);
      border-top-color: #1933c9ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 24px;
      height: 24px;
      color: #1933c9ff;
    }

    .loading-text {
      margin-top: 20px;
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
    }

    /* List Content */
    .list-content {
      padding: 20px;
      position: relative;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 4px;
      margin-bottom: 16px;
    }

    .section-header svg {
      width: 16px;
      height: 16px;
    }

    .section-header.frequent svg {
      color: #f59e0b;
      fill: #f59e0b;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
    }

    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
      margin: 20px 0;
    }

    /* List Items */
    .list-item {
      padding: 14px 16px;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #5c86e2ff 0%, #2f48d6ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .avatar.group {
      background: linear-gradient(135deg, #6b78c0ff 0%, #2f48d6ff 100%);
    }

    .status-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-indicator.online {
      background: #10b981;
    }

    .status-indicator.offline {
      background: #9ca3af;
    }

    .list-item-content {
      flex: 1;
      min-width: 0;
    }

    .list-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .list-item-name {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .member-count {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }

    .list-item-message {
      font-size: 13px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .info-button {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: rgba(99, 102, 241, 0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .info-button:hover {
      background: rgba(99, 102, 241, 0.15);
      transform: scale(1.1);
    }

    .info-button svg {
      width: 16px;
      height: 16px;
      color: #1933c9ff;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 30px;
      text-align: center;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .empty-icon svg {
      width: 40px;
      height: 40px;
      color: rgba(99, 102, 241, 0.5);
    }

    .empty-icon.group {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
    }

    .empty-icon.group svg {
      color: rgba(16, 185, 129, 0.6);
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    /* Buttons */
    .button {
      padding: 10px 20px;
      border-radius: 12px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }

    .button-primary {
      background: linear-gradient(135deg, #6679e7ff 0%, #2141d1ff 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .button-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }

    .button-outline {
      background: white;
      color: #1933c9ff;
      border: 2px solid rgba(99, 102, 241, 0.2);
    }

    .button-outline:hover {
      border-color: #1933c9ff;
      background: rgba(99, 102, 241, 0.05);
    }

    .button svg {
      width: 16px;
      height: 16px;
    }

    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .button:disabled:hover {
      transform: none;
    }

    /* Load More */
    .load-more-container {
      display: flex;
      justify-content: center;
      padding: 16px 0;
    }

    .load-more-sentinel {
      height: 20px;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px 0;
    }

    .mini-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .mini-spinner.outline {
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-top-color: #1933c9ff;
    }

    .load-more-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: white;
      color: #6b7280;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .load-more-button:hover:not(:disabled) {
      border-color: #1933c9ff;
      color: #1933c9ff;
      background: rgba(99, 102, 241, 0.05);
    }

    .load-more-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading indicator at top and bottom */
    .loading-more-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px 0;
      color: #6b7280;
      font-size: 13px;
    }

    .loading-more-indicator svg {
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    .loading-previous-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px 0;
      color: #6b7280;
      font-size: 13px;
    }

    .loading-previous-indicator svg {
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }

    /* No more data indicator */
    .no-more-data {
      text-align: center;
      padding: 16px 0;
      color: #9ca3af;
      font-size: 12px;
      font-style: italic;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      width: 90%;
      max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .modal-title svg {
      width: 20px;
      height: 20px;
    }

    .modal-close {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: #6b7280;
    }

    .modal-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #1a1a1a;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 20px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Form Elements */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 15px;
      background: white;
      transition: all 0.2s ease;
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: #1933c9ff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    /* Search Input in Modal */
    .modal-search-wrapper {
      position: relative;
      margin-bottom: 20px;
    }

    .modal-search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #9ca3af;
      pointer-events: none;
    }

    .modal-search-input {
      width: 100%;
      height: 48px;
      padding: 0 16px 0 44px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 15px;
      background: white;
      transition: all 0.2s ease;
      outline: none;
      box-sizing: border-box;
    }

    .modal-search-input:focus {
      border-color: #1933c9ff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    /* User Selection */
    .selected-users {
      margin-bottom: 20px;
    }

    .selected-users-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .selected-users-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .selected-user-tag {
      background: rgba(99, 102, 241, 0.1);
      color: #1933c9ff;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .selected-user-remove {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1933c9ff;
      transition: all 0.2s ease;
    }

    .selected-user-remove:hover {
      background: rgba(99, 102, 241, 0.2);
    }

    /* Users List */
    .users-list {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 24px;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .user-item:hover {
      background: #f9fafb;
    }

    .user-item:last-child {
      border-bottom: none;
    }

    .user-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .user-checkbox.checked {
      background: #1933c9ff;
      border-color: #1933c9ff;
    }

    .user-checkbox svg {
      width: 14px;
      height: 14px;
      color: white;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #5563b1ff 0%, #2e2bc7ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 13px;
      color: #6b7280;
    }

    /* Loading State in Modal */
    .modal-loading {
      text-align: center;
      padding: 20px;
      color: #6b7280;
    }

    .modal-empty {
      text-align: center;
      padding: 20px;
      color: #6b7280;
    }

    /* User Details Modal */
    .user-details-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .user-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, #1933c9ff 0%, #0d37c0ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 32px;
      flex-shrink: 0;
    }

    .user-details-info h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .user-details-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 14px;
      color: #6b7280;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.online {
      background: #10b981;
    }

    .status-dot.offline {
      background: #9ca3af;
    }

    .details-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }

    .detail-item svg {
      width: 16px;
      height: 16px;
      color: #6b7280;
      flex-shrink: 0;
    }

    .detail-label {
      color: #6b7280;
      min-width: 80px;
    }

    .detail-value {
      color: #1a1a1a;
      font-weight: 500;
    }

    .last-message-section {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      margin-bottom: 24px;
    }

    .last-message-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .last-message-text {
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.5;
    }

    /* Group Details Modal */
    .group-details-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .group-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, #5369ccff 0%, #2234d4ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 32px;
      flex-shrink: 0;
    }

    .group-details-info h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .group-members {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }

    .group-description {
      margin-bottom: 20px;
    }

    .description-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .description-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .chat-list-container {
        width: calc(100vw - 32px);
        right: 16px;
        bottom: 80px;
      }
      
      .modal-container {
        width: 95%;
        margin: 0 10px;
      }
    }
  `;
  const handleAssignedModel = async (groupId: number, modelData: any) => {
    // Handle model creation logic here
    let response = await assignedUsers({ groupId, unlinkAssigned: modelData?.unlinkAssigned, notAssigned: modelData?.notAssigned, groupName: modelData?.groupName });
    fetchGroups(groupsPagination.currentPage, searchTerm, true, false);
    return response;
    // Example API call:
    // api.createModel(groupId, modelData).then(() => {
    //   // Refresh groups or update UI
    // });
  };
  return (
    <>
      <style>{styles}</style>

      <div className="chat-list-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-top">
            <div className="header-left">
              {/* <div className="header-icon-wrapper">
                <MessageCircle />
                <div className="online-indicator" />
              </div> */}
              <div className="header-text">
                <h3>Messages</h3>
                <div className="header-subtitle">
                  <Users />
                  <span>
                    {activeTab === 'users'
                      ? `${usersPagination.totalRecords} contacts`
                      : `${groupsPagination.totalRecords} groups`
                    }
                  </span>
                </div>
              </div>
            </div>
            <div className="header-actions">
              {activeTab === 'groups' && (
                <button
                  className="icon-button"
                  onClick={handleCreateGroup}
                  title="Create group"
                >
                  <Plus />
                </button>
              )}
              <button className="icon-button close" onClick={onClose}>
                <X />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="search-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-button" onClick={() => setSearchTerm("")}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-button ${userView === 'chatted' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setUserView('chatted')
            }}
          >
            <Clock />
            Recent Chats
          </button>
          <button
            className={`toggle-button ${userView === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setUserView('all')
            }}
          >
            <Users />
            All Users
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-list">
            <button
              className={`tab-trigger ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('users')
                setUserView('all')
              }}
            >
              <Users />
              <span>Users</span>
            </button>
            <button
              className={`tab-trigger ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => {
                setUserView('');
                setActiveTab('groups')
              }}
            >
              <MessageCircle />
              <span>Groups</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="content-area"
          ref={contentAreaRef}
          onScroll={handleScroll}
        >
          {loading && isInitialLoad ? (
            <div className="loading-container">
              <div className="spinner-wrapper">
                <div className="spinner" />
                <MessageCircle className="spinner-icon" />
              </div>
              <div className="loading-text">
                Loading {activeTab}...
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <UserListContent
              users={filteredUsers}
              frequentContacts={frequentContacts}
              userView={userView}
              searchTerm={searchTerm}
              onSelectUser={handleUserClick}
              onViewUserDetails={handleViewUserDetails}
              onClearSearch={clearSearch}
              hasMoreUsers={usersPagination.hasMore}
              hasPreviousUsers={usersPagination.hasPrevious}
              loadingMore={loadingMore}
              loadingPrevious={loadingPrevious}
              onLoadMore={handleLoadMoreClick}
              onLoadPrevious={handleLoadPreviousClick}
            />
          ) : (
            <GroupListContent
              groups={groups}
              searchTerm={searchTerm}
              onSelectGroup={handleGroupClick}
              onViewGroupDetails={handleViewGroupDetails}
              onCreateGroup={handleCreateGroup}
              onAssignedUsers={handleAssignedModel}
              currentUserId={currentUserId ? Number(currentUserId) : 0}
              onClearSearch={clearSearch}
              getGroupManageUsers={getGroupManageUsers}
              hasMoreGroups={groupsPagination.hasMore}
              hasPreviousGroups={groupsPagination.hasPrevious}
              loadingMore={loadingMore}
              loadingPrevious={loadingPrevious}
              onLoadMore={handleLoadMoreClick}
              onLoadPrevious={handleLoadPreviousClick}
            />
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          onGroupCreated={refreshGroups}
          createGroup={createGroup}
          getUsersApi={getAllUsers}
        />
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          open={showUserDetails}
          onOpenChange={setShowUserDetails}
          onStartChat={handleUserClick}
        />
      )}

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <GroupDetails
          group={selectedGroup}
          open={showGroupDetails}
          onOpenChange={setShowGroupDetails}
          onJoinChat={handleGroupClick}
        />
      )}
    </>
  );
};

// SIMPLIFIED: User List Content Component
interface UserListContentProps {
  users: UserType[];
  frequentContacts: UserType[];
  userView: 'chatted' | 'all' | '';
  searchTerm: string;
  onSelectUser: (user: UserType) => void;
  onViewUserDetails: (user: UserType) => void;
  onClearSearch: () => void;
  hasMoreUsers: boolean;
  hasPreviousUsers: boolean;
  loadingMore: boolean;
  loadingPrevious: boolean;
  onLoadMore: () => void;
  onLoadPrevious: () => void;
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
  hasPreviousUsers,
  loadingMore,
  loadingPrevious,
  onLoadMore,
  onLoadPrevious
}: UserListContentProps) => {
  const handleInfoClick = (e: React.MouseEvent, user: UserType) => {
    e.stopPropagation();
    onViewUserDetails(user);
  };

  if (users.length === 0 && frequentContacts.length === 0 && !loadingMore && !loadingPrevious) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Users />
        </div>
        <div className="empty-title">
          {searchTerm ? "No users found" : "No users available"}
        </div>
        <div className="empty-description">
          {searchTerm ? "Try adjusting your search criteria" : "Start by adding contacts to your network"}
        </div>
        {searchTerm && (
          <button className="button button-outline" onClick={onClearSearch}>
            Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="list-content">
      {/* Top loading indicator */}
      {loadingPrevious && (
        <div className="load-more-sentinel">
          <div className="loading-previous-indicator">
            <Loader2 size={16} />
            <span>Loading previous users...</span>
          </div>
        </div>
      )}

      {/* Manual Load Previous Button (for testing) */}
      {/* {hasPreviousUsers && !loadingPrevious && (
        <div className="load-more-container">
          <button
            className="load-more-button"
            onClick={onLoadPrevious}
          >
            <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
            Load Previous Users
          </button>
        </div>
      )} */}

      {/* Frequent Contacts */}
      {frequentContacts.length > 0 && userView === 'chatted' && !searchTerm && (
        <>
          <div className="section-header frequent">
            <Star />
            <span className="section-title">Frequent Contacts</span>
          </div>
          {frequentContacts.map((user) => (
            <div key={user.id} className="list-item" onClick={() => onSelectUser(user)}>
              <div className="avatar-wrapper">
                <div className="avatar">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                {/* <div className={`status-indicator ${user.online ? 'online' : 'offline'}`} /> */}
              </div>
              <div className="list-item-content">
                <div className="list-item-header">
                  <div className="list-item-name">{user.username}</div>
                </div>
                <div className="list-item-message">
                  {user?.email}
                </div>
                <div className="list-item-message">
                  {user?.lastMessage || user?.role}
                </div>
              </div>
              <button
                className="info-button"
                onClick={(e) => handleInfoClick(e, user)}
              >
                <Info />
              </button>
            </div>
          ))}
          <div className="section-divider" />
        </>
      )}

      {/* All Users */}
      {users.length > 0 && (
        <>
          {frequentContacts.length > 0 && userView === 'chatted' && !searchTerm && (
            <div className="section-header">
              <span className="section-title">All Contacts</span>
            </div>
          )}
          {users.map((user) => (
            <div key={user.id} className="list-item" onClick={() => onSelectUser(user)}>
              <div className="avatar-wrapper">
                <div className="avatar">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className={`status-indicator ${user.online ? 'online' : 'offline'}`} />
              </div>
              <div className="list-item-content">
                <div className="list-item-header">
                  <div className="list-item-name">{user.username}</div>
                </div>
                <div className="list-item-message">
                  {user.lastMessage || user.role}
                </div>
                <div className="list-item-message">
                  {user?.email}
                </div>
              </div>
              <button
                className="info-button"
                onClick={(e) => handleInfoClick(e, user)}
              >
                <Info />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Bottom loading indicator */}
      {loadingMore && (
        <div className="load-more-sentinel">
          <div className="loading-more-indicator">
            <Loader2 size={16} />
            <span>Loading more users...</span>
          </div>
        </div>
      )}

      {/* Manual Load More Button (for testing) */}
      {hasMoreUsers && !loadingMore && (
        <div className="load-more-container">
          <button
            className="load-more-button"
            onClick={onLoadMore}
          >
            <ChevronDown size={14} />
            Load More Users
          </button>
        </div>
      )}

      {/* No more data indicators */}
      {!hasPreviousUsers && users.length > 0 && !loadingPrevious && (
        <div className="no-more-data">
          Beginning of list
        </div>
      )}
      {!hasMoreUsers && users.length > 0 && !loadingMore && (
        <div className="no-more-data">
          End of list
        </div>
      )}
    </div>
  );
};
interface GroupListContentProps {
  groups: GroupType[];
  searchTerm: string;
  onSelectGroup: (group: GroupType) => void;
  onViewGroupDetails: (group: GroupType) => void;
  onCreateGroup: () => void;
  onAssignedUsers: (groupId: number, modelData: any) => Promise<any>;
  onClearSearch: () => void;
  hasMoreGroups: boolean;
  hasPreviousGroups: boolean;
  loadingMore: boolean;
  loadingPrevious: boolean;
  onLoadMore: () => void;
  onLoadPrevious: () => void;
  currentUserId: number;
  getGroupManageUsers: (params: {
    groupId: number;
    assigned: number;
    search: string;
    page: number;
    limit: number;
  }) => Promise<{
    status: string;
    data?: any[];
    pagination?: any;
    message?: string;
  }>;
}

const GroupListContent = ({
  groups,
  searchTerm,
  onSelectGroup,
  onViewGroupDetails,
  onCreateGroup,
  onAssignedUsers,
  onClearSearch,
  hasMoreGroups,
  hasPreviousGroups,
  loadingMore,
  loadingPrevious,
  onLoadMore,
  onLoadPrevious,
  currentUserId,
  getGroupManageUsers
}: GroupListContentProps) => {
  const [selectedGroupForModel, setSelectedGroupForModel] = useState<GroupType | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned' | 'pending' | 'settings'>('assigned');
  const [assignedPagination, setAssignedPagination] = useState({ currentPage: 1, totalPages: 1, limit: 10 });
  const [unassignedPagination, setUnassignedPagination] = useState({ currentPage: 1, totalPages: 1, limit: 10 });

  // New state for pending changes
  const [usersToAssign, setUsersToAssign] = useState<any[]>([]);
  const [usersToRemove, setUsersToRemove] = useState<any[]>([]);

  // New state for group name editing
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  const handleInfoClick = (e: React.MouseEvent, group: GroupType) => {
    e.stopPropagation();
    onViewGroupDetails(group);
  };

  const handleUserClick = async (e: React.MouseEvent, group: GroupType) => {
    e.stopPropagation();
    setSelectedGroupForModel(group);
    // Clear any previous pending changes when opening modal for a new group
    setUsersToAssign([]);
    setUsersToRemove([]);
    setIsEditingGroupName(false);
    setGroupNameInput('');
    // Load initial data when modal opens
    await loadAssignedUsers(group.id);
    await loadUnassignedUsers(group.id);
  };

  const loadAssignedUsers = async (groupId: number, page = 1, search = '') => {
    if (!getGroupManageUsers) return;

    setLoadingAssigned(true);
    try {
      const response = await getGroupManageUsers({
        groupId,
        assigned: 0, // 0 for assigned users
        search: search || searchQuery,
        page,
        limit: 10
      });

      if (response.status === "success") {
        const assignedData = response.data || [];

        // Filter out users that are in usersToRemove OR already in usersToAssign (shouldn't happen but just in case)
        const filteredAssigned = assignedData.filter(user => {
          // Check if user is marked for removal
          const isMarkedForRemoval = usersToRemove.some(u => u.id === user.id);
          // Check if user is already marked for assignment (shouldn't be in assigned list)
          const isAlreadyMarkedForAssignment = usersToAssign.some(u => u.id === user.id);

          return !isMarkedForRemoval && !isAlreadyMarkedForAssignment;
        });

        setAssignedUsers(filteredAssigned);

        if (response.pagination) {
          setAssignedPagination({
            currentPage: response.pagination.currentPage,
            totalPages: response.pagination.totalPages,
            limit: response.pagination.limit
          });
        }
      } else {
        console.error("Error loading assigned users:", response.message);
      }
    } catch (error) {
      console.error("Failed to load assigned users:", error);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const loadUnassignedUsers = async (groupId: number, page = 1, search = '') => {
    if (!getGroupManageUsers) return;

    setLoadingUnassigned(true);
    try {
      const response = await getGroupManageUsers({
        groupId,
        assigned: 1, // 1 for unassigned users
        search: search || searchQuery,
        page,
        limit: 10
      });

      if (response.status === "success") {
        const unassignedData = response.data || [];

        // Filter out users that are in usersToAssign OR already in usersToRemove (shouldn't happen but just in case)
        const filteredUnassigned = unassignedData.filter(user => {
          // Check if user is marked for assignment
          const isMarkedForAssignment = usersToAssign.some(u => u.id === user.id);
          // Check if user is already marked for removal (shouldn't be in unassigned list)
          const isAlreadyMarkedForRemoval = usersToRemove.some(u => u.id === user.id);

          return !isMarkedForAssignment && !isAlreadyMarkedForRemoval;
        });

        setUnassignedUsers(filteredUnassigned);

        if (response.pagination) {
          setUnassignedPagination({
            currentPage: response.pagination.currentPage,
            totalPages: response.pagination.totalPages,
            limit: response.pagination.limit
          });
        }
      } else {
        console.error("Error loading unassigned users:", response.message);
      }
    } catch (error) {
      console.error("Failed to load unassigned users:", error);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleSearch = (searchValue: string) => {
    setSearchQuery(searchValue);
    if (selectedGroupForModel) {
      if (activeTab === 'assigned') {
        loadAssignedUsers(selectedGroupForModel.id, 1, searchValue);
      } else if (activeTab === 'unassigned') {
        loadUnassignedUsers(selectedGroupForModel.id, 1, searchValue);
      }
    }
  };

  const handleTabChange = (tab: 'assigned' | 'unassigned' | 'pending' | 'settings') => {
    setActiveTab(tab);
    setSearchQuery('');
    if (selectedGroupForModel && tab !== 'pending' && tab !== 'settings') {
      if (tab === 'assigned') {
        loadAssignedUsers(selectedGroupForModel.id, 1, '');
      } else {
        loadUnassignedUsers(selectedGroupForModel.id, 1, '');
      }
    }
  };

  const handlePageChange = (tab: 'assigned' | 'unassigned', page: number) => {
    if (!selectedGroupForModel) return;

    if (tab === 'assigned') {
      loadAssignedUsers(selectedGroupForModel.id, page, searchQuery);
    } else {
      loadUnassignedUsers(selectedGroupForModel.id, page, searchQuery);
    }
  };

  const handleCloseModelModal = () => {
    setSelectedGroupForModel(null);
    setAssignedUsers([]);
    setUnassignedUsers([]);
    setUsersToAssign([]);
    setUsersToRemove([]);
    setSearchQuery('');
    setActiveTab('assigned');
    setIsEditingGroupName(false);
    setGroupNameInput('');
  };

  // Handle assigning a user
  const handleAssignUser = (user: any) => {
    // Check if user is already in usersToAssign
    if (usersToAssign.some(u => u.id === user.id)) {
      return; // User already marked for assignment, do nothing
    }

    // Check if user is already in usersToRemove (should cancel removal)
    const isMarkedForRemoval = usersToRemove.some(u => u.id === user.id);
    if (isMarkedForRemoval) {
      // If user is marked for removal, cancel that action instead
      handleCancelAssignment(user.id, 'remove');
      return;
    }

    // Add to usersToAssign
    setUsersToAssign(prev => [...prev, user]);

    // Remove from unassigned list
    setUnassignedUsers(prev => prev.filter(u => u.id !== user.id));

    // If user was in assigned list (shouldn't happen), remove from there too
    setAssignedUsers(prev => prev.filter(u => u.id !== user.id));
  };

  // Handle unassigning a user
  const handleUnassignUser = (user: any) => {
    // Check if user is already in usersToRemove
    if (usersToRemove.some(u => u.id === user.id)) {
      return; // User already marked for removal, do nothing
    }

    // Check if user is already in usersToAssign (should cancel assignment)
    const isMarkedForAssignment = usersToAssign.some(u => u.id === user.id);
    if (isMarkedForAssignment) {
      // If user is marked for assignment, cancel that action instead
      handleCancelAssignment(user.id, 'assign');
      return;
    }

    // Add to usersToRemove
    setUsersToRemove(prev => [...prev, user]);

    // Remove from assigned list
    setAssignedUsers(prev => prev.filter(u => u.id !== user.id));

    // If user was in unassigned list (shouldn't happen), remove from there too
    setUnassignedUsers(prev => prev.filter(u => u.id !== user.id));
  };

  // Handle canceling a pending assignment
  const handleCancelAssignment = (userId: number, type: 'assign' | 'remove') => {
    if (type === 'assign') {
      const user = usersToAssign.find(u => u.id === userId);
      if (user) {
        // Remove from usersToAssign
        setUsersToAssign(prev => prev.filter(u => u.id !== userId));

        // Add back to appropriate list based on original state
        // We need to check if the user was originally assigned or unassigned
        // Since we can't track that, we'll add to unassigned list by default
        // But first check if not already in either list
        const isInAssigned = assignedUsers.some(u => u.id === userId);
        const isInUnassigned = unassignedUsers.some(u => u.id === userId);

        if (!isInAssigned && !isInUnassigned) {
          // Add back to unassigned list (default assumption)
          setUnassignedUsers(prev => [...prev, user]);
        }
      }
    } else {
      const user = usersToRemove.find(u => u.id === userId);
      if (user) {
        // Remove from usersToRemove
        setUsersToRemove(prev => prev.filter(u => u.id !== userId));

        // Add back to appropriate list based on original state
        // We need to check if the user was originally assigned or unassigned
        // Since we can't track that, we'll add to assigned list by default
        // But first check if not already in either list
        const isInAssigned = assignedUsers.some(u => u.id === userId);
        const isInUnassigned = unassignedUsers.some(u => u.id === userId);

        if (!isInAssigned && !isInUnassigned) {
          // Add back to assigned list (default assumption)
          setAssignedUsers(prev => [...prev, user]);
        }
      }
    }
  };

  // Check if user can be assigned (not already in pending actions)
  const canAssignUser = (userId: number) => {
    return !usersToAssign.some(u => u.id === userId) &&
      !usersToRemove.some(u => u.id === userId);
  };

  // Check if user can be removed (not already in pending actions)
  const canRemoveUser = (userId: number) => {
    return !usersToRemove.some(u => u.id === userId) &&
      !usersToAssign.some(u => u.id === userId);
  };

  // Handle start editing group name
  const handleEditGroupName = () => {
    if (selectedGroupForModel) {
      setIsEditingGroupName(true);
      setGroupNameInput(selectedGroupForModel.name);
    }
  };

  // Handle cancel editing group name
  const handleCancelEditGroupName = () => {
    setIsEditingGroupName(false);
    setGroupNameInput('');
  };

  // Handle save group name
  const handleSaveGroupName = () => {
    if (selectedGroupForModel && groupNameInput.trim()) {
      setIsEditingGroupName(false);
    }
  };

  // Save all pending changes including group name
  const handleSaveChanges = async () => {
    if (!selectedGroupForModel) return;

    const payload = {
      groupId: selectedGroupForModel.id,
      modelData: {
        unlinkAssigned: usersToRemove.map(u => Number(u.id)),
        notAssigned: usersToAssign.map(u => Number(u.id)),
        groupName: groupNameInput.trim() !== selectedGroupForModel.name ? groupNameInput.trim() : undefined
      }
    };

    try {
      const response = await onAssignedUsers(payload.groupId, payload.modelData);
      if (response?.status === "success") {
        alert(response.message || "Changes saved successfully!");
        // After saving, clear pending changes and close modal
        handleCloseModelModal();
      } else {
        alert(response?.message || "Failed to save changes");
      }
    } catch (error) {
      alert("An error occurred while saving changes");
      console.error("Error saving changes:", error);
    }
  };

  // Check if there are any pending changes
  const hasPendingChanges = () => {
    const hasUserChanges = usersToAssign.length > 0 || usersToRemove.length > 0;
    const hasNameChange = groupNameInput.trim() != selectedGroupForModel?.name && groupNameInput?.length > 0;
    return hasUserChanges || hasNameChange;
  };

  if (groups.length === 0 && !loadingMore && !loadingPrevious) {
    return (
      <div className="empty-state">
        <div className="empty-icon group">
          <MessageCircle />
        </div>
        <div className="empty-title">
          {searchTerm ? "No groups found" : "No groups yet"}
        </div>
        <div className="empty-description">
          {searchTerm ? "Try a different search term" : "Create your first group to start collaborating"}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {searchTerm && (
            <button className="button button-outline" onClick={onClearSearch}>
              Clear search
            </button>
          )}
          <button className="button button-primary" onClick={onCreateGroup}>
            <Plus />
            Create Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="list-content">
        {/* Top loading indicator */}
        {loadingPrevious && (
          <div className="load-more-sentinel">
            <div className="loading-previous-indicator">
              <Loader2 size={16} />
              <span>Loading previous groups...</span>
            </div>
          </div>
        )}

        {/* Manual Load Previous Button */}
        {hasPreviousGroups && !loadingPrevious && (
          <div className="load-more-container">
            <button
              className="load-more-button"
              onClick={onLoadPrevious}
            >
              <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
              Load Previous Groups
            </button>
          </div>
        )}

        {/* Groups List */}
        {groups.map((group) => (
          <div key={group.id} className="list-item" onClick={() => onSelectGroup(group)}>
            <div className="avatar-wrapper">
              <div className="avatar group">
                {group.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="list-item-content">
              <div className="list-item-header">
                <div className="list-item-name">{group.name}</div>
                <div className="list-item-meta">
                  {group?.memberCount && (
                    <span className="member-count">
                      <User size={12} />
                      {group.memberCount}
                    </span>
                  )}
                  {group.modelCount && (
                    <span className="model-count">
                      <Box size={12} />
                      {group.modelCount}
                    </span>
                  )}
                </div>
              </div>
              {group.description && (
                <div className="list-item-description">{group.description}</div>
              )}
            </div>
            {group?.createdBy === currentUserId && (
              <button
                className="action-button info-button"
                onClick={(e) => handleUserClick(e, group)}
                title="Manage Group Users"
              >
                <User />
              </button>
            )}
            <button
              className="action-button info-button"
              onClick={(e) => handleInfoClick(e, group)}
              title="Group Details"
            >
              <Info />
            </button>
          </div>
        ))}

        {/* Bottom loading indicator */}
        {loadingMore && (
          <div className="load-more-sentinel">
            <div className="loading-more-indicator">
              <Loader2 size={16} />
              <span>Loading more groups...</span>
            </div>
          </div>
        )}

        {/* Manual Load More Button */}
        {hasMoreGroups && !loadingMore && (
          <div className="load-more-container">
            <button
              className="load-more-button"
              onClick={onLoadMore}
            >
              <ChevronDown size={14} />
              Load More Groups
            </button>
          </div>
        )}

        {/* No more data indicators */}
        {!hasPreviousGroups && groups.length > 0 && !loadingPrevious && (
          <div className="no-more-data">
            Beginning of list
          </div>
        )}
        {!hasMoreGroups && groups.length > 0 && !loadingMore && (
          <div className="no-more-data">
            End of list
          </div>
        )}
      </div>

      {/* Group Management Modal */}
      {selectedGroupForModel && (
        <div className="group-management-modal">
          <div className="group-management-modal-overlay" onClick={handleCloseModelModal}>
            <div className="group-management-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="group-management-modal-header">
                <div className="group-management-modal-title-section">
                  {isEditingGroupName ? (
                    <div className="group-management-edit-name-container">
                      <input
                        type="text"
                        className="group-management-edit-name-input"
                        value={groupNameInput}
                        onChange={(e) => setGroupNameInput(e.target.value)}
                        placeholder="Enter new group name"
                        autoFocus
                      />
                      <div className="group-management-edit-name-actions">
                        <button
                          className="group-management-edit-name-button save"
                          onClick={handleSaveGroupName}
                          disabled={!groupNameInput.trim()}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="group-management-edit-name-button cancel"
                          onClick={handleCancelEditGroupName}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Users size={20} />
                      <h3 className="group-management-modal-title">
                        {groupNameInput.length > 0 ? groupNameInput : selectedGroupForModel?.name}
                        {selectedGroupForModel?.createdBy === currentUserId && (
                          <button
                            className="group-management-edit-icon"
                            onClick={handleEditGroupName}
                            title="Edit group name"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </h3>
                    </>
                  )}
                </div>
                <button className="group-management-modal-close" onClick={handleCloseModelModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="group-management-modal-body">
                {/* Search (only show for assigned/unassigned tabs) */}
                {activeTab !== 'pending' && activeTab !== 'settings' && (
                  <div className="group-management-search-container">
                    <Search size={18} className="group-management-search-icon" />
                    <input
                      type="text"
                      className="group-management-search-input"
                      placeholder={`Search ${activeTab === 'assigned' ? 'assigned' : 'available'} users...`}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="group-management-search-clear"
                        onClick={() => handleSearch('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* Tabs - Now includes Settings tab */}
                <div className="group-management-tabs-container">
                  <button
                    className={`group-management-tab-button ${activeTab === 'assigned' ? 'active' : ''}`}
                    onClick={() => handleTabChange('assigned')}
                  >
                    <Users size={16} />
                    <span>Assigned Users</span>
                    <span className="group-management-tab-count">{assignedUsers.length}</span>
                  </button>
                  <button
                    className={`group-management-tab-button ${activeTab === 'unassigned' ? 'active' : ''}`}
                    onClick={() => handleTabChange('unassigned')}
                  >
                    <UserPlus size={16} />
                    <span>Available Users</span>
                    <span className="group-management-tab-count">{unassignedUsers.length}</span>
                  </button>
                  <button
                    className={`group-management-tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => handleTabChange('pending')}
                  >
                    <Clock size={16} />
                    <span>Pending Changes</span>
                    <span className="group-management-tab-count pending">
                      {usersToAssign.length + usersToRemove.length}
                    </span>
                  </button>
                  {selectedGroupForModel?.createdBy === currentUserId && (
                    <button
                      className={`group-management-tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                      onClick={() => handleTabChange('settings')}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                  )}
                </div>

                {/* Content based on active tab */}
                <div className="group-management-users-container">
                  {activeTab === 'assigned' ? (
                    loadingAssigned ? (
                      <div className="group-management-loading-state">
                        <div className="group-management-loading-spinner">
                          <Loader2 size={24} className="animate-spin" />
                        </div>
                        <p>Loading assigned users...</p>
                      </div>
                    ) : assignedUsers.length === 0 ? (
                      <div className="group-management-empty-state">
                        <Users size={40} />
                        <p>{searchQuery ? 'No assigned users found' : 'No users assigned to this group'}</p>
                      </div>
                    ) : (
                      <div className="group-management-users-grid">
                        {assignedUsers.map((user) => {
                          const canRemove = canRemoveUser(user.id);
                          return (
                            <div key={user.id} className="group-management-user-card">
                              <div className="group-management-user-avatar">
                                <div className="group-management-user-avatar-initial">
                                  {user.username?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              </div>
                              <div className="group-management-user-details">
                                <div className="group-management-user-name">{user.username || user.name}</div>
                                <div className="group-management-user-email">{user.email}</div>
                                <div className="group-management-user-status">
                                  <BadgeCheck size={12} />
                                  <span>Assigned to group</span>
                                  {!canRemove && (
                                    <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '11px' }}>
                                      (Pending change)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {canRemove ? (
                                <button
                                  className="group-management-action-button remove"
                                  onClick={() => handleUnassignUser(user)}
                                  title="Remove from group"
                                >
                                  <UserMinus size={18} />
                                </button>
                              ) : (
                                <button
                                  className="group-management-action-button disabled"
                                  disabled
                                  title="Action already pending"
                                >
                                  <Clock size={18} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : activeTab === 'unassigned' ? (
                    loadingUnassigned ? (
                      <div className="group-management-loading-state">
                        <div className="group-management-loading-spinner">
                          <Loader2 size={24} className="animate-spin" />
                        </div>
                        <p>Loading available users...</p>
                      </div>
                    ) : unassignedUsers.length === 0 ? (
                      <div className="group-management-empty-state">
                        <UserPlus size={40} />
                        <p>{searchQuery ? 'No users found' : 'All users are already assigned to this group'}</p>
                      </div>
                    ) : (
                      <div className="group-management-users-grid">
                        {unassignedUsers.map((user) => {
                          const canAssign = canAssignUser(user.id);
                          return (
                            <div key={user.id} className="group-management-user-card">
                              <div className="group-management-user-avatar">
                                <div className="group-management-user-avatar-initial">
                                  {user.username?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              </div>
                              <div className="group-management-user-details">
                                <div className="group-management-user-name">{user.username || user.name}</div>
                                <div className="group-management-user-email">{user.email}</div>
                                <div className="group-management-user-status">
                                  <User size={12} />
                                  <span>Not in group</span>
                                  {!canAssign && (
                                    <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '11px' }}>
                                      (Pending change)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {canAssign ? (
                                <button
                                  className="group-management-action-button add"
                                  onClick={() => handleAssignUser(user)}
                                  title="Add to group"
                                >
                                  <UserPlus size={18} />
                                </button>
                              ) : (
                                <button
                                  className="group-management-action-button disabled"
                                  disabled
                                  title="Action already pending"
                                >
                                  <Clock size={18} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : activeTab === 'pending' ? (
                    /* Pending Changes Tab */
                    <div className="group-management-pending-changes">
                      <div className="group-management-pending-section">
                        <div className="group-management-pending-header">
                          <UserPlus size={20} className="add-icon" />
                          <h4>Users to Add ({usersToAssign.length})</h4>
                        </div>
                        {usersToAssign.length === 0 ? (
                          <div className="group-management-empty-pending">
                            <p>No users selected for assignment</p>
                          </div>
                        ) : (
                          <div className="group-management-pending-users">
                            {usersToAssign.map((user) => (
                              <div key={`assign-${user.id}`} className="group-management-pending-user">
                                <div className="group-management-pending-user-avatar">
                                  {user.username?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="group-management-pending-user-info">
                                  <div className="group-management-pending-user-name">{user.username || user.name}</div>
                                  <div className="group-management-pending-user-email">{user.email}</div>
                                </div>
                                <button
                                  className="group-management-pending-action-button cancel"
                                  onClick={() => handleCancelAssignment(user.id, 'assign')}
                                  title="Cancel assignment"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="group-management-pending-section">
                        <div className="group-management-pending-header">
                          <UserMinus size={20} className="remove-icon" />
                          <h4>Users to Remove ({usersToRemove.length})</h4>
                        </div>
                        {usersToRemove.length === 0 ? (
                          <div className="group-management-empty-pending">
                            <p>No users selected for removal</p>
                          </div>
                        ) : (
                          <div className="group-management-pending-users">
                            {usersToRemove.map((user) => (
                              <div key={`remove-${user.id}`} className="group-management-pending-user">
                                <div className="group-management-pending-user-avatar">
                                  {user.username?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="group-management-pending-user-info">
                                  <div className="group-management-pending-user-name">{user.username || user.name}</div>
                                  <div className="group-management-pending-user-email">{user.email}</div>
                                </div>
                                <button
                                  className="group-management-pending-action-button restore"
                                  onClick={() => handleCancelAssignment(user.id, 'remove')}
                                  title="Restore to group"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Settings Tab */
                    <div className="group-management-settings">
                      <div className="group-management-settings-section">
                        <div className="group-management-settings-header">
                          <Settings size={20} />
                          <h4>Group Settings</h4>
                        </div>

                        <div className="group-management-settings-item">
                          <div className="group-management-settings-label">
                            <Edit3 size={16} />
                            <span>Group Name</span>
                          </div>
                          <div className="group-management-settings-content">
                            {isEditingGroupName ? (
                              <div className="group-management-settings-edit">
                                <input
                                  type="text"
                                  className="group-management-settings-input"
                                  value={groupNameInput}
                                  onChange={(e) => setGroupNameInput(e.target.value)}
                                  placeholder="Enter new group name"
                                />
                                <div className="group-management-settings-edit-actions">
                                  <button
                                    className="group-management-settings-action-button save"
                                    onClick={handleSaveGroupName}
                                    disabled={!groupNameInput.trim()}
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    className="group-management-settings-action-button cancel"
                                    onClick={handleCancelEditGroupName}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group-management-settings-display">
                                <span className="group-management-settings-value">{groupNameInput?.length > 0 ? groupNameInput : selectedGroupForModel.name}</span>
                                <button
                                  className="group-management-settings-edit-button"
                                  onClick={handleEditGroupName}
                                >
                                  <Edit3 size={16} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="group-management-settings-item">
                          <div className="group-management-settings-label">
                            <Users size={16} />
                            <span>Current Members</span>
                          </div>
                          <div className="group-management-settings-content">
                            <span className="group-management-settings-value">
                              {assignedUsers.length + usersToAssign.length - usersToRemove.length} users
                            </span>
                          </div>
                        </div>

                        <div className="group-management-settings-item">
                          <div className="group-management-settings-label">
                            <Calendar size={16} />
                            <span>Created By</span>
                          </div>
                          <div className="group-management-settings-content">
                            <span className="group-management-settings-value">
                              You (Owner)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination (only for assigned/unassigned tabs) */}
                {activeTab !== 'pending' && activeTab !== 'settings' && (activeTab === 'assigned' ? assignedPagination.totalPages > 1 : unassignedPagination.totalPages > 1) && (
                  <div className="group-management-pagination">
                    <div className="group-management-pagination-info">
                      <span>Page </span>
                      <span className="group-management-pagination-current">
                        {activeTab === 'assigned' ? assignedPagination.currentPage : unassignedPagination.currentPage}
                      </span>
                      <span> of </span>
                      <span className="group-management-pagination-total">
                        {activeTab === 'assigned' ? assignedPagination.totalPages : unassignedPagination.totalPages}
                      </span>
                    </div>
                    <div className="group-management-pagination-buttons">
                      <button
                        className="group-management-pagination-button"
                        onClick={() => handlePageChange(activeTab, (activeTab === 'assigned' ? assignedPagination.currentPage : unassignedPagination.currentPage) - 1)}
                        disabled={(activeTab === 'assigned' ? assignedPagination.currentPage : unassignedPagination.currentPage) === 1}
                      >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                      </button>
                      <button
                        className="group-management-pagination-button"
                        onClick={() => handlePageChange(activeTab, (activeTab === 'assigned' ? assignedPagination.currentPage : unassignedPagination.currentPage) + 1)}
                        disabled={(activeTab === 'assigned' ? assignedPagination.currentPage : unassignedPagination.currentPage) === (activeTab === 'assigned' ? assignedPagination.totalPages : unassignedPagination.totalPages)}
                      >
                        <span>Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="group-management-modal-footer">
                <button
                  type="button"
                  className="group-management-modal-button secondary"
                  onClick={handleCloseModelModal}
                >
                  Cancel
                </button>
                {hasPendingChanges() && (
                  <button
                    type="button"
                    className="group-management-modal-button primary"
                    onClick={handleSaveChanges}
                  >
                    <Save size={16} />
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Group Management Modal Styles - Unique classes to avoid conflicts */
        .group-management-modal {
          position: relative;
        }
        
        .group-management-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: group-management-fadeIn 0.2s ease;
        }
        
        @keyframes group-management-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .group-management-modal-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 700px;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          animation: group-management-slideUp 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        @keyframes group-management-slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .group-management-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 70px;
        }
        
        .group-management-modal-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        
        .group-management-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        
        .group-management-edit-icon {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: white;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        
        .group-management-edit-icon:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        
        .group-management-edit-name-container {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        
        .group-management-edit-name-input {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          outline: none;
          transition: all 0.2s;
        }
        
        .group-management-edit-name-input:focus {
          border-color: white;
          background: rgba(255, 255, 255, 0.2);
        }
        
        .group-management-edit-name-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .group-management-edit-name-actions {
          display: flex;
          gap: 6px;
        }
        
        .group-management-edit-name-button {
          border: none;
          border-radius: 6px;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .group-management-edit-name-button.save {
          background: #10b981;
          color: white;
        }
        
        .group-management-edit-name-button.save:hover {
          background: #059669;
        }
        
        .group-management-edit-name-button.save:disabled {
          background: #6b7280;
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .group-management-edit-name-button.cancel {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        .group-management-edit-name-button.cancel:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .group-management-modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          color: white;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          flex-shrink: 0;
          margin-left: 10px;
        }
        
        .group-management-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }
        
        .group-management-modal-body {
          padding: 0;
          display: flex;
          flex-direction: column;
          height: calc(85vh - 140px);
        }
        
        /* Search Container */
        .group-management-search-container {
          position: relative;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .group-management-search-icon {
          position: absolute;
          left: 36px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        
        .group-management-search-input {
          width: 100%;
          padding: 12px 20px 12px 44px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.3s;
          background: #f9fafb;
        }
        
        .group-management-search-input:focus {
          outline: none;
          border-color: #6366f1;
          background: white;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .group-management-search-input::placeholder {
          color: #9ca3af;
        }
        
        .group-management-search-clear {
          position: absolute;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        .group-management-search-clear:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        /* Tabs */
        .group-management-tabs-container {
          display: flex;
          padding: 0 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .group-management-tab-button {
          flex: 1;
          padding: 16px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s;
        }
        
        .group-management-tab-button:hover {
          color: #4f46e5;
          background: rgba(99, 102, 241, 0.05);
        }
        
        .group-management-tab-button.active {
          color: #4f46e5;
        }
        
        .group-management-tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background: #4f46e5;
          border-radius: 3px 3px 0 0;
        }
        
        .group-management-tab-count {
          background: #e0e7ff;
          color: #4f46e5;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .group-management-tab-count.pending {
          background: #fef3c7;
          color: #d97706;
        }
        
        /* Users Container */
        .group-management-users-container {
          flex: 1;
          overflow-y: auto;
          padding: 0 24px;
        }
        
        .group-management-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6b7280;
        }
        
        .group-management-loading-spinner {
          margin-bottom: 16px;
        }
        
        .group-management-loading-state p {
          margin: 0;
          font-size: 14px;
        }
        
        .group-management-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #9ca3af;
        }
        
        .group-management-empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .group-management-empty-state p {
          margin: 0;
          font-size: 14px;
          max-width: 300px;
          line-height: 1.5;
        }
        
        .group-management-users-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px 0;
        }
        
        .group-management-user-card {
          display: flex;
          align-items: center;
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s;
          gap: 16px;
        }
        
        .group-management-user-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .group-management-user-avatar {
          flex-shrink: 0;
        }
        
        .group-management-user-avatar-initial {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
        }
        
        .group-management-user-details {
          flex: 1;
          min-width: 0;
        }
        
        .group-management-user-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
          font-size: 15px;
        }
        
        .group-management-user-email {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .group-management-user-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
        }
        
        /* Action Buttons on User Cards */
        .group-management-action-button {
          border: none;
          background: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .group-management-action-button.add {
          color: #10b981;
        }
        
        .group-management-action-button.add:hover {
          background: #d1fae5;
          color: #059669;
        }
        
        .group-management-action-button.remove {
          color: #ef4444;
        }
        
        .group-management-action-button.remove:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .group-management-action-button.disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }
        
        .group-management-action-button.disabled:hover {
          background: #f3f4f6;
        }
        
        /* Pending Changes Styles */
        .group-management-pending-changes {
          padding: 20px 0;
        }
        
        .group-management-pending-section {
          margin-bottom: 24px;
        }
        
        .group-management-pending-section:last-child {
          margin-bottom: 0;
        }
        
        .group-management-pending-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .group-management-pending-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        
        .group-management-pending-header .add-icon {
          color: #10b981;
        }
        
        .group-management-pending-header .remove-icon {
          color: #ef4444;
        }
        
        .group-management-empty-pending {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
          font-size: 14px;
        }
        
        .group-management-pending-users {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .group-management-pending-user {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          gap: 12px;
        }
        
        .group-management-pending-user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }
        
        .group-management-pending-user-info {
          flex: 1;
          min-width: 0;
        }
        
        .group-management-pending-user-name {
          font-weight: 500;
          color: #111827;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .group-management-pending-user-email {
          font-size: 12px;
          color: #6b7280;
        }
        
        .group-management-pending-action-button {
          border: none;
          background: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .group-management-pending-action-button.cancel {
          color: #6b7280;
        }
        
        .group-management-pending-action-button.cancel:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .group-management-pending-action-button.restore {
          color: #059669;
        }
        
        .group-management-pending-action-button.restore:hover {
          background: #d1fae5;
          color: #047857;
        }
        
        /* Settings Tab Styles */
        .group-management-settings {
          padding: 20px 0;
        }
        
        .group-management-settings-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .group-management-settings-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .group-management-settings-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        
        .group-management-settings-item {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .group-management-settings-item:last-child {
          border-bottom: none;
        }
        
        .group-management-settings-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }
        
        .group-management-settings-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .group-management-settings-value {
          font-size: 15px;
          color: #111827;
        }
        
        .group-management-settings-display {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .group-management-settings-edit {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        
        .group-management-settings-input {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }
        
        .group-management-settings-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .group-management-settings-edit-actions {
          display: flex;
          gap: 6px;
        }
        
        .group-management-settings-action-button {
          border: none;
          border-radius: 6px;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .group-management-settings-action-button.save {
          background: #10b981;
          color: white;
        }
        
        .group-management-settings-action-button.save:hover {
          background: #059669;
        }
        
        .group-management-settings-action-button.save:disabled {
          background: #6b7280;
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .group-management-settings-action-button.cancel {
          background: #f3f4f6;
          color: #374151;
        }
        
        .group-management-settings-action-button.cancel:hover {
          background: #e5e7eb;
        }
        
        .group-management-settings-edit-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s;
        }
        
        .group-management-settings-edit-button:hover {
          background: #e5e7eb;
        }
        
        /* Pagination */
        .group-management-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .group-management-pagination-info {
          font-size: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .group-management-pagination-current {
          font-weight: 600;
          color: #111827;
        }
        
        .group-management-pagination-total {
          font-weight: 500;
          color: #4b5563;
        }
        
        .group-management-pagination-buttons {
          display: flex;
          gap: 10px;
        }
        
        .group-management-pagination-button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .group-management-pagination-button:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f3f4f6;
        }
        
        .group-management-pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Modal Footer */
        .group-management-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .group-management-modal-button {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .group-management-modal-button.secondary {
          background: white;
          color: #4b5563;
          border: 1px solid #d1d5db;
        }
        
        .group-management-modal-button.secondary:hover {
          background: #f3f4f6;
        }
        
        .group-management-modal-button.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .group-management-modal-button.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        /* Scrollbar Styling */
        .group-management-users-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .group-management-users-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .group-management-users-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .group-management-users-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </>
  );
};
// Create Group Modal Component (unchanged)
interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
  getUsersApi: (params: {
    currentPage: number;
    totalRecords: number;
    search: string;
    moduleValue: number;
  }) => Promise<{ data: UserType[] }>;
  createGroup: (params: {
    name: string;
    groupUsers: number[];
  }) => Promise<any>;
}

const CreateGroupModal = ({
  open,
  onOpenChange,
  onGroupCreated,
  getUsersApi,
  createGroup
}: CreateGroupModalProps) => {
  const [step, setStep] = useState<'name' | 'users'>('name');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const usersListRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const pageSize = 10; // Fixed page size

  // Fetch users with pagination
  const fetchUsers = async (page = 1, search = '', isLoadMore = false) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const response = await getUsersApi({
        currentPage: page,
        totalRecords: pageSize,
        search,
        moduleValue: 0
      });

      const newUsers = response.data || [];

      // Check if we received fewer users than requested
      const receivedFullPage = newUsers.length === pageSize;
      setHasMore(receivedFullPage);

      if (isLoadMore) {
        // Filter out duplicates when loading more
        const existingIds = new Set(users.map(user => user.id));
        const uniqueNewUsers = newUsers.filter(user => !existingIds.has(user.id));
        setUsers(prev => [...prev, ...uniqueNewUsers]);
      } else {
        setUsers(newUsers);
      }

      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      setHasMore(false); // Stop trying on error
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Reset when step changes or modal opens
  useEffect(() => {
    if (open && step === 'users') {
      setCurrentPage(1);
      setHasMore(true);
      fetchUsers(1, searchQuery);
    }
  }, [open, step]);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      setHasMore(true);
      fetchUsers(1, query);
    }, 300);
  };

  // Infinite scroll handler
  const handleScroll = () => {
    if (!usersListRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = usersListRef.current;

    // Load more when scrolled near bottom (adds 5px buffer)
    if (scrollHeight - scrollTop <= clientHeight + 5) {
      loadMoreUsers();
    }
  };

  // Load more users function
  const loadMoreUsers = () => {
    if (!loading && hasMore && !isFetchingRef.current) {
      const nextPage = currentPage + 1;
      fetchUsers(nextPage, searchQuery, true);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    const listElement = usersListRef.current;
    if (listElement && step === 'users' && !loading) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [step, loading, hasMore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Manually trigger load more if initial results don't fill the container
  useEffect(() => {
    if (usersListRef.current && step === 'users' && !loading && hasMore) {
      const { scrollHeight, clientHeight } = usersListRef.current;
      // If content doesn't fill the container, load more
      if (scrollHeight <= clientHeight && users.length > 0) {
        loadMoreUsers();
      }
    }
  }, [users, step, loading, hasMore]);

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setCreating(true);
    try {
      await createGroup({
        name: groupName.trim(),
        groupUsers: selectedUsers
      });

      onGroupCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep('name');
    setGroupName('');
    setSelectedUsers([]);
    setSearchQuery('');
    setUsers([]);
    setCurrentPage(1);
    setHasMore(true);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            {step === 'name' ? 'Create Group' : 'Add Members'}
          </h3>
          <button className="modal-close" onClick={handleClose}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {step === 'name' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="form-input"
                />
              </div>

              <div className="modal-footer" style={{ padding: '0', border: 'none' }}>
                <button className="button button-outline" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={() => setStep('users')}
                  disabled={!groupName.trim()}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              {/* Search */}
              <div className="modal-search-wrapper">
                <Search className="modal-search-icon" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="modal-search-input"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="selected-users">
                  <div className="selected-users-label">
                    Selected Users ({selectedUsers.length})
                  </div>
                  <div className="selected-users-list">
                    {selectedUsers.map(userId => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <div key={userId} className="selected-user-tag">
                          {user.username}
                          <button
                            className="selected-user-remove"
                            onClick={() => toggleUserSelection(userId)}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Users List with Infinite Scroll */}
              <div
                ref={usersListRef}
                className="users-list"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: '300px',
                  maxHeight: '400px',
                  position: 'relative'
                }}
              >
                {users.length === 0 && !loading ? (
                  <div className="modal-empty">
                    No users found
                  </div>
                ) : (
                  <>
                    {users.map(user => (
                      <div
                        key={user.id}
                        className="user-item"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <div className={`user-checkbox ${selectedUsers.includes(user.id) ? 'checked' : ''}`}>
                          {selectedUsers.includes(user.id) && <Check />}
                        </div>
                        <div className="user-avatar">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{user.username}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator for infinite scroll */}
                    {loading && (
                      <div className="loading-more" style={{ textAlign: 'center', padding: '10px' }}>
                        <div className="loading-spinner" style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid #f3f3f3',
                          borderTop: '2px solid #3498db',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto'
                        }} />
                      </div>
                    )}

                    {/* No more users indicator */}
                    {!hasMore && users.length > 0 && (
                      <div className="no-more-users" style={{
                        textAlign: 'center',
                        padding: '10px',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        No more users to load
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="modal-footer" style={{ padding: '0', border: 'none', marginTop: 'auto' }}>
                <button className="button button-outline" onClick={() => setStep('name')}>
                  Back
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="button button-outline" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    className="button button-primary"
                    onClick={handleCreateGroup}
                    disabled={selectedUsers.length === 0 || creating}
                  >
                    {creating ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add CSS for spinner animation
const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Add this to your global CSS or component
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// User Details Modal Component (unchanged)
interface UserDetailsProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat: (user: UserType) => void;
}

const UserDetails = ({ user, open, onOpenChange, onStartChat }: UserDetailsProps) => {
  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <User />
            User Details
          </h3>
          <button className="modal-close" onClick={() => onOpenChange(false)}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="modal-body">
          <div className="user-details-header">
            <div className="user-avatar-large">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details-info">
              <h3>{user.name || user.username}</h3>
              <div className="user-details-status">
                <div className={`status-dot ${user.online ? 'online' : 'offline'}`} />
                {user.online ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="details-list">
            <div className="detail-item">
              <Mail />
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <User />
              <span className="detail-label">Username:</span>
              <span className="detail-value">@{user.username}</span>
            </div>
            {user.role && (
              <div className="detail-item">
                <Calendar />
                <span className="detail-label">Role:</span>
                <span className="detail-value">{user.role}</span>
              </div>
            )}
          </div>

          {user.lastMessage && (
            <div className="last-message-section">
              <div className="last-message-label">Last message:</div>
              <div className="last-message-text">{user.lastMessage}</div>
            </div>
          )}

          <div className="modal-footer" style={{ padding: '0', border: 'none' }}>
            <button
              className="button button-primary"
              onClick={() => {
                onStartChat(user);
                onOpenChange(false);
              }}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <MessageCircle style={{ width: 16, height: 16 }} />
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Group Details Modal Component (unchanged)
interface GroupDetailsProps {
  group: GroupType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinChat: (group: GroupType) => void;
}

const GroupDetails = ({ group, open, onOpenChange, onJoinChat }: GroupDetailsProps) => {
  if (!group) return null;

  return (
    <div className="modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Users />
            Group Details
          </h3>
          <button className="modal-close" onClick={() => onOpenChange(false)}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="modal-body">
          <div className="group-details-header">
            <div className="group-avatar-large">
              {group.name?.charAt(0).toUpperCase()}
            </div>
            <div className="group-details-info">
              <h3>{group.name}</h3>
            </div>
          </div>

          {group.description && (
            <div className="group-description">
              <div className="description-label">Description:</div>
              <div className="description-text">{group.description}</div>
            </div>
          )}

          {group.createdAt && (
            <div className="detail-item">
              <Calendar />
              <span className="detail-label">Created:</span>
              <span className="detail-value">
                {new Date(group.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="detail-item">
            <User />
            <span className="detail-label">Admin :</span>
            <span className="detail-value">
              {group?.createdByUser?.name}
            </span>
          </div>
          <div className="modal-footer" style={{ padding: '0', border: 'none', marginTop: 10 }}>
            <button
              className="button button-primary"
              onClick={() => {
                onJoinChat(group);
                onOpenChange(false);
              }}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <MessageCircle style={{ width: 16, height: 16 }} />
              Join Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};