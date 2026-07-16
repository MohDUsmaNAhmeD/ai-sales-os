"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/utils";
import { getPlatformIcon, getPlatformColor, LinkedInIcon, FacebookIcon, TwitterIcon, ThreadsIcon, PeoplePerHourIcon } from "@/components/PlatformIcons";

interface Connector {
  id: string;
  platform: string;
  accessToken: string | null;
  syncStatus: string;
  lastSyncAt: string | null;
  errorCount: number;
}

interface Settings {
  mistralKey: string;
  defaultModel: string;
}

const platforms = [
  { id: "LINKEDIN", name: "LinkedIn", description: "B2B leads, professional networking", icon: LinkedInIcon, color: "#0a66c2" },
  { id: "FACEBOOK", name: "Facebook", description: "Groups, pages, marketplace", icon: FacebookIcon, color: "#1877f2" },
  { id: "TWITTER", name: "Twitter / X", description: "Public conversations, trends", icon: TwitterIcon, color: "#000" },
  { id: "THREADS", name: "Threads", description: "Meta's text-based platform", icon: ThreadsIcon, color: "#000" },
  { id: "PEOPLEPERHOUR", name: "PeoplePerHour", description: "Freelancers, service providers", icon: PeoplePerHourIcon, color: "#29ABE2" },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [cookies, setCookies] = useState("");
  const [showCookieModal, setShowCookieModal] = useState<string | null>(null);

  // Per-platform browser state
  const [browserStates, setBrowserStates] = useState<Record<string, {
    running: boolean;
    loading: boolean;
    extracting: boolean;
    statusMsg: string | null;
  }>>({});

  useEffect(() => {
    Promise.all([
      apiRequest<any>("/settings").catch(() => ({ mistralKey: "", defaultModel: "mistral-large-latest" })),
      apiRequest<{ connectors: Connector[] }>("/connectors").catch(() => ({ connectors: [] })),
    ]).then(([s, c]) => {
      setSettings({ mistralKey: s.mistralKey || "", defaultModel: s.defaultModel || "mistral-large-latest" });
      setConnectors(c.connectors);
    }).finally(() => setLoading(false));

    // Check browser status for all platforms
    platforms.forEach((p) => {
      apiRequest<{ running: boolean }>(`/browser/${p.id.toLowerCase()}/status`)
        .then((d) => updateBrowserState(p.id, { running: d.running, loading: false, extracting: false }))
        .catch(() => updateBrowserState(p.id, { running: false, loading: false, extracting: false }));
    });
  }, []);

  const updateBrowserState = (platform: string, update: Partial<typeof browserStates[string]>) => {
    setBrowserStates((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...update },
    }));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiRequest("/settings", {
        method: "PUT",
        body: JSON.stringify({ mistralKey: settings.mistralKey }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      await apiRequest("/connectors", {
        method: "POST",
        body: JSON.stringify({ platform, accessToken: cookies }),
      });
      const c = await apiRequest<{ connectors: Connector[] }>("/connectors");
      setConnectors(c.connectors);
      setShowCookieModal(null);
      setCookies("");
    } catch (err) {
      console.error("Connect failed:", err);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Disconnect ${platform}? This will stop syncing messages.`)) return;
    try {
      await apiRequest(`/connectors?platform=${platform}`, { method: "DELETE" });
      const c = await apiRequest<{ connectors: Connector[] }>("/connectors");
      setConnectors(c.connectors);
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  const handleLaunchBrowser = async (platform: string) => {
    updateBrowserState(platform, { loading: true, statusMsg: null, extracting: false });
    try {
      const data = await apiRequest<{ message: string }>(`/browser/${platform.toLowerCase()}/launch`, { method: "POST" });
      updateBrowserState(platform, { running: true, loading: false, statusMsg: data.message });
    } catch (err: any) {
      updateBrowserState(platform, { loading: false, statusMsg: err.message || "Failed to launch browser" });
    }
  };

  const handleExtractCookies = async (platform: string) => {
    updateBrowserState(platform, { extracting: true, statusMsg: null });
    try {
      const data = await apiRequest<{ cookieCount: number; message: string }>(`/browser/${platform.toLowerCase()}/extract`, { method: "POST" });
      updateBrowserState(platform, { extracting: false, statusMsg: data.message });
      const c = await apiRequest<{ connectors: Connector[] }>("/connectors");
      setConnectors(c.connectors);
    } catch (err: any) {
      updateBrowserState(platform, { extracting: false, statusMsg: err.message || "Failed to extract cookies" });
    }
  };

  const handleCloseBrowser = async (platform: string) => {
    try {
      await apiRequest(`/browser/${platform.toLowerCase()}/close`, { method: "POST" });
      updateBrowserState(platform, { running: false });
    } catch {}
  };

  const getConnector = (platform: string) => connectors.find((c) => c.platform === platform);

  const getBrowserState = (platform: string) => browserStates[platform] || { running: false, loading: false, extracting: false, statusMsg: null };

  if (loading) {
    return (
      <div className="page-shell max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-60 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your AI Sales OS</p>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mistral AI</h2>
            <p className="text-sm text-gray-500">Powers lead scoring, message drafting, and summaries</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">API Key</label>
            <input
              type="password"
              value={settings?.mistralKey || ""}
              onChange={(e) => setSettings(s => s ? { ...s, mistralKey: e.target.value } : null)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="your-mistral-api-key"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get your key at{" "}
              <a href="https://console.mistral.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                console.mistral.ai
              </a>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Model</label>
            <select
              value={settings?.defaultModel || "mistral-large-latest"}
              onChange={(e) => setSettings(s => s ? { ...s, defaultModel: e.target.value } : null)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="mistral-large-latest">Mistral Large (Best quality)</option>
              <option value="mistral-medium-latest">Mistral Medium (Balanced)</option>
              <option value="mistral-small-latest">Mistral Small (Fastest)</option>
              <option value="open-mixtral-8x22b">Mixtral 8x22B</option>
              <option value="open-mixtral-8x7b">Mixtral 8x7B (Free tier)</option>
            </select>
          </div>
          <button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving..." : saved ? "Saved!" : "Save AI Settings"}
          </button>
        </div>
      </div>

      {/* Connected Platforms */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connected Platforms</h2>
            <p className="text-sm text-gray-500">Connect platforms to discover leads and sync messages</p>
          </div>
        </div>

        <div className="space-y-3">
          {platforms.map((p) => {
            const connector = getConnector(p.id);
            const isConnected = !!connector;
            const bs = getBrowserState(p.id);
            return (
              <div key={p.id} className="flex flex-col gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color }}>
                    <p.icon className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.description}</div>
                    {bs.statusMsg && (
                      <div className="text-xs text-blue-600 mt-1">{bs.statusMsg}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                      <button
                        onClick={() => handleDisconnect(p.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Browser Login */}
                      {!bs.running ? (
                        <button
                          onClick={() => handleLaunchBrowser(p.id)}
                          disabled={bs.loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {bs.loading ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          )}
                          Browser Login
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleExtractCookies(p.id)}
                            disabled={bs.extracting}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {bs.extracting ? "Extracting..." : "Extract Cookies"}
                          </button>
                          <button
                            onClick={() => handleCloseBrowser(p.id)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            Close
                          </button>
                        </>
                      )}
                      {/* Or paste */}
                      <button
                        onClick={() => setShowCookieModal(p.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Paste
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cookie Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: getPlatformColor(showCookieModal) }}>
                {getPlatformIcon(showCookieModal, { className: "text-white", size: 20 })}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connect {showCookieModal}</h3>
                <p className="text-sm text-gray-500">Add browser cookies for better results</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="text-sm text-blue-800 font-medium mb-1">Easiest: Use Browser Login</div>
                <div className="text-xs text-blue-700">
                  Click "Browser Login" above, log into {showCookieModal} in the opened browser, then click "Extract Cookies".
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-2 font-medium">Or paste cookies manually:</div>
              <textarea
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                rows={4}
                placeholder={'Paste cookie string or JSON array from EditThisCookie extension...'}
              />
              <p className="text-xs text-gray-400 mt-1">Get cookies: DevTools (F12) → Console → paste <code className="bg-gray-100 px-1 rounded">copy(document.cookie)</code> → paste here</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowCookieModal(null); setCookies(""); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleConnect(showCookieModal)}
                disabled={connectingPlatform === showCookieModal}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {connectingPlatform === showCookieModal ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
