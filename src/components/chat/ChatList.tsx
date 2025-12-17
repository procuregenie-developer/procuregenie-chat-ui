import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X, Search, Users, MessageCircle, Plus, ChevronDown, Star, Clock,
  Sparkles, Info, User, Check, Mail, Calendar, Loader2
} from "lucide-react";

// Types
interface UserType {
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

interface GroupType {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  isMember?: boolean;
  createdBy?: string;
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
}

// Main ChatList Component
export const ChatList = ({
  getAllUsers,
  getAllGroups,
  onClose,
  onSelectChat,
  createGroup
}: ChatListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [userView, setUserView] = useState<'chatted' | 'all'>('chatted');
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
              .filter((user: UserType) => user.lastMessage)
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
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(1, searchTerm, true, false);
    } else {
      fetchGroups(1, searchTerm, true, false);
    }
  }, [activeTab, userView]);

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
    console.log("More user");
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

    console.log("Scroll position:", { scrollTop, scrollHeight, clientHeight, isAtTop, isAtBottom });

    if (isAtTop && !loadingPrevious && !loading && !isFetching.current) {
      console.log("Loading previous data...");
      if (activeTab === "users" && usersPagination.hasPrevious) {
        loadPreviousUsers();
      } else if (activeTab === "groups" && groupsPagination.hasPrevious) {
        loadPreviousGroups();
      }
    }

    if (isAtBottom && !loadingMore && !loading && !isFetching.current) {
      console.log("Loading more data...");
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
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
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
      color: #6366f1;
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
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    .search-input:focus + .search-icon {
      color: #6366f1;
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
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
      color: #6366f1;
      background: rgba(99, 102, 241, 0.05);
    }

    .tab-trigger.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
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
      max-height: 520px;
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
      border-top-color: #6366f1;
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
      color: #6366f1;
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

    .list-item:hover {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%);
      border-color: rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .avatar.group {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      color: #6366f1;
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
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .button-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }

    .button-outline {
      background: white;
      color: #6366f1;
      border: 2px solid rgba(99, 102, 241, 0.2);
    }

    .button-outline:hover {
      border-color: #6366f1;
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
      border-top-color: #6366f1;
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
      border-color: #6366f1;
      color: #6366f1;
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
      border-color: #6366f1;
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
      border-color: #6366f1;
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
      color: #6366f1;
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
      color: #6366f1;
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
      background: #6366f1;
      border-color: #6366f1;
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
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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

  return (
    <>
      <style>{styles}</style>

      <div className="chat-list-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-top">
            <div className="header-left">
              <div className="header-icon-wrapper">
                <MessageCircle />
                <div className="online-indicator" />
              </div>
              <div className="header-text">
                <h3>Messages</h3>
                <div className="header-subtitle">
                  <Sparkles />
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
        {activeTab === 'users' && (
          <div className="view-toggle">
            <button
              className={`toggle-button ${userView === 'chatted' ? 'active' : ''}`}
              onClick={() => setUserView('chatted')}
            >
              <Clock />
              Recent Chats
            </button>
            <button
              className={`toggle-button ${userView === 'all' ? 'active' : ''}`}
              onClick={() => setUserView('all')}
            >
              <Users />
              All Users
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-list">
            <button
              className={`tab-trigger ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users />
              <span>Users</span>
            </button>
            <button
              className={`tab-trigger ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
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
              onClearSearch={clearSearch}
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
  userView: 'chatted' | 'all';
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
      {hasPreviousUsers && !loadingPrevious && (
        <div className="load-more-container">
          <button
            className="load-more-button"
            onClick={onLoadPrevious}
          >
            <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
            Load Previous Users
          </button>
        </div>
      )}

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
                <div className={`status-indicator ${user.online ? 'online' : 'offline'}`} />
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

// SIMPLIFIED: Group List Content Component
interface GroupListContentProps {
  groups: GroupType[];
  searchTerm: string;
  onSelectGroup: (group: GroupType) => void;
  onViewGroupDetails: (group: GroupType) => void;
  onCreateGroup: () => void;
  onClearSearch: () => void;
  hasMoreGroups: boolean;
  hasPreviousGroups: boolean;
  loadingMore: boolean;
  loadingPrevious: boolean;
  onLoadMore: () => void;
  onLoadPrevious: () => void;
}

const GroupListContent = ({
  groups,
  searchTerm,
  onSelectGroup,
  onViewGroupDetails,
  onCreateGroup,
  onClearSearch,
  hasMoreGroups,
  hasPreviousGroups,
  loadingMore,
  loadingPrevious,
  onLoadMore,
  onLoadPrevious
}: GroupListContentProps) => {
  const handleInfoClick = (e: React.MouseEvent, group: GroupType) => {
    e.stopPropagation();
    onViewGroupDetails(group);
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

      {/* Manual Load Previous Button (for testing) */}
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
            </div>
          </div>
          <button
            className="info-button"
            onClick={(e) => handleInfoClick(e, group)}
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

      {/* Manual Load More Button (for testing) */}
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users for selection
  const fetchUsers = async (search = '') => {
    setLoading(true);
    try {
      const response = await getUsersApi({
        currentPage: 1,
        totalRecords: 50,
        moduleValue: 0,
        search
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && step === 'users') {
      fetchUsers();
    }
  }, [open, step]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers(query);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

              {/* Users List */}
              <div className="users-list">
                {loading ? (
                  <div className="modal-loading">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="modal-empty">
                    No users found
                  </div>
                ) : (
                  users.map(user => (
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
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="modal-footer" style={{ padding: '0', border: 'none' }}>
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
              {/* <div className="group-members">
                {group.memberCount || 0} members
              </div> */}
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

          <div className="modal-footer" style={{ padding: '0', border: 'none' }}>
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