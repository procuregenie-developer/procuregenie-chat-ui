import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {children}
    </div>
  );
};

// Trigger
export const DialogTrigger = ({
  children,
  onOpen,
}: {
  children: React.ReactNode;
  onOpen: () => void;
}) => <span onClick={onOpen}>{children}</span>;

// Overlay
export const DialogOverlay = ({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) => (
  <div
    onClick={onClose}
    className={cn(
      "fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn",
      className
    )}
  />
);

// Content
export const DialogContent = ({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg animate-zoomIn",
      className
    )}
    onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={onClose}
      className="absolute right-4 top-4 p-1 rounded-md hover:bg-gray-100"
    >
      <X className="w-4 h-4" />
    </button>
    {children}
  </div>
);

// Header
export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-left", className)} {...props} />
);

// Footer
export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end mt-4 space-x-2", className)} {...props} />
);

// Title
export const DialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
);

// Description
export const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-gray-600", className)} {...props} />
);
