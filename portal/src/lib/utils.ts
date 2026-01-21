import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp to a human-readable relative time string
 */
export function formatDistanceToNow(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  } else {
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }
}

/**
 * Format a future timestamp to a human-readable relative time string
 */
export function formatDistanceToFuture(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) {
    return formatDistanceToNow(timestamp);
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) {
    return "in a few seconds";
  } else if (minutes < 60) {
    return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (hours < 24) {
    return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (days < 7) {
    return `in ${days} day${days !== 1 ? "s" : ""}`;
  } else if (weeks < 4) {
    return `in ${weeks} week${weeks !== 1 ? "s" : ""}`;
  } else {
    return `in ${months} month${months !== 1 ? "s" : ""}`;
  }
}

/**
 * Format a date to a locale string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
