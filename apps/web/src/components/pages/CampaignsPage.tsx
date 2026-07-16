"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, apiRequest, timeAgo } from "@/lib/utils";
import { getPlatformIcon, getPlatformColor } from "@/components/PlatformIcons";
import type { CampaignData, Platform } from "@ai-sales-os/shared";

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    template: "",
    platform: "" as Platform | "",
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ campaigns: CampaignData[] }>("/campaigns");
      setCampaigns(data.campaigns);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.template) return;
    try {
      await apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: newCampaign.name,
          template: newCampaign.template,
          platform: newCampaign.platform || undefined,
        }),
      });
      await fetchCampaigns();
      setShowNew(false);
      setNewCampaign({ name: "", template: "", platform: "" });
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "badge-gray",
      SCHEDULED: "badge-yellow",
      SENDING: "badge-blue",
      SENT: "badge-green",
      PAUSED: "badge-yellow",
      COMPLETED: "badge-green",
    };
    return colors[status] || "badge-gray";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="text-sm text-gray-500">Manage AI-assisted outreach at scale</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          + New Campaign
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-64 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first outreach campaign</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">
            + New Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <span className={statusColor(campaign.status)}>{campaign.status}</span>
                    {campaign.platform && (
                      <span className="badge-blue text-xs">{campaign.platform}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-1">{campaign.template}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Created {timeAgo(campaign.createdAt)}</p>
                  {campaign.sentAt && (
                    <p className="text-xs text-green-600">Sent {timeAgo(campaign.sentAt)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-lg p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g., Q1 LinkedIn Outreach"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Platform (optional)</label>
                <select
                  value={newCampaign.platform}
                  onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value as Platform | "" })}
                  className="input mt-1"
                >
                  <option value="">All Platforms</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="TWITTER">Twitter</option>
                  <option value="THREADS">Threads</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message Template</label>
                <textarea
                  value={newCampaign.template}
                  onChange={(e) => setNewCampaign({ ...newCampaign, template: e.target.value })}
                  className="input mt-1"
                  rows={5}
                  placeholder="Hi {{firstName}}, I noticed you're working at {{company}}..."
                />
                <p className="mt-1 text-xs text-gray-400">
                  Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{company}}"}, {"{{jobTitle}}"} for personalization
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
