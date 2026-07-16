"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn, apiRequest, getInitials, timeAgo, truncate, parseTags } from "@/lib/utils";
import { getPlatformIcon, getPlatformColor } from "@/components/PlatformIcons";
import type { LeadData, Platform, LeadStatus } from "@ai-sales-os/shared";

const PLATFORMS: Platform[] = ["LINKEDIN", "FACEBOOK", "TWITTER", "THREADS", "PEOPLEPERHOUR"];
const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSED", "NEGOTIATION", "WON", "LOST"];

export function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryPlatform, setDiscoveryPlatform] = useState<Platform>("LINKEDIN");
  const [discovering, setDiscovering] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (platformFilter) params.set("platform", platformFilter);
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiRequest<{ leads: LeadData[] }>(`/leads?${params}`);
      setLeads(data.leads || []);
    } catch (err) {
      console.error("[Leads] Failed to fetch leads:", err);
      setError(err instanceof Error ? err.message : "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search, platformFilter, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDiscover = async () => {
    if (!discoveryQuery.trim()) return;
    setDiscovering(true);
    try {
      const result = await apiRequest<{ success?: boolean; leadsFound?: number; error?: string }>(`/discovery/search`, {
        method: "POST",
        body: JSON.stringify({
          query: discoveryQuery,
          platform: discoveryPlatform,
        }),
      });
      if (result.error) {
        console.error("[Discovery]", result.error);
        alert(`Discovery failed: ${result.error}`);
      }
      await fetchLeads();
      setShowDiscovery(false);
      setDiscoveryQuery("");
    } catch (err) {
      console.error("[Discovery] Failed:", err);
      alert(`Discovery failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<LeadData>) => {
    try {
      await apiRequest(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await fetchLeads();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleStartConversation = async (lead: LeadData) => {
    try {
      const conv = await apiRequest<any>("/conversations", {
        method: "POST",
        body: JSON.stringify({
          leadId: lead.id,
          platform: lead.platform,
          subject: `Conversation with ${lead.firstName} ${lead.lastName}`,
        }),
      });
      router.push("/inbox");
    } catch (err) {
      console.error("Create conversation failed:", err);
    }
  };

  const handleAddToCampaign = async (lead: LeadData) => {
    try {
      const data = await apiRequest<{ campaigns: any[] }>("/campaigns");
      setCampaigns(data.campaigns);
      setShowCampaignModal(true);
    } catch (err) {
      console.error("Fetch campaigns failed:", err);
    }
  };

  const handleScoreLead = async (lead: LeadData) => {
    try {
      const result = await apiRequest<{ score: number; reason: string }>("/ai/score", {
        method: "POST",
        body: JSON.stringify({ leadId: lead.id }),
      });
      setSelectedLead({ ...lead, score: result.score, aiSummary: result.reason });
      await fetchLeads();
    } catch (err) {
      console.error("Score failed:", err);
    }
  };

  return (
    <div className="flex h-full min-h-[600px] flex-col xl:flex-row">
      <div className={cn("flex-1 flex-col border-r border-gray-200", selectedLead ? "hidden xl:flex" : "flex")}>
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leads</h1>
              <p className="text-sm text-gray-500">{leads.length} leads found</p>
            </div>
            <button onClick={() => setShowDiscovery(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Discover Leads
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                      <div className="mt-1 h-3 w-48 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-red-900">Error loading leads</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button onClick={fetchLeads} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Retry
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or discover new leads</p>
              <button onClick={() => setShowDiscovery(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-4">
                Discover Leads
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={cn(
                    "flex w-full items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors",
                    selectedLead?.id === lead.id && "bg-blue-50"
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: getPlatformColor(lead.platform) }}
                  >
                    {lead.avatarUrl ? (
                      <img src={lead.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(lead.firstName, lead.lastName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: getPlatformColor(lead.platform) + "20", color: getPlatformColor(lead.platform) }}
                      >
                        {getPlatformIcon(lead.platform, { size: 12, className: "inline mr-1" })}
                        {lead.platform}
                      </span>
                      {lead.score > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          Score: {lead.score}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.jobTitle && `${lead.jobTitle}`}
                      {lead.company && ` at ${lead.company}`}
                      {!lead.jobTitle && !lead.company && (lead.email || "No details")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      lead.status === "NEW" && "bg-blue-50 text-blue-700",
                      lead.status === "CONTACTED" && "bg-yellow-50 text-yellow-700",
                      lead.status === "QUALIFIED" && "bg-green-50 text-green-700",
                      lead.status === "WON" && "bg-green-50 text-green-700",
                      lead.status === "LOST" && "bg-red-50 text-red-700",
                      !["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].includes(lead.status) && "bg-gray-50 text-gray-600"
                    )}>
                      {lead.status.replace(/_/g, " ")}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(lead.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <div className="flex w-full flex-col bg-white xl:w-[480px]">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900">Lead Details</h2>
            <button onClick={() => setSelectedLead(null)} className="rounded p-1 hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-bold"
                style={{ backgroundColor: getPlatformColor(selectedLead.platform) }}
              >
                {getInitials(selectedLead.firstName, selectedLead.lastName)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedLead.firstName} {selectedLead.lastName}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedLead.jobTitle}
                  {selectedLead.company && ` at ${selectedLead.company}`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedLead.email && (
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{selectedLead.email}</p>
                  </div>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{selectedLead.phone}</p>
                  </div>
                </div>
              )}
              {selectedLead.location && (
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-gray-900">{selectedLead.location}</p>
                  </div>
                </div>
              )}
              {selectedLead.profileUrl && (
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Profile</p>
                    <a href={selectedLead.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {truncate(selectedLead.profileUrl, 40)}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {selectedLead.bio && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bio</label>
                <p className="mt-1 text-sm text-gray-700">{selectedLead.bio}</p>
              </div>
            )}

            {selectedLead.aiSummary && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <label className="text-xs font-medium text-purple-700 uppercase tracking-wide">AI Summary</label>
                </div>
                <p className="text-sm text-purple-900">{selectedLead.aiSummary}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateLead(selectedLead.id, { status: s })}
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors",
                      selectedLead.status === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {parseTags(selectedLead.tags).length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {parseTags(selectedLead.tags).map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4 flex gap-2">
            <button onClick={() => handleStartConversation(selectedLead)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Start Conversation
            </button>
            <button onClick={() => handleAddToCampaign(selectedLead)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Add to Campaign
            </button>
            <button onClick={() => handleScoreLead(selectedLead)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              AI Score
            </button>
          </div>
        </div>
      )}

      {showDiscovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Discover Leads</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Platform</label>
                <div className="mt-1 flex gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setDiscoveryPlatform(p)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                        discoveryPlatform === p
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
                <label className="text-sm font-medium text-gray-700">Search Query</label>
                <input
                  type="text"
                  value={discoveryQuery}
                  onChange={(e) => setDiscoveryQuery(e.target.value)}
                  placeholder={`Search ${discoveryPlatform} for leads...`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-1"
                  onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowDiscovery(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleDiscover} disabled={discovering} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {discovering ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add to Campaign</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add <strong>{selectedLead?.firstName} {selectedLead?.lastName}</strong> to a campaign:
            </p>
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-500">No campaigns yet. Create one first.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={async () => {
                      try {
                        await apiRequest(`/campaigns/${c.id}/leads`, {
                          method: "POST",
                          body: JSON.stringify({ leadId: selectedLead?.id }),
                        });
                        setShowCampaignModal(false);
                      } catch (err) {
                        console.error("Add to campaign failed:", err);
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.status}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowCampaignModal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
