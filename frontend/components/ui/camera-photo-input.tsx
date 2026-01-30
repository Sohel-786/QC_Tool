"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Trash2, X, VideoOff } from "lucide-react";

const CAPTURE_JPEG_QUALITY = 0.92;
const MAX_DIMENSION = 1920;

export type CameraPhotoInputProps = {
  /** Current preview URL (existing image or object URL from capture) */
  previewUrl: string | null;
  /** Callback when user captures a photo or removes it */
  onCapture: (file: File | null) => void;
  /** Label above the control */
  label?: string;
  /** Whether a photo is required (e.g. show asterisk) */
  required?: boolean;
  /** Hint text under label */
  hint?: string;
  /** When true, show "Current image" for existing server image (no file) */
  hasExistingImage?: boolean;
  /** Optional class for the container */
  className?: string;
  /** Aspect ratio for preview area: "square" | "video" */
  aspectRatio?: "square" | "video";
  /** When provided, clicking the preview image calls this with the preview URL (e.g. open full screen viewer) */
  onPreviewClick?: (url: string) => void;
};

export function CameraPhotoInput({
  previewUrl,
  onCapture,
  label = "Photo",
  required = false,
  hint,
  hasExistingImage = false,
  className = "",
  aspectRatio = "square",
  onPreviewClick,
}: CameraPhotoInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const openModal = useCallback(() => {
    setCameraError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    stopStream();
    setIsModalOpen(false);
    setIsLoading(false);
    setCameraError(null);
  }, [stopStream]);

  const handleCloseRequest = useCallback(() => {
    if (isLoading) return;
    closeModal();
  }, [isLoading, closeModal]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsLoading(true);
    const video = videoRef.current;
    if (!video) {
      setIsLoading(false);
      return;
    }
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: "environment",
        width: { ideal: MAX_DIMENSION },
        height: { ideal: MAX_DIMENSION },
      },
      audio: false,
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (!isModalOpenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.play().catch(() => {});
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        const msg =
          err.name === "NotAllowedError"
            ? "Camera access was denied. Please allow camera and try again."
            : err.name === "NotFoundError"
              ? "No camera found. Please connect a camera and try again."
              : "Could not access camera. Please check permissions and try again.";
        setCameraError(msg);
      });
    return () => {
      stopStream();
    };
  }, [isModalOpen, stopStream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return;
    let drawW = w;
    let drawH = h;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      if (w > h) {
        drawW = MAX_DIMENSION;
        drawH = Math.round((h * MAX_DIMENSION) / w);
      } else {
        drawH = MAX_DIMENSION;
        drawW = Math.round((w * MAX_DIMENSION) / h);
      }
    }
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, drawW, drawH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        closeModal();
      },
      "image/jpeg",
      CAPTURE_JPEG_QUALITY,
    );
  }, [onCapture, closeModal]);

  const handleRemove = useCallback(() => {
    onCapture(null);
  }, [onCapture]);

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video max-h-48"
      : "aspect-square max-h-[220px]";

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5">
          <span className="text-sm font-semibold text-text">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {hint && <p className="text-xs text-secondary-500 mt-0.5">{hint}</p>}
        </div>
      )}

      {previewUrl ? (
        <div className="flex flex-col gap-2">
          <div
            className={`relative rounded-lg overflow-hidden border border-secondary-200 bg-white flex-shrink-0 ${aspectClass} ${onPreviewClick ? "cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 transition-shadow" : ""}`}
            role={onPreviewClick ? "button" : undefined}
            onClick={() => onPreviewClick?.(previewUrl)}
            title={onPreviewClick ? "View full screen" : undefined}
            tabIndex={onPreviewClick ? 0 : undefined}
            onKeyDown={onPreviewClick ? (e) => e.key === "Enter" && onPreviewClick(previewUrl) : undefined}
          >
            <img
              src={previewUrl}
              alt="Captured preview"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openModal}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Take Photo Again
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="w-full min-h-[200px] rounded-xl border-2 border-dashed border-secondary-300 bg-white hover:border-primary-400 hover:bg-primary-50/40 transition-colors flex flex-col items-center justify-center gap-3 text-secondary-600 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Take photo with camera"
        >
          <div className="rounded-full bg-primary-100 p-4">
            <Camera className="w-10 h-10 text-primary-600" />
          </div>
          <span className="text-sm font-medium">Take Photo</span>
          <span className="text-xs text-secondary-500">
            Use your camera to capture a photo
          </span>
        </button>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <Dialog
        isOpen={isModalOpen}
        onClose={handleCloseRequest}
        title="Take Photo"
        size="xl"
        overlayClassName="z-[110]"
        closeOnBackdropClick={false}
        closeButtonDisabled={isLoading}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary-600">
            Position the item in frame, then click Capture.
          </p>
          <div className="relative rounded-xl overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary-900/80 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
                <span className="sr-only">Starting camera…</span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary-900/95 text-white p-4 z-10">
                <VideoOff className="w-12 h-12 text-red-300" />
                <p className="text-sm text-center max-w-sm">{cameraError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCameraError(null);
                    setIsLoading(true);
                    navigator.mediaDevices
                      .getUserMedia({ video: true, audio: false })
                      .then((stream) => {
                        if (!isModalOpenRef.current) {
                          stream.getTracks().forEach((t) => t.stop());
                          return;
                        }
                        streamRef.current = stream;
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          videoRef.current.play().catch(() => {});
                        }
                        setIsLoading(false);
                      })
                      .catch((err) => {
                        setIsLoading(false);
                        setCameraError(
                          err.name === "NotAllowedError"
                            ? "Camera access was denied."
                            : "Could not access camera.",
                        );
                      });
                  }}
                  className="border-white/50 text-white hover:bg-white/10"
                >
                  Try again
                </Button>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[70vh] object-contain"
              style={{ display: cameraError || isLoading ? "none" : "block" }}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRequest}
              disabled={isLoading}
              title={isLoading ? "Please wait for camera to load" : undefined}
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={!!cameraError || isLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Capture
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
