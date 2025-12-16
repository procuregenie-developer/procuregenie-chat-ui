import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Paperclip, Image, Search, Send, File, Loader2, Calendar, ArrowBigLeftDash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message, OnlineUser, FileAttachment } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { QuickReply } from "./QuickReply";
import { io, Socket } from "socket.io-client";
import "../../index.css";

interface ChatWindowProps {
  chatId: number;
  chatType: "user" | "group";
  approachName: string;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (message: string, files?: File[]) => void;
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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_FILES_SIZE = 50 * 1024 * 1024; // 50MB total for multiple files
const MAX_FILES_COUNT = 10; // Maximum number of files allowed
const MESSAGES_LIMIT = 20;

// Interface for grouped messages by date
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

  // Update ref when chat changes
  useEffect(() => {
    selectedChatRef.current = { chatId, chatType };
  }, [chatId, chatType]);

  // Group messages by date
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

  // Format date for display
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

  // Load messages from API with proper response handling
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

      // Prepare parameters based on chat type
      if (chatType === 'group') {
        params.groupId = chatId;
      } else {
        params.fromUserId = currentUserId;
        params.toUserId = chatId;
      }

      // Add search term if provided
      params.search = searchTerm;

      console.log('📡 Loading messages with params:', params);

      const response = await getMessages(params);

      // Handle API response structure: { status: "success", data: [], pagination: {} }
      if (response.status !== 'success') {
        throw new Error('Failed to load messages');
      }

      let messagesData: Message[] = response.data || [];

      console.log('✅ Messages loaded:', messagesData.length);

      // Convert backend data to frontend Message format
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

