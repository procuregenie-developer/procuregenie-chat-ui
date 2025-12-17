'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";

// Icons
const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const PaperclipIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const ImageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const FileIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>;
const Loader2Icon = ({ spinning = true }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={spinning ? { animation: 'spin 1s linear infinite' } : {}}><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>;
const CalendarIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const ArrowLeftIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const MoreVerticalIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const DeleteIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;

// Interfaces
interface Message {
  id: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  messageType: 'text' | 'doc' | 'image';
  messageText?: string;
  files?: FileAttachment[];
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isRead?: boolean;
  senderName?: string;
  tempId?: string;
  isSending?: boolean;
}

interface OnlineUser {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

interface FileAttachment {
  name: string;
  size: number;
  type: string;
  content?: string;
  base64?: string;
}

interface ChatWindowProps {
  chatId: number;
  chatType: "user" | "group";
  approachName: string;
  onClose: () => void;
  onMinimize: () => void;
  currentUserId: string;
  currentUserName: string;
  getMessages: (params: {
    page: number;
    limit: number;
    groupId?: number | string;
    fromUserId?: number | string;
    toUserId?: number | string;
    search?: string;
  }) => Promise<{
    status: string;
    data: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
    };
  }>;
  SOCKET_URL: string;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_FILES_SIZE = 50 * 1024 * 1024;
const MAX_FILES_COUNT = 10;
const MESSAGES_LIMIT = 20;

interface DateGroupedMessages {
  [date: string]: Message[];
}

export const ChatWindow = ({
  chatId,
  chatType,
  approachName,
  onClose,
  onMinimize,
  currentUserId,
  currentUserName,
  getMessages,
  SOCKET_URL
}: ChatWindowProps) => {
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isUploading, setIsUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [quickReplies] = useState(["Hello", "Hi there", "How are you?", "Thanks"]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const isFetchingRef = useRef(false);
  const selectedChatRef = useRef({ chatId, chatType });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedChatRef.current = { chatId, chatType };
  }, [chatId, chatType]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const groupedMessages = useMemo((): DateGroupedMessages => {
    const groups: DateGroupedMessages = {};

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt);
      const dateKey = messageDate.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(message);
    });

    return groups;
  }, [messages]);

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const loadMessages = useCallback(async (page: number = 1, isLoadMore: boolean = false) => {
    if (!chatId) return;

    try {
      if (isLoadMore) {
        if (isFetchingRef.current || !hasMore) return;
        setIsLoadingMore(true);
      } else {
        setIsLoadingMessages(true);
      }

      isFetchingRef.current = true;

      const params: any = {
        page,
        limit: MESSAGES_LIMIT
      };

      if (chatType === 'group') {
        params.groupId = chatId;
      } else {
        params.fromUserId = currentUserId;
        params.toUserId = chatId;
      }

      params.search = searchTerm;

      const response = await getMessages(params);

      if (response.status !== 'success') {
        throw new Error('Failed to load messages');
      }

      let messagesData: Message[] = response.data || [];

      const formattedMessages: Message[] = messagesData.map(msg => ({
        id: String(msg.id),
        fromUserId: String(msg.fromUserId),
        toUserId: msg.toUserId ? String(msg.toUserId) : undefined,
        groupId: msg.groupId || undefined,
        messageType: msg.messageType,
        messageText: msg.messageText || undefined,
        files: msg.files || [],
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        isEdited: msg.updatedAt !== msg.createdAt,
        isRead: true,
        senderName: msg.senderName
      }));

      const orderedMessages = formattedMessages.reverse();

      setCurrentPage(page);
      setHasMore(response.pagination?.currentPage < response.pagination?.totalPages);

      if (isLoadMore) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = orderedMessages.filter(m => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      } else {
        setMessages(orderedMessages);
        if (page === 1) {
          setTimeout(() => scrollToBottom(false), 100);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [chatId, chatType, currentUserId, searchTerm, hasMore, getMessages]);

  useEffect(() => {
    if (!chatId) return;

    setCurrentPage(1);
    setHasMore(true);
    setMessages([]);
    loadMessages(1, false);
  }, [chatId, chatType]);

  useEffect(() => {
    if (!chatId) return;

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setHasMore(true);
      setMessages([]);
      loadMessages(1, false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  };

  const checkScrollPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = distanceFromBottom < 150;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isLoadingMore || !hasMore || isFetchingRef.current) return;

    checkScrollPosition();

    if (el.scrollTop === 0 && hasMore) {
      const previousScrollHeight = el.scrollHeight;
      loadMessages(currentPage + 1, true).then(() => {
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - previousScrollHeight;
          }
        });
      });
    }
  }, [currentPage, hasMore, isLoadingMore, checkScrollPosition, loadMessages]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!currentUserId || !currentUserName || !chatId) return;

    setConnectionStatus('connecting');

    // Create Socket.IO connection with proper configuration
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnectionStatus('connected');

      // Send user connection info
      socket.emit('handleUserConnection', {
        userId: currentUserId,
        userInfo: { id: currentUserId, name: currentUserName }
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connect error', err);
      setConnectionStatus('disconnected');
    });

    socket.on('online_users', (userIds: string[]) => {
      const users = userIds.map((u: string) => ({
        userId: String(u),
        status: 'online' as const,
        lastSeen: new Date().toISOString()
      }));
      setOnlineUsers(users);
    });

    socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      const currentChat = selectedChatRef.current;
      if (currentChat.chatType === 'user' && String(data.userId) === String(currentChat.chatId)) {
        setOtherUserTyping(data.isTyping);
        if (data.isTyping) {
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      }
    });

    socket.on('message_sent', (data: { tempId: string; message: any }) => {
      console.log('✅ Message sent confirmation:', data);

      const frontendMessage: Message = {
        id: String(data.message.id),
        fromUserId: String(data.message.fromUserId),
        toUserId: data.message.toUserId ? String(data.message.toUserId) : undefined,
        groupId: data.message.groupId || undefined,
        messageType: data.message.messageType,
        messageText: data.message.messageText || undefined,
        files: data.message.files || [],
        createdAt: data.message.createdAt,
        updatedAt: data.message.updatedAt,
        isEdited: data.message.updatedAt !== data.message.createdAt,
        isRead: true,
        senderName: data.message.senderName,
        isSending: false
      };

      setMessages(prev => prev.map(msg =>
        msg.tempId === data.tempId ? frontendMessage : msg
      ));
      setIsUploading(false);

      if (isNearBottom.current) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    });

    socket.on('new_message', (payload: { message: any }) => {
      console.log('📨 New message received:', payload);
      const { message } = payload;
      const currentChat = selectedChatRef.current;

      const isForCurrentChat =
        (currentChat.chatType === 'group' && String(message.groupId) === String(currentChat.chatId)) ||
        (currentChat.chatType === 'user' &&
          ((String(message.fromUserId) === String(currentUserId) && String(message.toUserId) === String(currentChat.chatId)) ||
            (String(message.fromUserId) === String(currentChat.chatId) && String(message.toUserId) === String(currentUserId))));

      if (isForCurrentChat) {
        const frontendMessage: Message = {
          id: String(message.id),
          fromUserId: String(message.fromUserId),
          toUserId: message.toUserId ? String(message.toUserId) : undefined,
          groupId: message.groupId || undefined,
          messageType: message.messageType,
          messageText: message.messageText || undefined,
          files: message.files || [],
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          isEdited: message.updatedAt !== message.createdAt,
          isRead: true,
          senderName: message.senderName,
          isSending: false
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === frontendMessage.id);
          if (exists) {
            return prev.map(m =>
              m.id === frontendMessage.id ? frontendMessage : m
            );
          }
          return [...prev, frontendMessage];
        });

        if (isNearBottom.current) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      }
    });

    socket.on('message_edited', (message: any) => {
      console.log('✏️ Message edited received:', message);

      const currentChat = selectedChatRef.current;
      const isForCurrentChat =
        (currentChat.chatType === 'group' && String(message.groupId) === String(currentChat.chatId)) ||
        (currentChat.chatType === 'user' &&
          ((String(message.fromUserId) === String(currentUserId) && String(message.toUserId) === String(currentChat.chatId)) ||
            (String(message.fromUserId) === String(currentChat.chatId) && String(message.toUserId) === String(currentUserId)) ||
            (String(message.fromUserId) === String(currentUserId) && String(message.toUserId) === String(currentChat.chatId))));

      if (isForCurrentChat) {
        const frontendEditedMessage: Message = {
          id: String(message.id),
          fromUserId: String(message.fromUserId),
          toUserId: message.toUserId ? String(message.toUserId) : undefined,
          groupId: message.groupId || undefined,
          messageType: message.messageType,
          messageText: message.messageText || undefined,
          files: message.files || [],
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          isEdited: true,
          isRead: true,
          senderName: message.senderName
        };

        setMessages(prev => prev.map(msg =>
          msg.id === frontendEditedMessage.id ? frontendEditedMessage : msg
        ));
      }
    });

    socket.on('message_deleted', (data: { messageId: string }) => {
      console.log('🗑️ Message deleted received:', data);
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });

    socket.on('message_error', (data: { error: string; tempId?: string }) => {
      console.error('❌ Message error:', data);
      if (data.tempId) {
        setMessages(prev => prev.filter(msg => msg.tempId !== data.tempId));
      }
      setIsUploading(false);
      alert(data.error || 'Failed to send message');
    });

    // Group message events for group chats
    if (chatType === 'group') {
      socket.on(`group_message_${chatId}`, (payload: { message: any }) => {
        console.log('👥 Group message received:', payload);
        const { message } = payload;

        const frontendMessage: Message = {
          id: String(message.id),
          fromUserId: String(message.fromUserId),
          groupId: message.groupId || undefined,
          messageType: message.messageType,
          messageText: message.messageText || undefined,
          files: message.files || [],
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          isEdited: message.updatedAt !== message.createdAt,
          isRead: true,
          senderName: message.senderName,
          isSending: false
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === frontendMessage.id);
          if (exists) {
            return prev.map(m =>
              m.id === frontendMessage.id ? frontendMessage : m
            );
          }
          return [...prev, frontendMessage];
        });

        if (isNearBottom.current) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      });

      socket.on(`group_message_deleted_${chatId}`, (data: { messageId: string }) => {
        console.log('🗑️ Group message deleted:', data);
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      });

      socket.on(`group_message_edited_${chatId}`, (message: any) => {
        console.log('✏️ Group message edited:', message);

        const frontendEditedMessage: Message = {
          id: String(message.id),
          fromUserId: String(message.fromUserId),
          groupId: message.groupId || undefined,
          messageType: message.messageType,
          messageText: message.messageText || undefined,
          files: message.files || [],
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          isEdited: true,
          isRead: true,
          senderName: message.senderName
        };

        setMessages(prev => prev.map(msg =>
          msg.id === frontendEditedMessage.id ? frontendEditedMessage : msg
        ));
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, currentUserName, chatId, chatType, SOCKET_URL]);

  const handleTypingStart = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || chatType !== 'user') return;

    socket.emit('typing_start', {
      fromUserId: currentUserId,
      toUserId: chatId.toString()
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stops automatically
    }, 2000);
  }, [currentUserId, chatId, chatType]);

  const handleTypingStop = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || chatType !== 'user') return;

    socket.emit('typing_stop', {
      fromUserId: currentUserId,
      toUserId: chatId.toString()
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [currentUserId, chatId, chatType]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (files.length > 0) {
      alert('Please remove all files first to send a text message.');
      return;
    }
    setMessageText(value);
    if (value.trim() && chatType === 'user') handleTypingStart();
    else if (!value.trim()) handleTypingStop();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "image") => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > MAX_FILES_COUNT) {
      alert(`You can only attach up to ${MAX_FILES_COUNT} files at once.`);
      return;
    }

    const validFiles: File[] = [];
    let totalSize = files.reduce((total, file) => total + file.size, 0);

    for (const selectedFile of selectedFiles) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        alert(`File "${selectedFile.name}" exceeds 10MB limit.`);
        continue;
      }

      totalSize += selectedFile.size;
      if (totalSize > MAX_TOTAL_FILES_SIZE) {
        alert(`Total files size exceeds ${MAX_TOTAL_FILES_SIZE / (1024 * 1024)}MB limit.`);
        break;
      }

      if (type === "image" && !selectedFile.type?.startsWith("image/")) {
        alert(`File "${selectedFile.name}" is not a valid image file.`);
        continue;
      }

      if (type === "document" && !ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
        alert(`Invalid file type for "${selectedFile.name}". Allowed types: PDF, DOC, DOCX, XLSX, TXT, Images.`);
        continue;
      }

      validFiles.push(selectedFile);
    }

    if (validFiles.length === 0) return;

    if (messageText.trim()) {
      if (!window.confirm("Selecting files will clear your message text. Continue?")) return;
      setMessageText("");
    }
    setFiles(prev => [...prev, ...validFiles]);
    handleTypingStop();

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllFiles = () => {
    setFiles([]);
  };

  const getFileBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!messageText.trim() && files.length === 0) {
      alert('Please enter a message or attach files.');
      return;
    }
    if (messageText.trim() && files.length > 0) {
      alert('You can only send either a text message OR files, not both.');
      return;
    }
    if (!socketRef.current || connectionStatus !== 'connected') {
      alert('Not connected to server. Please wait...');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const messageType = files.length > 0 ? 'doc' : 'text';

    if (files.length > 0) setIsUploading(true);

    const tempMessage: Message = {
      id: tempId,
      tempId,
      fromUserId: currentUserId,
      ...(chatType === 'group' ? { groupId: chatId.toString() } : { toUserId: chatId.toString() }),
      messageType,
      messageText: files.length > 0 ? undefined : messageText,
      createdAt: new Date().toISOString(),
      isSending: true,
      senderName: currentUserName
    };

    if (files.length > 0) {
      try {
        const filePromises = files.map(file => getFileBase64(file));
        const base64Array = await Promise.all(filePromises);
        tempMessage.files = files.map((file, index) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64Array[index]
        }));
      } catch (err) {
        console.error('File processing error:', err);
        alert('Failed to process files');
        setIsUploading(false);
        return;
      }
    };
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true), 50);

    const payload: any = {
      fromUserId: currentUserId,
      ...(chatType === 'group' ? { groupId: chatId.toString() } : { toUserId: chatId.toString() }),
      messageType,
      messageText: files.length > 0 ? undefined : messageText,
      tempId
    };

    if (files.length > 0 && tempMessage.files) {
      payload.files = tempMessage.files;
    }

    console.log('📤 Sending message via Socket.IO:', payload);
    socketRef.current.emit('handleSendMessage', payload);

    setMessageText("");
    setFiles([]);
    handleTypingStop();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = async (reply: string) => {
    setMessageText(reply);
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    const messageToEdit = messages.find(msg => msg.id === messageId);
    if (!messageToEdit) return;

    // Only allow editing text messages
    if (messageToEdit.messageType !== 'text') {
      alert('Only text messages can be edited.');
      return;
    }

    console.log('✏️ Editing message:', messageId, newText);

    const payload: any = {
      messageId,
      messageText: newText,
      fromUserId: currentUserId
    };

    if (chatType === 'group') {
      payload.groupId = chatId.toString();
    } else {
      payload.toUserId = chatId.toString();
    }

    socket.emit('handleEditMessage', payload);
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) return;

    const socket = socketRef.current;
    if (!socket) return;

    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) return;

    console.log('🗑️ Deleting message:', messageId);

    const payload: any = {
      messageId,
      fromUserId: currentUserId
    };

    if (chatType === 'group') {
      payload.groupId = chatId.toString();
    } else {
      payload.toUserId = chatId.toString();
    }

    socket.emit('handleDeleteMessage', payload);
    setMenuOpenId(null);
  };

  const downloadFile = (fileObj: FileAttachment) => {
    try {
      const base64Data = fileObj.content || fileObj.base64 || '';
      if (!base64Data) {
        alert('File data not available for download.');
        return;
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileObj.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getUserStatus = () => {
    if (chatType === 'group') return null;
    return onlineUsers.find(u => String(u.userId) === String(chatId)) || null;
  };

  const userStatus = getUserStatus();
  const isUserOnline = userStatus?.status === 'online';
  const filteredMessages = searchTerm
    ? messages.filter(msg =>
      msg.messageText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.files?.some(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : messages;
  const filteredGroupedMessages = useMemo((): DateGroupedMessages => {
    const groups: DateGroupedMessages = {};

    filteredMessages.forEach(message => {
      const messageDate = new Date(message.createdAt);
      const dateKey = messageDate.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(message);
    });

    return groups;
  }, [filteredMessages]);

  if (!chatId) {
    return (
      <div className="chat-window-container">
        <div className="empty-chat-state">
          <div className="empty-chat-icon">💬</div>
          <h3>No chat selected</h3>
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Global Styles */
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Chat Window Container */
        .chat-window-container {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 384px;
          height: 500px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
          z-index: 1000;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          animation: slideInUp 0.3s ease-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        
        /* Empty State */
        .empty-chat-state {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          text-align: center;
          padding: 32px;
        }
        
        .empty-chat-icon {
          width: 64px;
          height: 64px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 32px;
        }
        
        .empty-chat-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1f2937;
        }
        
        .empty-chat-state p {
          color: #6b7280;
          font-size: 14px;
        }
        
        /* Header */
        .chat-header {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1001;
          position: relative;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .minimize-button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        
        .minimize-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          color: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
        
        .chat-info {
          display: flex;
          flex-direction: column;
        }
        
        .chat-name {
          font-size: 14px;
          font-weight: 600;
        }
        
        .chat-status {
          font-size: 12px;
          opacity: 0.9;
          display: flex;
          align-items: center;
          gap: 4px;
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
        
        .status-dot.group {
          background: #3b82f6;
        }
        
        .typing-indicator {
          font-style: italic;
          color: #93c5fd;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .header-button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        
        .header-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .header-button.close:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        .connection-status {
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .status-connected {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .status-connecting {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        
        .status-disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        /* Search Bar */
        .search-container {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          z-index: 1001;
          position: relative;
        }
        
        .search-wrapper {
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 40%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #9ca3af;
        }
        
        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 40px 0 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          transition: background 0.2s ease;
        }
        
        .search-clear:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        /* Messages Container */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          background: #f3f4f6;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        
        /* Loading States */
        .loading-more {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 128px;
        }
        
        .large-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(99, 102, 241, 0.3);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 128px;
          color: #6b7280;
          text-align: center;
        }
        
        .empty-state p {
          margin: 4px 0;
        }
        
        .empty-state p:first-of-type {
          font-weight: 600;
        }
        
        .empty-state p:last-of-type {
          font-size: 14px;
        }
        
        /* Date Header */
        .date-header {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 16px 0;
          position: relative;
          z-index: 1;
        }
        
        .date-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          backdrop-filter: blur(10px);
        }
        
        /* Message Group */
        .message-group {
          position: relative;
          margin-bottom: 8px;
        }
        
        .message-bubble-wrapper {
          display: flex;
          position: relative;
        }
        
        .message-bubble-wrapper.own {
          justify-content: flex-end;
        }
        
        .message-bubble {
          max-width: 70%;
          padding: 8px 12px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          word-break: break-word;
        }
        
        .message-bubble.own {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .message-bubble.other {
          background: white;
          color: #1f2937;
          border-bottom-left-radius: 4px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .message-text {
          font-size: 14px;
          line-height: 1.4;
          white-space: pre-wrap;
        }
        
        .message-info {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
          font-size: 11px;
          opacity: 0.8;
        }
        
        .message-time {
          font-size: 11px;
        }
        
        .message-edited {
          font-style: italic;
        }
        
        .message-sending {
          opacity: 0.7;
        }
        
        /* Message Menu */
        .message-menu-container {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1002;
        }
        
        .message-menu-button {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          opacity: 0;
          transform: translateY(-4px);
        }
        
        .message-group:hover .message-menu-button {
          opacity: 1;
          transform: translateY(0);
        }
        
        .message-menu-button:hover {
          background: white;
          color: #1f2937;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .message-menu-button.active {
          opacity: 1;
          transform: translateY(0);
          background: white;
        }
        
        .menu-dropdown {
          position: absolute;
          top: 32px;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          z-index: 1003;
          min-width: 140px;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }
        
        .menu-item {
          padding: 10px 16px;
          font-size: 14px;
          color: #1f2937;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .menu-item:last-child {
          border-bottom: none;
        }
        
        .menu-item:hover {
          background: #f3f4f6;
        }
        
        .menu-item.delete {
          color: #ef4444;
        }
        
        /* Edit Message */
        .edit-container {
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          z-index: 1001;
          position: relative;
        }
        
        .edit-input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 12px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        
        .edit-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .edit-button {
          padding: 6px 16px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .edit-button.save {
          background: #10b981;
          color: white;
        }
        
        .edit-button.save:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .edit-button.cancel {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .edit-button.cancel:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }
        
        /* File Preview in Message */
        .file-preview {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .file-preview:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .file-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .file-icon.image {
          background: rgba(16, 185, 129, 0.2);
        }
        
        .file-icon.document {
          background: rgba(99, 102, 241, 0.2);
        }
        
        .file-info {
          flex: 1;
          min-width: 0;
        }
        
        .file-name {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-size {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 2px;
        }
        
        .file-download {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        
        .file-download:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        /* Quick Replies */
        .quick-replies {
          padding: 8px 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-top: 1px solid rgba(229, 231, 235, 0.5);
          background: white;
        }
        
        .quick-reply {
          padding: 6px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          font-size: 13px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .quick-reply:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #1f2937;
          transform: translateY(-1px);
        }
        
        /* Files Preview */
        .files-preview {
          padding: 12px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          z-index: 1001;
          position: relative;
        }
        
        .files-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .files-count {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .remove-all {
          padding: 4px 12px;
          background: transparent;
          border: none;
          font-size: 13px;
          color: #6366f1;
          cursor: pointer;
          transition: color 0.2s ease;
          border-radius: 6px;
        }
        
        .remove-all:hover {
          color: #4f46e5;
          background: rgba(99, 102, 241, 0.1);
        }
        
        .files-list {
          max-height: 128px;
          overflow-y: auto;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 6px;
          transition: all 0.2s ease;
        }
        
        .file-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .file-item-content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        
        .file-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #e0e7ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .file-item-icon.image {
          background: #dbeafe;
        }
        
        .file-item-info {
          min-width: 0;
        }
        
        .file-item-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-item-size {
          font-size: 12px;
          color: #6b7280;
        }
        
        .file-remove {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .file-remove:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        /* Uploading Indicator */
        .uploading-indicator {
          padding: 12px;
          border-top: 1px solid #e5e7eb;
          background: #dbeafe;
          color: #1e40af;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1001;
          position: relative;
        }
        
        .uploading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(30, 64, 175, 0.3);
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        
        /* Input Area */
        .input-area {
          padding: 12px;
          border-top: 1px solid #e5e7eb;
          background: white;
          z-index: 1001;
          position: relative;
        }
        
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .message-input {
          flex: 1;
          height: 44px;
          padding: 0 18px;
          border: 2px solid #e5e7eb;
          border-radius: 22px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          background: white;
        }
        
        .message-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .message-input:disabled {
          background: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }
        
        .send-button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
        }
        
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        
        .attachment-buttons {
          display: flex;
          gap: 16px;
          color: #6b7280;
          padding-left: 8px;
        }
        
        .attachment-label {
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .attachment-label:hover {
          color: #6366f1;
        }
        
        .attachment-label.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .attachment-input {
          display: none;
        }
        
        /* Menu Overlay */
        .menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: transparent;
        }
        
        /* Message Sender */
        .message-sender {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
          .chat-window-container {
            width: calc(100vw - 32px);
            right: 16px;
            bottom: 80px;
            height: 70vh;
          }
          
          .menu-dropdown {
            min-width: 120px;
          }
          
          .edit-container {
            padding: 10px;
          }
        }
      `}</style>

      <div className="chat-window-container" ref={menuRef}>
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <button className="minimize-button" onClick={onMinimize}>
              <ArrowLeftIcon />
            </button>
            <div className="user-avatar">
              {chatType === "user" ? approachName?.charAt(0) : "G"}
            </div>
            <div className="chat-info">
              <div className="chat-name">{approachName}</div>
              <div className="chat-status">
                {chatType === "user" && (
                  <>
                    <div className={`status-dot ${isUserOnline ? 'online' : 'offline'}`} />
                    {isUserOnline ? 'Online' : 'Offline'}
                    {otherUserTyping && <span className="typing-indicator"> - typing...</span>}
                  </>
                )}
                {chatType === "group" && (
                  <>
                    <div className="status-dot group" />
                    Group Chat
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-button" onClick={() => setIsSearchOpen(!isSearchOpen)}>
              <SearchIcon />
            </button>
            <div className={`connection-status ${connectionStatus === 'connected' ? 'status-connected' :
              connectionStatus === 'connecting' ? 'status-connecting' :
                'status-disconnected'
              }`}>
              {connectionStatus === 'connected' ? '●' :
                connectionStatus === 'connecting' ? '⟳' : '●'}
            </div>
            <button className="header-button close" onClick={onClose}>
              <XIcon />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="search-container">
            <div className="search-wrapper">
              <div className="search-icon"><SearchIcon /></div>
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>
                  <XIcon />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={containerRef}
          className="messages-container"
          onScroll={checkScrollPosition}
        >
          {isLoadingMore && (
            <div className="loading-more">
              <div className="spinner" />
            </div>
          )}

          {isLoadingMessages && messages.length === 0 && (
            <div className="loading-container">
              <div className="large-spinner" />
            </div>
          )}

          {!isLoadingMessages && filteredMessages.length === 0 ? (
            <div className="empty-state">
              <p>{searchTerm ? 'No messages found' : 'No messages yet'}</p>
              <p>Start a conversation!</p>
            </div>
          ) : (
            Object.keys(filteredGroupedMessages)
              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
              .map(dateKey => (
                <div key={dateKey} className="message-date-group">
                  {/* Date Header */}
                  <div className="date-header">
                    <div className="date-badge">
                      <CalendarIcon />
                      <span>{formatDateHeader(dateKey)}</span>
                    </div>
                  </div>

                  {/* Messages for this date */}
                  {filteredGroupedMessages[dateKey].map((message) => {
                    return (
                      <div key={message.id || message.tempId} className="message-group">
                        {editingId === message.id ? (
                          <div className="edit-container">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="edit-input"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditMessage(message.id, editText);
                                }
                              }}
                            />
                            <div className="edit-actions">
                              <button
                                className="edit-button save"
                                onClick={() => handleEditMessage(message.id, editText)}
                              >
                                Save
                              </button>
                              <button
                                className="edit-button cancel"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditText('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`message-bubble-wrapper ${String(message.fromUserId) === String(currentUserId) ? 'own' : 'other'}`}>
                            <div className={`message-bubble ${String(message.fromUserId) === String(currentUserId) ? 'own' : 'other'} ${message.isSending ? 'message-sending' : ''}`}>
                              {message.senderName && String(message.fromUserId) !== String(currentUserId) && (
                                <div className="message-sender">{message.senderName}</div>
                              )}

                              {message.messageText && (
                                <div className="message-text">{message.messageText}</div>
                              )}

                              {message.files && message.files.length > 0 && (
                                <div className="files-container">
                                  {message.files.map((file, index) => (
                                    <div
                                      key={index}
                                      className="file-preview"
                                      onClick={() => downloadFile(file)}
                                    >
                                      <div className={`file-icon ${file.type?.startsWith('image/') ? 'image' : 'document'}`}>
                                        {file.type?.startsWith('image/') ? (
                                          <ImageIcon />
                                        ) : (
                                          <FileIcon />
                                        )}
                                      </div>
                                      <div className="file-info">
                                        <div className="file-name">{file.name}</div>
                                        {/* <div className="file-size">{formatFileSize(file.size)}</div> */}
                                      </div>
                                      <button
                                        className="file-download"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadFile(file);
                                        }}
                                      >
                                        <DownloadIcon />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="message-info">
                                <span className="message-time">
                                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {message.isEdited && (
                                  <span className="message-edited">(edited)</span>
                                )}
                              </div>
                            </div>

                            {/* Message Menu - Show only for own messages */}
                            {String(message.fromUserId) === String(currentUserId) && !message.isSending && (
                              <div className="message-menu-container">
                                <button
                                  className={`message-menu-button ${menuOpenId === message.id ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpenId === message.id ? null : message.id);
                                  }}
                                >
                                  <MoreVerticalIcon />
                                </button>
                                {menuOpenId === message.id && (
                                  <div className="menu-dropdown">
                                    {message.messageType === "text" && (<div
                                      className="menu-item"
                                      onClick={() => {
                                        setEditingId(message.id);
                                        setEditText(message.messageText || '');
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <EditIcon />
                                      Edit
                                    </div>)}
                                    <div
                                      className="menu-item delete"
                                      onClick={() => {
                                        handleDeleteMessage(message.id);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <DeleteIcon />
                                      Delete
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                  )}
                </div>
              ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {quickReplies.length > 0 && files.length === 0 && !searchTerm && (
          <div className="quick-replies">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                className="quick-reply"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Files Preview */}
        {files.length > 0 && (
          <div className="files-preview">
            <div className="files-header">
              <div className="files-count">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </div>
              <button className="remove-all" onClick={handleRemoveAllFiles}>
                Remove all
              </button>
            </div>
            <div className="files-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-item-content">
                    <div className={`file-item-icon ${file.type?.startsWith('image/') ? 'image' : ''}`}>
                      {file.type?.startsWith('image/') ? (
                        <ImageIcon />
                      ) : (
                        <FileIcon />
                      )}
                    </div>
                    <div className="file-item-info">
                      <div className="file-item-name">{file.name}</div>
                      {/* <div className="file-item-size">{formatFileSize(file.size)}</div> */}
                    </div>
                  </div>
                  <button className="file-remove" onClick={() => handleRemoveFile(index)}>
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploading Indicator */}
        {isUploading && (
          <div className="uploading-indicator">
            <div className="uploading-spinner" />
            <span>Uploading {files.length} file{files.length > 1 ? 's' : ''}...</span>
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          <div className="input-wrapper">
            <input
              type="text"
              placeholder={files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} attached - click send to upload` : "Write a message..."}
              value={messageText}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              disabled={files.length > 0 || isUploading}
              className="message-input"
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={(!messageText.trim() && files.length === 0) || isUploading || connectionStatus !== 'connected'}
            >
              {isUploading ? <Loader2Icon spinning={true} /> : <SendIcon />}
            </button>
          </div>
          <div className="attachment-buttons">
            <label className={`attachment-label ${isUploading ? 'disabled' : ''}`}>
              <PaperclipIcon />
              <span>Document</span>
              <input
                ref={fileInputRef}
                type="file"
                className="attachment-input"
                onChange={(e) => handleFileChange(e, 'document')}
                disabled={isUploading}
                accept={ALLOWED_MIME_TYPES.join(',')}
                multiple
              />
            </label>
            <label className={`attachment-label ${isUploading ? 'disabled' : ''}`}>
              <ImageIcon />
              <span>Image</span>
              <input
                ref={imageInputRef}
                type="file"
                className="attachment-input"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'image')}
                disabled={isUploading}
                multiple
              />
            </label>
          </div>
        </div>

        {/* Overlay for closing menus */}
        {menuOpenId && (
          <div
            className="menu-overlay"
            onClick={() => setMenuOpenId(null)}
          />
        )}
      </div>
    </>
  );
};