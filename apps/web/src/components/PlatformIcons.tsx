"use client";

import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export function LinkedInIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export function FacebookIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function TwitterIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export function ThreadsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-4.082 5.072-.036 0-.073 0-.11-.002-2.724-.164-4.744-1.594-5.167-3.698-.276-1.36.103-2.756 1.073-3.87 1.168-1.34 3.097-2.122 5.178-2.163.69-.014 1.387.027 2.08.121-.07-.448-.198-.856-.383-1.224-.49-.98-1.388-1.47-2.49-1.47h-.06c-1.547.014-2.783.498-3.637 1.43L9.636 5.14c1.226-1.35 3.035-2.097 5.167-2.14h.086c1.93.036 3.597.714 4.932 2.01 1.204 1.174 1.966 2.76 2.27 4.714.974-.244 1.89-.364 2.733-.364.52 0 1.016.04 1.484.122-.147-.958-.502-1.778-1.06-2.443-.87-1.036-2.137-1.592-3.758-1.655l-.026-.001c-1.56-.024-2.91.482-4.005 1.497-1.075.997-1.69 2.38-1.83 4.122l2.05-.565c.098-1.2.563-2.162 1.386-2.86.867-.734 2.01-1.134 3.397-1.178l.025.001c1.457.024 2.567.493 3.372 1.44.678.793 1.11 1.824 1.283 3.072.34.15.65.322.928.516.74.516 1.273 1.174 1.582 1.957.517 1.294.445 3.018-.704 4.807C18.84 22.144 16.22 23.18 12.186 24zM12 8.115c-2.353.042-4.126 1.052-4.747 2.765-.396 1.098-.184 2.35.576 3.383.81 1.094 2.344 1.782 4.317 1.896.038.002.075.003.113.003 1.89 0 3.298-.879 3.84-2.33.318-.848.388-1.832.206-2.894-.06-.354-.163-.687-.306-.998-.284-.62-.719-1.128-1.29-1.504-.706-.467-1.57-.72-2.572-.752-.034-.001-.068-.002-.102-.003l-.035.001z"/>
    </svg>
  );
}

export function PeoplePerHourIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-1 5v10h2V7h-2zm-3 3v4h2v-4H8zm6 0v4h2v-4h-2z"/>
    </svg>
  );
}

export function EmailIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function WebsiteIcon({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function getPlatformIcon(platform: string, props?: IconProps) {
  const icons: Record<string, React.FC<IconProps>> = {
    LINKEDIN: LinkedInIcon,
    FACEBOOK: FacebookIcon,
    TWITTER: TwitterIcon,
    THREADS: ThreadsIcon,
    PEOPLEPERHOUR: PeoplePerHourIcon,
    EMAIL: EmailIcon,
    WEBSITE: WebsiteIcon,
  };
  const Icon = icons[platform] || WebsiteIcon;
  return <Icon {...props} />;
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    LINKEDIN: "#0a66c2",
    FACEBOOK: "#1877f2",
    TWITTER: "#000000",
    THREADS: "#000000",
    PEOPLEPERHOUR: "#29ABE2",
    EMAIL: "#ea4335",
    WEBSITE: "#6b7280",
    MANUAL: "#9ca3af",
  };
  return colors[platform] || "#6b7280";
}

export function getPlatformBg(platform: string): string {
  const bgs: Record<string, string> = {
    LINKEDIN: "bg-[#0a66c2]",
    FACEBOOK: "bg-[#1877f2]",
    TWITTER: "bg-black",
    THREADS: "bg-black",
    PEOPLEPERHOUR: "bg-[#29ABE2]",
    EMAIL: "bg-[#ea4335]",
    WEBSITE: "bg-gray-500",
  };
  return bgs[platform] || "bg-gray-500";
}
