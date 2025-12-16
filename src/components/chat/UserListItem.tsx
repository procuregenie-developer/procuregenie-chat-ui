import { User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User as UserType } from "@/types/chat";

interface UserListItemProps {
  user: UserType;
  onClick: () => void;
  onViewDetails: () => void;
  isSelected: boolean;
  showOnlineStatus: boolean;
  showDetailsButton: boolean;
}

export const UserListItem = ({
  user,
  onClick,
  onViewDetails,
  isSelected,
  showOnlineStatus,
  showDetailsButton
}: UserListItemProps) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group ${isSelected
        ? "bg-primary/10 border border-primary/20 shadow-sm"
        : "hover:bg-accent/50 border border-transparent"
        }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
          <User className="h-5 w-5" />
        </div>
        {showOnlineStatus && user.online && (
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
        {showOnlineStatus && !user.online && user.isActive && (
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-background" />
        )}
      </div>

      {/* User Info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'
            }`}>
            {user?.username || user.username}
          </h3>
          {user.lastMessage && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              Just now
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {user.lastMessage || user.role || user.email}
          </p>
          {showDetailsButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Info className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};