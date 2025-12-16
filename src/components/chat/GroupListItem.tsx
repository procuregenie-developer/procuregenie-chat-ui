import { Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Group as GroupType } from "@/types/chat";

interface GroupListItemProps {
  group: GroupType;
  onClick: () => void;
  onViewDetails: () => void;
  isSelected: boolean;
  showDetailsButton: boolean;
}

export const GroupListItem = ({
  group,
  onClick,
  onViewDetails,
  isSelected,
  showDetailsButton,
}: GroupListItemProps) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
        isSelected
          ? "bg-primary/10 border border-primary/20 shadow-sm"
          : "hover:bg-accent/50 border border-transparent"
      }`}
    >
      {/* Group Avatar */}
      <div 
        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Users className="h-5 w-5" />
      </div>

      {/* Group Info */}
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold truncate ${
            isSelected ? 'text-primary' : 'text-foreground'
          }`}>
            {group.name}
          </h3>
          {group.memberCount !== undefined && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {group.memberCount} members
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {group.description || 'Group chat'}
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