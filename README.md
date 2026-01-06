📘 ChatbortUI – React Chat Components

ChatbortUI is a lightweight React UI package that provides ready-to-use chat components for private and group messaging using Socket.io.

It is designed to plug into any React application with minimal setup.

✨ Features

👥 User & Group chat support

💬 Real-time messaging (Socket.io)

✏️ Edit messages

🗑 Delete messages

➖ Minimize / Close chat window

🧩 Easy API-based integration


📦 Installation
Install from npm
npm install chatbortui


or

yarn add chatbortui

🛠 Local Package Development (Using npm link)
Build & link the package
npm run build
npm link

Use linked package in another project
npm link chatbortui

🚀 Components Overview

ChatbortUI provides two main components:

1️⃣ ChatList

Displays:

All users

All groups

Allows:

Selecting a user or group

Creating a new group

Closing the chat list

2️⃣ ChatWindow

Displays:

Chat messages

Allows:

Sending messages

Editing messages

Deleting messages

Private & group chats

Minimize / Close window

🧩 Integration Guide
Step 1: Import Components
import { ChatList, ChatWindow } from "chatbortui";

Step 2: ChatList Props
📌 Required Props
Prop	Type	Description
getAllUsers	() => Promise<any[]>	Fetch all users
getAllGroups	() => Promise<any[]>	Fetch all groups
onSelectChat	(id, type, name) => void	Fired when a chat is selected
onClose	() => void	Close chat list
createGroup	(groupData) => Promise<any>	Create new group
currentUserId	string	Logged-in user ID
currentUserName	string	Logged-in username

✔ Example Usage
<ChatList
  getAllUsers={getUsersApi}
  getAllGroups={getGroupsApi}
  onSelectChat={handleSelectChat}
  onClose={handleToggleChatList}
  createGroup={createGroup}
  currentUserId={currentUserId}
  currentUserName={currentUserName}
  getGroupManageUsers={getGroupUsersData}
  socket={socket}
  assignedUsers={assignedUsers}
/>

Step 3: ChatWindow Props
📌 Required Props
Prop	Type	Description
chatId	string	Selected chat ID
chatType	"user" | "group"	Chat type
approachName	string	Header display name
getMessages	(id, type) => Promise<any[]>	Fetch messages
onClose	() => void	Close window
onMinimize	() => void	Minimize window
onEditMessage	(id, text) => void	Edit message
onDeleteMessage	(id) => void	Delete message
currentUserId	string	Logged-in user ID
currentUserName	string	Logged-in username
SOCKET_URL	string	Socket.io server URL
✔ Example Usage
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

Step 4: Full Integration Example
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
)}

🧪 Expected API Response Formats
getAllUsers
[
  { "id": "1", "username": "Alice" },
  { "id": "2", "username": "Bob" }
]

getAllGroups
[
  { "id": "101", "groupName": "Developers" }
]

getMessages
[
  {
    "id": "msg1",
    "fromUserId": "1",
    "messageText": "Hello!",
    "createdAt": "2024-01-01T12:30:00"
  }
]

🔌 Socket.io Events (Backend Requirement)

Your backend must support the following events:

Receive Message
socket.on("receiveMessage")

Edit Message
socket.on("handleEditMessage")

Delete Message
socket.on("handleDeleteMessage")