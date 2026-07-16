"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn, apiRequest, getInitials, timeAgo, truncate } from "@/lib/utils";
import { getPlatformIcon, getPlatformColor } from "@/components/PlatformIcons";
import type { ConversationData, MessageData, ConversationStatus } from "@ai-sales-os/shared";

export function InboxPage() {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.set("platform", platformFilter);
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiRequest<{ conversations: ConversationData[] }>(`/conversations?${params}`);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("[Inbox] Failed to fetch conversations:", err);
      setError(err instanceof Error ? err.message : "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const selectConversation = async (conv: ConversationData) => {
    setSelectedConversation(conv);
    setAiSummary(null);
    try {
      const data = await apiRequest<{ messages: MessageData[] }>(`/conversations/${conv.id}`);
      setMessages(data.messages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("[Inbox] Failed to load messages:", err);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      const msg = await apiRequest<MessageData>(`/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage, contentType: "TEXT" }),
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const data = await apiRequest<{ results: { platform: string; conversations: number; error?: string }[] }>("/inbox/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const summary = data.results
        .map((r) => r.error ? `${r.platform}: ${r.error}` : `${r.platform}: ${r.conversations} conversations`)
        .join("\n");
      setSyncResult(summary || "No platforms to sync");
      await fetchConversations();
      if (!summary.includes("Error") && !summary.includes("error")) {
        setTimeout(() => setSyncResult(null), 8000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setSyncResult(msg);
      console.error("[Sync]", msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleAiDraft = async () => {
    if (!selectedConversation) return;
    setAiDrafting(true);
    try {
      const data = await apiRequest<{ body: string }>(`/ai/draft`, {
        method: "POST",
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          leadId: selectedConversation.leadId,
        }),
      });
      setNewMessage(data.body);
    } catch (err) {
      console.error("AI draft failed:", err);
    } finally {
      setAiDrafting(false);
    }
  };

  const handleAiSummarize = async () => {
    if (!selectedConversation) return;
    try {
      const data = await apiRequest<{ summary: string }>(`/ai/summarize`, {
        method: "POST",
        body: JSON.stringify({ conversationId: selectedConversation.id }),
      });
      setAiSummary(data.summary);
    } catch (err) {
      console.error("AI summarize failed:", err);
    }
  };

  return (
    <div className="flex h-full min-h-[600px] flex-col md:flex-row">
      <div className={cn("w-full flex-col border-r border-gray-200 md:w-80", selectedConversation ? "hidden md:flex" : "flex")}>
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {syncing ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Sync Now
                </>
              )}
            </button>
          </div>
          {syncResult && (
            <div className={`text-xs rounded-lg px-3 py-2 mb-3 whitespace-pre-line ${
              syncResult.includes("Error") || syncResult.includes("error") || syncResult.includes("failed")
                ? "text-red-700 bg-red-50 border border-red-200"
                : "text-green-700 bg-green-50 border border-green-200"
            }`}>
              {syncResult}
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Platforms</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="TWITTER">Twitter</option>
              <option value="THREADS">Threads</option>
              <option value="EMAIL">Email</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3 p-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="mt-1 h-3 w-40 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button onClick={fetchConversations} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Connect a platform in Settings, then click Sync Now</p>
              <div className="mt-3 flex gap-2">
                <a
                  href="/settings"
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Settings
                </a>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-blue-50"
                  )}
                >
                  <div className="relative">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: getPlatformColor(conv.platform) }}
                    >
                      {conv.lead ? getInitials(conv.lead.firstName, conv.lead.lastName) : getPlatformIcon(conv.platform, { size: 16 })}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conv.lead ? `${conv.lead.firstName} ${conv.lead.lastName}` : conv.subject || "Unknown"}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.lastMessagePreview || "No messages yet"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ backgroundColor: getPlatformColor(conv.platform) + "20", color: getPlatformColor(conv.platform) }}
                      >
                        {getPlatformIcon(conv.platform, { size: 10 })}
                        {conv.platform}
                      </span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        conv.status === "OPEN" && "bg-green-100 text-green-700",
                        conv.status === "PENDING" && "bg-yellow-100 text-yellow-700",
                        conv.status === "RESOLVED" && "bg-gray-100 text-gray-600"
                      )}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConversation(null)} className="rounded-lg border p-2 md:hidden" aria-label="Back to conversations">←</button>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: getPlatformColor(selectedConversation.platform) }}
                >
                  {selectedConversation.lead
                    ? getInitials(selectedConversation.lead.firstName, selectedConversation.lead.lastName)
                    : getPlatformIcon(selectedConversation.platform, { size: 16 })}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.lead
                      ? `${selectedConversation.lead.firstName} ${selectedConversation.lead.lastName}`
                      : selectedConversation.subject || "Unknown"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.platform} · {selectedConversation.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleAiSummarize} className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI Summary
                </button>
                <select
                  value={selectedConversation.status}
                  onChange={async (e) => {
                    await apiRequest(`/conversations/${selectedConversation.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: e.target.value }),
                    });
                    setSelectedConversation({ ...selectedConversation, status: e.target.value as ConversationStatus });
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {aiSummary && (
              <div className="mx-4 mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span className="text-xs font-medium text-purple-700">AI Summary</span>
                  <button onClick={() => setAiSummary(null)} className="ml-auto text-purple-400 hover:text-purple-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-purple-900">{aiSummary}</p>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.senderType === "AGENT" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2",
                      msg.senderType === "AGENT"
                        ? "bg-blue-600 text-white"
                        : msg.senderType === "BOT"
                        ? "bg-purple-100 text-purple-900"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    {msg.isAiGenerated && (
                      <span className="text-[10px] opacity-70 block mb-1 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        AI Generated
                      </span>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.senderType === "AGENT" ? "text-blue-200" : "text-gray-400"
                    )}>
                      {timeAgo(msg.sentAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleAiDraft}
                    disabled={aiDrafting}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    title="AI Draft Reply"
                  >
                    {aiDrafting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Unified Inbox</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              All your conversations from LinkedIn, Facebook, Twitter, Threads, and more — in one place.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
