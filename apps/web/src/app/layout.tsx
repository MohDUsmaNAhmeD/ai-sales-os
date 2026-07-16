import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Sales OS", template: "%s · Sales OS" },
  description: "Unified AI sales operations for lead discovery, conversations, pipeline, and outreach.",
};

export const viewport: Viewport = {
  themeColor: "#101827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} h-dvh overflow-hidden font-sans`}>
        <div className="flex h-full bg-background">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto pt-16 md:pt-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
