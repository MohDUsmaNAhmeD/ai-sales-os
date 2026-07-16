import { prisma } from "@ai-sales-os/db";
import type { ApiResponse, PaginatedResponse } from "@ai-sales-os/shared";

export async function handleApiError(error: unknown): Promise<ApiResponse> {
  console.error("API Error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return { success: false, error: message };
}

export async function getLeads(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  platform?: string;
  search?: string;
  ownerId?: string;
}) {
  const { page = 1, pageSize = 20, status, platform, search, ownerId } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (ownerId) where.ownerId = ownerId;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { owner: true },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      owner: true,
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      deal: true,
      contact: true,
    },
  });
}

export async function createLead(data: {
  platform: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  profileUrl?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  tags?: string[];
  externalId?: string;
  source?: string;
  ownerId?: string;
}) {
  return prisma.lead.create({
    data: {
      platform: data.platform as never,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      profileUrl: data.profileUrl,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      location: data.location,
      tags: JSON.stringify(data.tags ?? []),
      externalId: data.externalId,
      source: data.source,
      ownerId: data.ownerId,
    },
  });
}

export async function updateLead(id: string, data: Record<string, unknown>) {
  return prisma.lead.update({ where: { id }, data });
}

export async function getConversations(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  platform?: string;
  leadId?: string;
}) {
  const { page = 1, pageSize = 20, status, platform, leadId } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (leadId) where.leadId = leadId;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: pageSize,
      include: {
        lead: true,
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    conversations,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      lead: true,
      messages: { orderBy: { sentAt: "asc" } },
      assignees: { include: { user: true } },
      participants: true,
    },
  });
}

export async function sendMessage(conversationId: string, data: {
  content: string;
  contentType?: string;
  senderType?: string;
  isDraft?: boolean;
  isAiGenerated?: boolean;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      content: data.content,
      contentType: (data.contentType ?? "TEXT") as never,
      senderType: (data.senderType ?? "AGENT") as never,
      isDraft: data.isDraft ?? false,
      isAiGenerated: data.isAiGenerated ?? false,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: data.content.slice(0, 200),
    },
  });

  return message;
}

export async function getDeals(params: {
  stage?: string;
  page?: number;
  pageSize?: number;
}) {
  const { stage, page = 1, pageSize = 20 } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { contact: { include: { lead: true } } },
    }),
    prisma.deal.count({ where }),
  ]);

  return { deals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getDashboardStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    newLeadsThisWeek,
    activeConversations,
    openDeals,
    dealAgg,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.conversation.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.deal.count({ where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    prisma.deal.aggregate({
      where: { stage: "CLOSED_WON" },
      _sum: { value: true },
    }),
  ]);

  return {
    totalLeads,
    newLeadsThisWeek,
    activeConversations,
    openDeals,
    dealValue: dealAgg._sum.value ?? 0,
    responseRate: 0,
    avgResponseTime: 0,
    conversionRate: 0,
  };
}

export async function getActivities(params: {
  leadId?: string;
  contactId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { leadId, contactId, page = 1, pageSize = 50 } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (leadId) where.leadId = leadId;
  if (contactId) where.contactId = contactId;

  return prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    include: { user: true },
  });
}
