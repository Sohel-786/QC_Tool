/**
 * Avatar presets from public/avatar/ (served at /avatar/).
 * Add new filenames here when you add more SVGs to frontend/public/avatar/.
 */
export const AVATAR_OPTIONS: string[] = [
  "first_avatar.svg",
  "second_avatar.svg",
  "third_avatar.svg",
];

/** Base path for preset avatars (public/avatar → /avatar). */
export const AVATAR_PRESETS_PATH = "/avatar";

/** Default avatar image (used when user has no avatar selected) – root assets. */
export const DEFAULT_AVATAR_PATH = "/assets/avatar.jpg";

export const FALLBACK_AVATAR_PATH = DEFAULT_AVATAR_PATH;

/**
 * Resolves the image URL for a stored avatar filename.
 * Preset avatars (from public/avatar) use /avatar/; legacy use /assets/avatar/.
 */
export function getAvatarUrl(avatar: string | null | undefined): string {
  if (!avatar) return FALLBACK_AVATAR_PATH;
  if (AVATAR_OPTIONS.includes(avatar)) return `${AVATAR_PRESETS_PATH}/${avatar}`;
  return `/assets/avatar/${avatar}`;
}
