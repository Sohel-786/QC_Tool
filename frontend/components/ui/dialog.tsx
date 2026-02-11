"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Optional class for the overlay (e.g. z-[1100] for nested dialogs to appear above baseline z-1000) */
  overlayClassName?: string;
  /** When false, content area uses overflow-hidden and flex column; use for forms with internal scroll + sticky footer */
  contentScroll?: boolean;
  /** When false, clicking the backdrop does not close the dialog (default true) */
  closeOnBackdropClick?: boolean;
  /** When true, the header close (X) button is disabled */
  closeButtonDisabled?: boolean;
}

// Global stack to track open dialogs and handle nested ESC key behavior
const dialogStack: (() => void)[] = [];

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  overlayClassName,
  contentScroll = true,
  closeOnBackdropClick = false,
  closeButtonDisabled = false,
}: DialogProps) {
  // Lock body scroll and handle ESC key when dialog is open
  useEffect(() => {
    const closeFn = () => onClose();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !closeButtonDisabled) {
        // Only trigger onClose if this dialog is at the top of the stack
        if (dialogStack[dialogStack.length - 1] === closeFn) {
          onClose();
        }
      }
    };

    if (isOpen) {
      // Add this dialog to the stack
      dialogStack.push(closeFn);

      // Lock scroll only if it's the first dialog opening
      if (dialogStack.length === 1) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        // Remove from stack on unmount or when closed
        const index = dialogStack.indexOf(closeFn);
        if (index > -1) {
          dialogStack.splice(index, 1);
        }

        // Unlock scroll only if No more dialogs are open
        if (dialogStack.length === 0) {
          document.body.style.overflow = "";
          document.documentElement.style.overflow = "";
        }

        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose, closeButtonDisabled]);

  const sizeClasses: Record<NonNullable<DialogProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
    "3xl": "max-w-7xl",
  };

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop – portaled to body so z-[100] is above sidebar (z-50) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              if (closeOnBackdropClick) onClose();
            }}
            className={cn(
              "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4",
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
                "bg-white rounded-xl shadow-2xl w-full max-h-[96vh] flex flex-col",
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
                  "flex-1 min-h-0",
                  contentScroll
                    ? "overflow-y-auto p-6"
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

  // Portal to document.body so the dialog is above the sidebar (escapes content area z-0 stacking context)
  if (typeof document !== "undefined") {
    return createPortal(dialogContent, document.body);
  }
  return dialogContent;
}
