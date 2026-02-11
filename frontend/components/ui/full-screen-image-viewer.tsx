"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./button";
import { registerDialog, isTopDialog } from "@/lib/dialog-stack";
import { cn } from "@/lib/utils";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

export interface FullScreenImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  alt?: string;
}

export function FullScreenImageViewer({
  isOpen,
  onClose,
  imageSrc,
  alt = "Image",
}: FullScreenImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_LEVELS.find((level) => level > z) ?? MAX_ZOOM;
      return Math.min(next, MAX_ZOOM);
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_LEVELS].reverse().find((level) => level < z) ?? MIN_ZOOM;
      return Math.max(prev, MIN_ZOOM);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeFn = () => onClose();
    const cleanup = registerDialog(closeFn);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTopDialog(closeFn)) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cleanup();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setZoom(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const viewerContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Full screen image view"
    >
      {/* Top bar: zoom controls left, close right */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="text-white hover:bg-white/20 disabled:opacity-40"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-white text-sm font-medium min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="text-white hover:bg-white/20 disabled:opacity-40"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          title="Close"
          aria-label="Close full screen"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Image area: scrollable, centered */}
      <div
        className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={alt}
            className={cn("object-contain transition-transform duration-150 select-none")}
            style={{ transform: `scale(${zoom})`, maxWidth: "100%", maxHeight: "100%" }}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
