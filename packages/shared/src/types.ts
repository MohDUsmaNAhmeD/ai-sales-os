export type Platform = "LINKEDIN" | "FACEBOOK" | "TWITTER" | "THREADS" | "PEOPLEPERHOUR" | "EMAIL" | "WEBSITE" | "MANUAL";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSED" | "NEGOTIATION" | "WON" | "LOST" | "ARCHIVED";

export type DealStage = "QUALIFICATION" | "NEEDS_ANALYSIS" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";

export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED" | "SPAM";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "COMPLETED";

export interface LeadData {
  id: string;
  externalId?: string | null;
  platform: Platform;
  status: LeadStatus;
  score: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  aiSummary?: string | null;
  aiScoreReason?: string | null;
  source?: string | null;
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationData {
  id: string;
  externalId?: string | null;
  platform: Platform;
  subject?: string | null;
  status: ConversationStatus;
  priority: string;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  leadId?: string | null;
  tags: string[];
  messages?: MessageData[];
  lead?: LeadData;
}

export interface MessageData {
  id: string;
  externalId?: string | null;
  conversationId: string;
  senderType: "AGENT" | "CONTACT" | "BOT" | "SYSTEM";
  senderId?: string | null;
  content: string;
  contentType: string;
  attachments: unknown[];
  isDraft: boolean;
  isAiGenerated: boolean;
  sentAt: Date;
}

export interface DealData {
  id: string;
  contactId: string;
  leadId: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  closeDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  contact?: {
    id: string;
    lead?: LeadData;
  };
}

export interface ActivityData {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  userId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CampaignData {
  id: string;
  name: string;
  template: string;
  platform?: Platform | null;
  status: CampaignStatus;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  createdAt: Date;
}

export interface BrowserProfileData {
  id: string;
  name: string;
  platform: Platform;
  profilePath: string;
  proxyUrl?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ERROR" | "CREATING" | "RESETTING";
  lastHealthCheck?: Date | null;
  crashCount: number;
}

export interface JobData {
  id: string;
  type: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRYING" | "CANCELLED";
  payload: Record<string, unknown>;
  result?: unknown;
  error?: string | null;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  createdAt: Date;
}

export interface HealthData {
  component: string;
  status: string;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  activeJobs?: number | null;
  queueDepth?: number | null;
  errorRate?: number | null;
  responseTimeMs?: number | null;
  checkedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchResult {
  leads: LeadData[];
  total: number;
  query: string;
  platform: Platform;
}

export interface AIInsight {
  type: "SCORE" | "SUMMARY" | "SUGGESTION" | "INTENT" | "FOLLOW_UP";
  content: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface OutreachDraft {
  subject?: string;
  body: string;
  platform: Platform;
  tone: "professional" | "casual" | "friendly" | "formal";
  followUpIn?: number; // days
}

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisWeek: number;
  activeConversations: number;
  openDeals: number;
  dealValue: number;
  responseRate: number;
  avgResponseTime: number;
  conversionRate: number;
}

export interface WorkerStatus {
  id: string;
  type: string;
  status: string;
  startedAt?: Date;
  lastHeartbeat?: Date;
  processedCount: number;
  errorCount: number;
}
