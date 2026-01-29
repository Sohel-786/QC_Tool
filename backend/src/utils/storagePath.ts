/**
 * Sanitize a serial number (or any string) for use in file system paths.
 * Replaces characters that are invalid in Windows/Unix paths and limits length.
 */
export function sanitizeSerialForPath(serial: string): string {
  if (!serial || typeof serial !== "string") return "unknown";
  const trimmed = serial.trim();
  if (!trimmed) return "unknown";
  const sanitized = trimmed
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const maxLen = 120;
  return sanitized.slice(0, maxLen) || "unknown";
}

/** Base path for item images: items/{serial}/ */
export function getItemImageBasePath(serial: string): string {
  return `items/${sanitizeSerialForPath(serial)}`;
}

/** Item master image path: items/{serial}/master.{ext} */
export function getItemMasterImagePath(serial: string, filename: string): string {
  const base = getItemImageBasePath(serial);
  return `${base}/${filename}`;
}

/** Inward (return) image path: items/{serial}/inward/{filename} */
export function getInwardImagePath(serial: string, filename: string): string {
  const base = getItemImageBasePath(serial);
  return `${base}/inward/${filename}`;
}
