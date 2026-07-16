"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, apiRequest, timeAgo } from "@/lib/utils";
import { getPlatformIcon, getPlatformColor } from "@/components/PlatformIcons";
import type { BrowserProfileData, Platform } from "@ai-sales-os/shared";

export function BrowsersPage() {
  const [profiles, setProfiles] = useState<BrowserProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: "",
    platform: "LINKEDIN" as Platform,
    proxyUrl: "",
  });

  // LinkedIn browser state
  const [liBrowserRunning, setLiBrowserRunning] = useState(false);
  const [liBrowserLoading, setLiBrowserLoading] = useState(false);
  const [liExtracting, setLiExtracting] = useState(false);
  const [liCookieCount, setLiCookieCount] = useState<number | null>(null);
  const [liStatusMsg, setLiStatusMsg] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ profiles: BrowserProfileData[] }>("/browser-profiles");
      setProfiles(data.profiles);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkBrowserStatus = useCallback(async () => {
    try {
      const data = await apiRequest<{ running: boolean }>("/browser/linkedin/status");
      setLiBrowserRunning(data.running);
    } catch {
      setLiBrowserRunning(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    checkBrowserStatus();
    const interval = setInterval(checkBrowserStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchProfiles, checkBrowserStatus]);

  const handleLaunchLinkedIn = async () => {
    setLiBrowserLoading(true);
    setLiStatusMsg(null);
    try {
      const data = await apiRequest<{ message: string }>("/browser/linkedin/launch", {
        method: "POST",
      });
      setLiStatusMsg(data.message);
      setLiBrowserRunning(true);
    } catch (err: any) {
      setLiStatusMsg(err.message || "Failed to launch browser");
    } finally {
      setLiBrowserLoading(false);
    }
  };

  const handleExtractCookies = async () => {
    setLiExtracting(true);
    setLiStatusMsg(null);
    try {
      const data = await apiRequest<{ cookieCount: number; message: string }>("/browser/linkedin/extract", {
        method: "POST",
      });
      setLiCookieCount(data.cookieCount);
      setLiStatusMsg(data.message);
    } catch (err: any) {
      setLiStatusMsg(err.message || "Failed to extract cookies");
    } finally {
      setLiExtracting(false);
    }
  };

  const handleCloseLinkedIn = async () => {
    try {
      await apiRequest("/browser/linkedin/close", { method: "POST" });
      setLiBrowserRunning(false);
      setLiStatusMsg("Browser closed");
    } catch (err: any) {
      setLiStatusMsg(err.message || "Failed to close browser");
    }
  };

  const handleCreate = async () => {
    if (!newProfile.name) return;
    try {
      await apiRequest("/browser-profiles", {
        method: "POST",
        body: JSON.stringify(newProfile),
      });
      await fetchProfiles();
      setShowNew(false);
      setNewProfile({ name: "", platform: "LINKEDIN", proxyUrl: "" });
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const handleReset = async (id: string) => {
    if (!confirm("Reset this browser profile? This will clear all cookies and session data.")) return;
    try {
      await apiRequest(`/browser-profiles/${id}/reset`, { method: "POST" });
      await fetchProfiles();
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  const handleOpen = async (profile: BrowserProfileData) => {
    try {
      await apiRequest(`/browser-profiles/${profile.id}/launch`, { method: "POST" });
      await fetchProfiles();
    } catch (err) {
      console.error("Launch failed:", err);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="h-2 w-2 rounded-full bg-green-500" />;
      case "INACTIVE":
        return <span className="h-2 w-2 rounded-full bg-gray-400" />;
      case "ERROR":
        return <span className="h-2 w-2 rounded-full bg-red-500" />;
      case "CREATING":
        return <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
      default:
        return <span className="h-2 w-2 rounded-full bg-gray-400" />;
    }
  };

  return (
    <div className="page-shell">
      {/* LinkedIn Quick Login */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            {getPlatformIcon("LINKEDIN", { size: 28, className: "text-white" })}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">LinkedIn Login</h2>
            <p className="text-blue-100 text-sm">
              Opens an isolated browser. Log in once, cookies are extracted automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!liBrowserRunning ? (
              <button
                onClick={handleLaunchLinkedIn}
                disabled={liBrowserLoading}
                className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {liBrowserLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                )}
                Launch Browser
              </button>
            ) : (
              <>
                <button
                  onClick={handleExtractCookies}
                  disabled={liExtracting}
                  className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {liExtracting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                  )}
                  {liExtracting ? "Extracting..." : "Extract Cookies"}
                </button>
                <button
                  onClick={handleCloseLinkedIn}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full",
              liBrowserRunning ? "bg-green-400 animate-pulse" : "bg-white/40"
            )} />
            <span className="text-blue-100">
              {liBrowserRunning ? "Browser running" : "Browser closed"}
            </span>
          </div>
          {liCookieCount !== null && (
            <div className="flex items-center gap-1.5 text-blue-100">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              {liCookieCount} cookies saved
            </div>
          )}
          {liStatusMsg && (
            <span className="text-blue-200 text-xs italic">{liStatusMsg}</span>
          )}
        </div>

        {/* Instructions */}
        {!liBrowserRunning && liCookieCount === null && (
          <div className="mt-3 bg-white/10 rounded-lg p-3 text-xs text-blue-100 space-y-1">
            <p className="font-medium text-white/90">How it works:</p>
            <p>1. Click &quot;Launch Browser&quot; &rarr; Edge opens with LinkedIn login page</p>
            <p>2. Log in to your LinkedIn account in that browser (separate from your main browser)</p>
            <p>3. Come back and click &quot;Extract Cookies&quot; &rarr; cookies are saved for inbox sync</p>
          </div>
        )}
      </div>

      {/* Browser Profiles */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browser Profiles</h1>
          <p className="text-sm text-gray-500">
            Isolated browser profiles for each connected account
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Profile
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No browser profiles</h3>
          <p className="mt-1 text-sm text-gray-500">Create a profile to start automating</p>
          <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-4">
            New Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: getPlatformColor(profile.platform) }}
                  >
                    {getPlatformIcon(profile.platform, { size: 20 })}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{profile.name}</h3>
                    <p className="text-xs text-gray-500">{profile.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusIcon(profile.status)}
                  <span className="text-xs text-gray-500">{profile.status}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-500">
                {profile.proxyUrl && (
                  <div className="flex justify-between">
                    <span>Proxy</span>
                    <span className="font-medium text-gray-700 truncate ml-2 max-w-[150px]">{profile.proxyUrl}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Crashes</span>
                  <span className={cn("font-medium", profile.crashCount > 0 ? "text-red-600" : "text-gray-700")}>
                    {profile.crashCount}
                  </span>
                </div>
                {profile.lastHealthCheck && (
                  <div className="flex justify-between">
                    <span>Last Check</span>
                    <span className="font-medium text-gray-700">{timeAgo(profile.lastHealthCheck)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleOpen(profile)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleReset(profile.id)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Browser Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Profile Name</label>
                <input
                  type="text"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-1"
                  placeholder="e.g., LinkedIn Account 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Platform</label>
                <div className="mt-1 flex gap-2">
                  {(["LINKEDIN", "FACEBOOK", "TWITTER", "THREADS", "PEOPLEPERHOUR"] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewProfile({ ...newProfile, platform: p })}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                        newProfile.platform === p
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {getPlatformIcon(p, { size: 14 })}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Proxy URL (optional)</label>
                <input
                  type="text"
                  value={newProfile.proxyUrl}
                  onChange={(e) => setNewProfile({ ...newProfile, proxyUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-1"
                  placeholder="http://user:pass@host:port"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
