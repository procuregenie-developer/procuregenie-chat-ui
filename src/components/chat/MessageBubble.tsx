import { MoreVertical, Edit2, Trash2, Check, CheckCheck, Loader2, File, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/chat";
import { Input } from "@/components/ui/input";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
  onDownloadFile: (file: any) => void;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (id: string, text: string) => void;
  menuOpenId: string | null;
  onMenuToggle: (id: string | null) => void;
}

export const MessageBubble = ({
  message,
  isOwn,
  onEdit,
  onDelete,
  onDownloadFile,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  menuOpenId,
  onMenuToggle,
}: MessageBubbleProps) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isEditing) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-2xl p-3 ${isOwn ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
          <Input
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="mb-2 text-foreground"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <div className="flex gap-2">
            <Button onClick={onSaveEdit} size="sm" className="h-6 text-xs">
              Save
            </Button>
            <Button onClick={onCancelEdit} variant="outline" size="sm" className="h-6 text-xs bg-blue-400">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl p-3 relative group ${isOwn ? 'bg-blue-600 text-white' : 'bg-white border border-border'
        }`}>
        <p className="text-sm break-words">{message.senderName}</p>
        {/* Message Text */}
        {message.messageText && (
          <p className="text-sm break-words">{message.messageText}</p>
        )}

        {/* File Attachments */}
        {message.files?.map((file, idx) => {
          const isImage = file.type?.startsWith('image/');
          return (
            <div key={idx} className="mt-2 first:mt-0">
              {isImage ? (
                <div className="rounded-lg overflow-hidden max-w-48">
                  <img
                    src={`data:${file.type};base64,${file.content}`}
                    alt={file.name}
                    className="max-w-full h-auto cursor-pointer hover:opacity-90"
                    onClick={() => onDownloadFile(file)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => onDownloadFile(file)}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded ${isOwn ? 'bg-blue-500/30' : 'bg-muted'
                    } hover:bg-muted/80 transition-colors`}
                >
                  <File className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}

        {/* Message Meta */}
        <div className="flex items-center justify-between mt-1 text-xs opacity-70 gap-2">
          <span>{formatTime(message.createdAt)}</span>
          <div className="flex items-center gap-1">
            {message.isEdited && <span className="italic">(edited)</span>}
            {isOwn && !message.isSending && (
              message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
            )}
            {message.isSending && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        </div>

        {/* Message Actions Menu */}
        {isOwn && !message.isSending && (
          <>
            <button
              onClick={() => onMenuToggle(menuOpenId === message.id ? null : message.id)}
              className="absolute -right-6 top-2 opacity-100 group-hover:opacity-200 transition-opacity p-1 hover:bg-muted rounded"
            >
              <MoreVertical className="h-3 w-3 text-black" />
            </button>

            {menuOpenId === message.id && (
              <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                {message.messageType === 'text' && (
                  <button
                    onClick={() => onStartEdit(message.id, message.messageText || '')}
                    className="w-full px-3 py-2 text-sm text-left text-blue-600 hover:bg-muted flex items-center gap-2"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                )}
                <button
                  onClick={() => onDelete(message.id)}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};