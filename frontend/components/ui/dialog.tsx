"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Optional class for the overlay (e.g. z-[110] for nested dialogs) */
  overlayClassName?: string;
  /** When false, content area uses overflow-hidden and flex column; use for forms with internal scroll + sticky footer */
  contentScroll?: boolean;
  /** When false, clicking the backdrop does not close the dialog (default true) */
  closeOnBackdropClick?: boolean;
  /** When true, the header close (X) button is disabled */
  closeButtonDisabled?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  overlayClassName,
  contentScroll = true,
  closeOnBackdropClick = true,
  closeButtonDisabled = false,
}: DialogProps) {
  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sizeClasses: Record<NonNullable<DialogProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur - stopPropagation so nested dialogs don't close parent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (closeOnBackdropClick) onClose();
            }}
            className={cn(
              "fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center p-4 pt-20",
              overlayClassName,
            )}
          >
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-white rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col",
                sizeClasses[size]
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <h2 className="text-xl font-semibold text-text">{title}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                  }}
                  disabled={closeButtonDisabled}
                  className="h-8 w-8 p-0"
                  title={closeButtonDisabled ? "Please wait" : "Close"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content - scrollable by default; use contentScroll={false} for internal scroll + sticky footer */}
              <div
                className={cn(
                  "flex-1 min-h-0 p-6",
                  contentScroll
                    ? "overflow-y-auto"
                    : "overflow-hidden flex flex-col"
                )}
              >
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
