Here is a clean, developer-friendly **README.md** section you can include in your project that explains **exactly how to use `ChatList` and `ChatWindow`** from your `chatbortui` package.

---

# 📘 ChatbortUI – Usage Guide

This guide explains how to integrate **ChatList** and **ChatWindow** in your React application.

## ✅ Installation

```bash
npm install chatbortui
```

Or:

```bash
yarn add chatbortui
```

---

# 🚀 Components Overview

ChatbortUI provides **two main components**:

### **1️⃣ ChatList**

Displays:

* All users
* All groups
  Allows:
* Selecting a user/group to chat
* Creating a new group
* Closing the list

### **2️⃣ ChatWindow**

Displays:

* Chat messages
  Allows:
* Sending messages
* Editing messages
* Deleting messages
* Group or private messages
* Minimize / Close

---

# 🧩 Integration Steps

## **Step 1: Import Components**

```tsx
import { ChatList, ChatWindow } from "chatbortui";
```

---

## **Step 2: Required Props for ChatList**

### 📌 `ChatList` Props

| Prop           | Type                          | Description                       |
| -------------- | ----------------------------- | --------------------------------- |
| `getAllUsers`  | `() => Promise<any[]>`        | API function returning all users  |
| `getAllGroups` | `() => Promise<any[]>`        | API function returning all groups |
| `onSelectChat` | `(id, type, name) => void`    | Fires when user selects a chat    |
| `onClose`      | `() => void`                  | Close button handler              |
| `createGroup`  | `(groupData) => Promise<any>` | API to create new group           |

### ✔ ChatList Usage

```tsx
<ChatList
  getAllUsers={getUsersApi}
  getAllGroups={getGroupsApi}
  onSelectChat={handleSelectChat}
  onClose={handleToggleChatList}
  createGroup={createGroup}
/>
```

---

## **Step 3: Required Props for ChatWindow**

### 📌 `ChatWindow` Props

| Prop              | Type                                   | Description             |
| ----------------- | -------------------------------------- | ----------------------- |
| `chatId`          | `string`                               | Selected user/group ID  |
| `chatType`        | `"user" \| "group"`                    | Type of chat            |
| `approachName`    | `string`                               | Name shown at top       |
| `getMessages`     | `(chatId, chatType) => Promise<any[]>` | Load chat messages      |
| `onClose`         | `() => void`                           | Close chat window       |
| `onMinimize`      | `() => void`                           | Minimize chat window    |
| `onEditMessage`   | `(id, text) => void`                   | Edit message handler    |
| `onDeleteMessage` | `(id) => void`                         | Delete message handler  |
| `currentUserId`   | `string`                               | Logged-in user ID       |
| `currentUserName` | `string`                               | Logged-in username      |
| `SOCKET_URL`      | `string`                               | URL of socket.io server |

### ✔ ChatWindow Usage

```tsx
<ChatWindow
  chatId={currentChat.id}
  chatType={currentChat.type}
  approachName={currentChat.name}
  getMessages={getMessages}
  onClose={handleCloseChat}
  onMinimize={handleMinimizeChat}
  onEditMessage={handleEditMessage}
  onDeleteMessage={handleDeleteMessage}
  currentUserId={currentUserId}
  currentUserName={currentUserName}
  SOCKET_URL="http://localhost:3000"
/>
```

---

## **Step 4: ChatList + ChatWindow Complete Example**

```tsx
{showChatList && (
  <ChatList
    getAllUsers={getUsersApi}
    getAllGroups={getGroupsApi}
    onClose={handleToggleChatList}
    onSelectChat={handleSelectChat}
    createGroup={createGroup}
  />
)}

{currentChat && (
  <ChatWindow
    chatId={currentChat.id}
    chatType={currentChat.type}
    getMessages={getMessages}
    approachName={currentChat?.name}
    onClose={handleCloseChat}
    onMinimize={handleMinimizeChat}
    onEditMessage={handleEditMessage}
    onDeleteMessage={handleDeleteMessage}
    currentUserId={currentUserId}
    currentUserName={currentUserName}
    SOCKET_URL={"http://localhost:3000"}
  />
)}
```

---

# 🧪 API ENDPOINT FORMAT (Expected Shape)

## getUsersApi ⇒ Must return:

```json
[
  { "id": "1", "username": "Alice" },
  { "id": "2", "username": "Bob" }
]
```

---

## getGroupsApi ⇒ Must return:

```json
[
  { "id": "101", "groupName": "Developers" }
]
```

---

## getMessages ⇒ Must return:

```json
[
  {
    "id": "msg1",
    "fromUserId": "1",
    "messageText": "Hello!",
    "createdAt": "2024-01-01T12:30:00"
  }
]
```

---

# 🧩 Socket.io Requirements

Your backend must support:

### Message edit

```ts
socket.on("handleEditMessage")
```

### Message delete

```ts
socket.on("handleDeleteMessage")
```

### Message receive

```ts
socket.on("receiveMessage")
```

---

# 💡 Notes

* `ChatWindow` automatically connects to your socket server.
* Uses `currentUserId` to style messages.
* Group and Private chats supported.
* Works in any React + Tailwind project.

---

If you want, I can generate a **full professional README.md file** for publishing on npm/github.


Package use steps :-

1) npm run build
2) npm link

Package import use steps :-

3) npm install <packagename>