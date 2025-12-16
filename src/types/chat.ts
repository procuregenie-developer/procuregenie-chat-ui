export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  username?: string;
  online?: boolean;
  isActive?: boolean;
  email?: string;
  lastMessage?: string;
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  members: string;
  memberCount: number;
}

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  content: string; // base64
  url?: string;
}

export interface Message {
  id: string;
  tempId?: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  messageType: 'text' | 'doc' | 'image';
  messageText?: string;
  files?: FileAttachment[];
  createdAt: string;
  isEdited?: boolean;
  isRead?: boolean;
  isSending?: boolean;
  senderName?: string;
}

export interface ChatData {
  messages: Message[];
  quickReplies: string[];
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface OnlineUser {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string;
}