import { X, Users, Calendar, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Group as GroupType } from "@/types/chat";

interface GroupDetailsProps {
    group: GroupType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
    onJoinChat: (group: GroupType) => void;
}

export const GroupDetails = ({ group, open, onOpenChange, onClose, onJoinChat }: GroupDetailsProps) => {
    if (!group) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Group Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {group.memberCount || 'Multiple'} members
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {group.description && (
                            <div>
                                <p className="text-sm font-medium mb-1">Description:</p>
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                            </div>
                        )}

                        {group.createdAt && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={() => onJoinChat(group)}
                            className="flex-1 flex items-center gap-2"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Join Chat
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};