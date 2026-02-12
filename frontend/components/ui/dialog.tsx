"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { registerDialog, isTopDialog, getOpenDialogCount } from "@/lib/dialog-stack";

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
  /** When true, the default header (title and X button) is hidden */
  hideHeader?: boolean;
  /** Custom class for the dialog container */
  className?: string;
}

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
  hideHeader = false,
  className,
}: DialogProps) {
  // Store the element that had focus before the dialog opened
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Keep onCloseRef up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle focus storage and return only on open/close transitions
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // When closing, return focus to previous element if it still exists
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        // Small delay to ensure the dialog is gone and no race conditions with other focus events
        const timer = setTimeout(() => {
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // Lock body scroll and handle accessibility event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle ESC key
      if (e.key === "Escape" && !closeButtonDisabled) {
        if (isTopDialog(onCloseRef.current)) {
          onCloseRef.current();
        }
      }

      // Handle Tab key (Focus Wrap)
      if (e.key === "Tab") {
        if (!dialogRef.current) return;

        const focusableElements = Array.from(dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }) as HTMLElement[];

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Tab
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      // Add this dialog to the stack using the utility
      const cleanup = registerDialog(onCloseRef.current);

      // Lock scroll only if it's the first dialog opening
      if (getOpenDialogCount() === 1) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        // Remove from stack
        cleanup();

        // Unlock scroll only if No more dialogs are open
        if (getOpenDialogCount() === 0) {
          document.body.style.overflow = "";
          document.documentElement.style.overflow = "";
        }

        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, closeButtonDisabled]);

  // Handle initial focus only once when dialog opens
  useEffect(() => {
    let focusTimer: NodeJS.Timeout;

    if (isOpen) {
      focusTimer = setTimeout(() => {
        if (dialogRef.current) {
          // Find first focusable element that is NOT the close button in the header
          const focusableElements = Array.from(dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )) as HTMLElement[];

          // Skip header close button if possible
          const firstField = focusableElements.find(el =>
            !el.classList.contains('p-0') &&
            el.getAttribute('title') !== 'Close' &&
            el.tagName !== 'BUTTON' || (el.tagName === 'BUTTON' && !el.querySelector('svg'))
          ) || focusableElements[0];

          firstField?.focus();
        }
      }, 150);
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen]);

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
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              className={cn(
                "bg-white rounded-xl shadow-2xl w-full max-h-[96vh] flex flex-col relative focus:outline-none",
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {!hideHeader && (
                <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                  <h2 id="dialog-title" className="text-xl font-semibold text-text">{title}</h2>
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
              )}

              {hideHeader && !closeButtonDisabled && (
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="absolute top-4 right-4 p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-full transition-all z-[1010]"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

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
