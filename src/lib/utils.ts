import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * crypto.randomUUID() is only available in secure contexts (HTTPS/localhost).
 * On plain-HTTP origins (e.g. http://<server-ip>:3000) fall back to a
 * Math.random-based UUID v4 so the app doesn't crash.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a displayable URL for a stored image. In-memory previews
 * (blob:/data: URLs from a fresh scan) are used as-is; persisted paths
 * (/uploads/... or COS URLs) go through the server-side proxy, which can
 * read private COS buckets that a browser <img> tag cannot.
 */
export function imageSrc(src: string): string {
  if (!src || /^(blob:|data:)/i.test(src)) return src;
  return `/api/image?src=${encodeURIComponent(src)}`;
}
