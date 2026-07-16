"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, apiRequest, formatCurrency, getInitials, getPlatformColor } from "@/lib/utils";
import { getPlatformIcon } from "@/components/PlatformIcons";
import type { DealData, DealStage } from "@ai-sales-os/shared";

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "QUALIFICATION", label: "Qualification", color: "#6366f1" },
  { key: "NEEDS_ANALYSIS", label: "Needs Analysis", color: "#8b5cf6" },
  { key: "PROPOSAL", label: "Proposal", color: "#a855f7" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#d946ef" },
  { key: "CLOSED_WON", label: "Closed Won", color: "#22c55e" },
  { key: "CLOSED_LOST", label: "Closed Lost", color: "#ef4444" },
];

export function CrmPage() {
  const [deals, setDeals] = useState<DealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<DealData | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: "", value: "", contactId: "", leadId: "" });

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ deals: DealData[] }>("/deals");
      setDeals(data.deals);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const moveDeal = async (dealId: string, newStage: DealStage) => {
    try {
      await apiRequest(`/deals/${dealId}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: newStage }),
      });
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
      );
    } catch (err) {
      console.error("Move failed:", err);
    }
  };

  const totalByStage = (stage: DealStage) =>
    deals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRM Pipeline</h1>
            <p className="text-sm text-gray-500">
              {deals.length} deals · {formatCurrency(deals.reduce((s, d) => s + d.value, 0))} total value
            </p>
          </div>
          <button onClick={() => setShowNewDeal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Deal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 rounded-lg bg-gray-200 animate-pulse" />
                {[1, 2].map((j) => (
                  <div key={j} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-w-[1100px] grid-cols-6 gap-4 h-full">
            {STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.key);
              return (
                <div key={stage.key} className="flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {stageDeals.length} · {formatCurrency(totalByStage(stage.key))}
                    </span>
                  </div>

                  <div
                    className="flex-1 space-y-2 rounded-xl border-2 border-dashed border-gray-200 p-2 overflow-auto min-h-[200px] bg-gray-50/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dealId = e.dataTransfer.getData("dealId");
                      if (dealId) moveDeal(dealId, stage.key);
                    }}
                  >
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("dealId", deal.id)}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <h4 className="text-sm font-medium text-gray-900 truncate">{deal.title}</h4>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(deal.value)}</p>
                        {deal.contact?.lead && (
                          <div className="mt-2 flex items-center gap-2">
                            <div
                              className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] text-white"
                              style={{ backgroundColor: getPlatformColor(deal.contact.lead.platform) }}
                            >
                              {getPlatformIcon(deal.contact.lead.platform, { size: 10 })}
                            </div>
                            <span className="text-xs text-gray-500">
                              {deal.contact.lead.firstName} {deal.contact.lead.lastName}
                            </span>
                          </div>
                        )}
                        {deal.closeDate && (
                          <p className="mt-1 text-[10px] text-gray-400">
                            Close: {new Date(deal.closeDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedDeal.title}</h2>
              <button onClick={() => setSelectedDeal(null)} className="rounded p-1 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Value</label>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedDeal.value)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Stage</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        moveDeal(selectedDeal.id, s.key);
                        setSelectedDeal({ ...selectedDeal, stage: s.key });
                      }}
                      className={cn(
                        "text-[10px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors",
                        selectedDeal.stage === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {selectedDeal.contact?.lead && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Contact</label>
                  <p className="text-sm text-gray-900">
                    {selectedDeal.contact.lead.firstName} {selectedDeal.contact.lead.lastName}
                    {selectedDeal.contact.lead.company && ` · ${selectedDeal.contact.lead.company}`}
                  </p>
                </div>
              )}
              {selectedDeal.notes && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-700">{selectedDeal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Deal</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-1"
                  placeholder="Deal title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Value</label>
                <input
                  type="number"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-1"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNewDeal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newDeal.title) return;
                  try {
                    await apiRequest("/deals", {
                      method: "POST",
                      body: JSON.stringify({
                        title: newDeal.title,
                        value: parseFloat(newDeal.value) || 0,
                      }),
                    });
                    await fetchDeals();
                    setShowNewDeal(false);
                    setNewDeal({ title: "", value: "", contactId: "", leadId: "" });
                  } catch (err) {
                    console.error("Create failed:", err);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