      // Backend returns messages in DESC order (newest first), reverse to show oldest first
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
      console.error('❌ Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [chatId, chatType, currentUserId, searchTerm, hasMore, getMessages]);

  // Load messages when component mounts or chat changes
  useEffect(() => {
    if (!chatId) return;

    setCurrentPage(1);
    setHasMore(true);
    setMessages([]);
    loadMessages(1, false);
  }, [chatId, chatType]);

  // Load more messages when search term changes
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

  // WebSocket Connection with proper message handling
  useEffect(() => {
    if (!currentUserId || !currentUserName || !chatId) return;

    setConnectionStatus('connecting');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus('connected');
      socket.emit('handleUserConnection', {
        userId: currentUserId,
        userInfo: { id: currentUserId, name: currentUserName }
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connect error', err);
      setConnectionStatus('disconnected');
    });

    socket.on('online_users', (userIds: string[]) => {
      const users = userIds.map(u => ({
        userId: String(u),
        status: 'online' as const,
        lastSeen: new Date().toISOString()
      }));
      setOnlineUsers(prev => {
        const existingMap = new Map(prev.map(p => [String(p.userId), p]));
        users.forEach(u => existingMap.set(u.userId, u));
        return Array.from(existingMap.values());
      });
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

    // Handle message sent confirmation
    socket.on('message_sent', (data: { tempId: string; message: any }) => {
      console.log('✅ Message sent confirmation:', data);

      // Convert backend message to frontend format
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

    // Handle new incoming messages
    socket.on('new_message', (payload: { message: any }) => {
      console.log('📨 New message received:', payload);
      const { message } = payload;
      const currentChat = selectedChatRef.current;

      // Check if message belongs to current chat
      const isForCurrentChat =
        (currentChat.chatType === 'group' && String(message.groupId) === String(currentChat.chatId)) ||
        (currentChat.chatType === 'user' &&
          ((String(message.fromUserId) === String(currentUserId) && String(message.toUserId) === String(currentChat.chatId)) ||
            (String(message.fromUserId) === String(currentChat.chatId) && String(message.toUserId) === String(currentUserId))));

      if (isForCurrentChat) {
        // Convert backend message to frontend format
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
          // Prevent duplicates
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
      // Convert backend message to frontend format
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
        isEdited: true,
        isRead: true,
        senderName: message.senderName
      };

      setMessages(prev => prev.map(msg =>
        msg.id === frontendMessage.id ? frontendMessage : msg
      ));
    });

    socket.on('message_deleted', (data: { messageId: string }) => {
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, currentUserName, chatId, chatType]);

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

    // Load more when scrolled to top
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

  const handleTypingStart = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || chatType !== 'user') return;

    socket.emit('typing_start', {
      fromUserId: currentUserId,
      toUserId: chatId.toString()
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      // Typing stops automatically after 2 seconds
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

    // Check if adding these files would exceed the maximum count
    if (files.length + selectedFiles.length > MAX_FILES_COUNT) {
      alert(`You can only attach up to ${MAX_FILES_COUNT} files at once.`);
      return;
    }

    // Validate each file
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

      if (type === "image" && !selectedFile.type.startsWith("image/")) {
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

    // Reset file inputs to allow selecting same files again
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

    // Create optimistic message
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

    // Add file data if present
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
    }

    // Add optimistic message to UI
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true), 50);

    // Send via WebSocket directly
    const payload: any = {
      fromUserId: currentUserId,
      ...(chatType === 'group' ? { groupId: chatId.toString() } : { toUserId: chatId.toString() }),
      messageType,
      messageText: files.length > 0 ? undefined : messageText,
      tempId
    };

    if (files.length > 0 && tempMessage.files) {
      payload.files = tempMessage.files; // Send array of files
    }

    console.log('📤 Sending message via WebSocket:', payload);
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

    console.log('✏️ Editing message:', messageId, newText);
    socket.emit('handleEditMessage', {
      messageId,
      messageText: newText,
      fromUserId: currentUserId,
      ...(chatType === 'group' ? { groupId: chatId.toString() } : { toUserId: chatId.toString() })
    });
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    const socket = socketRef.current;
    if (!socket) return;

    console.log('🗑️ Deleting message:', messageId);
    socket.emit('handleDeleteMessage', {
      messageId,
      fromUserId: currentUserId,
      ...(chatType === 'group' ? { groupId: chatId.toString() } : { toUserId: chatId.toString() })
    });
    setMenuOpenId(null);
  };

  const downloadFile = (fileObj: FileAttachment) => {
    try {
      const byteCharacters = atob(fileObj.content);
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
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.log(err);
      alert('Failed to download file.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get user status for private chats
  const getUserStatus = () => {
    if (chatType === 'group') return null;
    return onlineUsers.find(u => String(u.userId) === String(chatId)) || null;
  };

  const userStatus = getUserStatus();
  const isUserOnline = userStatus?.status === 'online';

  // Filter messages based on search term
  const filteredMessages = searchTerm
    ? messages.filter(msg =>
      msg.messageText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.files?.some(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : messages;

  // Group filtered messages by date for display
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
      <div className="fixed bottom-24 right-6 w-96 bg-card rounded-lg chat-shadow z-40 border border-border flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300 justify-center items-center"
        style={{ height: "500px" }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">No chat selected</h3>
          <p className="text-muted-foreground">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-24 right-6 w-96 bg-card rounded-lg hide-scrollbar  chat-shadow z-40 border border-border flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-300"
      style={{ height: "500px" }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-8 w-8 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <ArrowBigLeftDash className="h-4 w-4" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-semibold text-xs">
            {chatType === "user" ? approachName?.charAt(0) : "G"}
          </div>
          <div>
            <h4 className="font-semibold text-sm">{approachName}</h4>
            <p className="text-xs opacity-90">
              {chatType === "user" && (
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isUserOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {isUserOnline ? 'Online' : 'Offline'}
                  {otherUserTyping && <span className="italic text-blue-300"> - typing...</span>}
                </span>
              )}
              {chatType === "group" && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Group Chat
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="h-8 w-8 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-300' :
            connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
            {connectionStatus === 'connected' ? '●' :
              connectionStatus === 'connecting' ? '⟳' : '●'}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="p-3 border-b border-border bg-muted/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 bg-background"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 bg-muted/30"
        onScroll={checkScrollPosition}
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {isLoadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoadingMessages && filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p>{searchTerm ? 'No messages found' : 'No messages yet'}</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          Object.keys(filteredGroupedMessages)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(dateKey => (
              <div key={dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center justify-center my-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-background/80 rounded-full border text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateHeader(dateKey)}</span>
                  </div>
                </div>

                {/* Messages for this date */}
                {filteredGroupedMessages[dateKey].map((message) => (
                  <div key={message.id || message.tempId} className="group relative">
                    <MessageBubble
                      message={message}
                      isOwn={String(message.fromUserId) === String(currentUserId)}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      onDownloadFile={downloadFile}
                      isEditing={editingId === message.id}
                      editText={editText}
                      onEditTextChange={setEditText}
                      onSaveEdit={() => {
                        if (editText.trim()) {
                          handleEditMessage(message.id, editText.trim());
                        }
                      }}
                      onCancelEdit={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      onStartEdit={(id, text) => {
                        setEditingId(id);
                        setEditText(text);
                      }}
                      menuOpenId={menuOpenId}
                      onMenuToggle={setMenuOpenId}
                    />
                  </div>
                ))}
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {quickReplies.length > 0 && files.length === 0 && !searchTerm && (
        <div className="px-3 py-2 flex gap-2 flex-wrap border-t border-border/50">
          {quickReplies.map((reply, index) => (
            <QuickReply key={index} text={reply} onClick={() => handleQuickReply(reply)} />
          ))}
        </div>
      )}

      {/* Files Preview */}
      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAllFiles}
              className="h-6 text-xs"
            >
              Remove all
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background rounded-lg border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {file.type.startsWith('image/') ?
                      <Image className="h-4 w-4 text-blue-600" /> :
                      <File className="h-4 w-4 text-blue-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  className="h-6 w-6 flex-shrink-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading Indicator */}
      {isUploading && (
        <div className="px-3 py-2 border-t border-border/50 bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading {files.length} file{files.length > 1 ? 's' : ''}...</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder={files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} attached - click send to upload` : "Write a message..."}
            value={messageText}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            disabled={files.length > 0 || isUploading}
            className="flex-1 rounded-full"
          />
          <Button
            onClick={handleSend}
            size="sm"
            className="rounded-full px-4"
            disabled={(!messageText.trim() && files.length === 0) || isUploading || connectionStatus !== 'connected'}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-3 mt-2 text-muted-foreground">
          <label className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Paperclip className="h-4 w-4" />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'document')}
              disabled={isUploading}
              accept={ALLOWED_MIME_TYPES.join(',')}
              multiple // Allow multiple file selection
            />
          </label>
          <label className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Image className="h-4 w-4" />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'image')}
              disabled={isUploading}
              multiple // Allow multiple image selection
            />
          </label>
        </div>
      </div>

      {/* Overlay for closing menus */}
      {menuOpenId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpenId(null)}
        />
      )}
    </div>
  );
};