import { X, Mail, User, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User as UserType } from "@/types/chat";

interface UserDetailsProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onStartChat: (user: UserType) => void;
}

export const UserDetails = ({ user, open, onOpenChange, onClose, onStartChat }: UserDetailsProps) => {
  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.name || user.username}</h3>
              {/* <p className="text-sm text-muted-foreground flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                {user.online ? 'Online' : 'Offline'}
              </p> */}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>@{user.username}</span>
            </div>
            {user.role && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{user.role}</span>
              </div>
            )}
          </div>

          {user.lastMessage && (
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Last message:</p>
              <p className="text-sm mt-1">{user.lastMessage}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onStartChat(user)}
              className="flex-1 flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Start Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};