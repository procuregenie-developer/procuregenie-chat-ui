import { Button } from "@/components/ui/button";

interface QuickReplyProps {
  text: string;
  onClick: () => void;
}

export const QuickReply = ({ text, onClick }: QuickReplyProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="rounded-full border-2 border-primary text-primary hover:bg-primary/10 text-xs font-semibold"
    >
      {text}
    </Button>
  );
};
