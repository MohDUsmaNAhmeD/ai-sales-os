import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    LINKEDIN: "#0a66c2",
    FACEBOOK: "#1877f2",
    TWITTER: "#1da1f2",
    THREADS: "#000000",
    PEOPLEPERHOUR: "#29ABE2",
    EMAIL: "#ea4335",
    WEBSITE: "#6b7280",
    MANUAL: "#9ca3af",
  };
  return colors[platform] ?? "#6b7280";
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    LINKEDIN: "in",
    FACEBOOK: "f",
    TWITTER: "𝕏",
    THREADS: "@",
    PEOPLEPERHOUR: "P",
    EMAIL: "✉",
    WEB: "🌐",
    MANUAL: "+",
  };
  return icons[platform] ?? "•";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
