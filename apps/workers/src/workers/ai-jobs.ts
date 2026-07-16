import { prisma } from "@ai-sales-os/db";

interface AIJobData {
  type: "SCORE_LEAD" | "DRAFT_MESSAGE" | "SUMMARIZE_CONVERSATION" | "DETECT_INTENT" | "SUGGEST_FOLLOW_UP";
  leadId?: string;
  conversationId?: string;
  jobId?: string;
}

export async function aiWorker(data: AIJobData) {
  const { type, leadId, conversationId } = data;

  console.log(`[AI] Processing ${type} job`);

  switch (type) {
    case "SCORE_LEAD":
      if (leadId) await scoreLead(leadId);
      break;
    case "DRAFT_MESSAGE":
      if (conversationId) await draftMessage(conversationId);
      break;
    case "SUMMARIZE_CONVERSATION":
      if (conversationId) await summarizeConversation(conversationId);
      break;
    case "DETECT_INTENT":
      if (conversationId) await detectIntent(conversationId);
      break;
    case "SUGGEST_FOLLOW_UP":
      if (leadId) await suggestFollowUp(leadId);
      break;
  }
}

async function scoreLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { conversations: true },
  });

  if (!lead) return;

  let score = 0;
  const reasons: string[] = [];

  if (lead.email) { score += 15; reasons.push("Has email"); }
  if (lead.phone) { score += 10; reasons.push("Has phone"); }
  if (lead.company) { score += 15; reasons.push(`Works at ${lead.company}`); }
  if (lead.jobTitle) { score += 10; reasons.push(`Title: ${lead.jobTitle}`); }
  if (lead.bio && lead.bio.length > 50) { score += 10; reasons.push("Detailed bio"); }
  if (lead.conversations.length > 0) { score += 20; reasons.push("Active conversations"); }

  const executiveTitles = ["CEO", "CTO", "VP", "Director", "Head of", "Founder"];
  if (executiveTitles.some((t) => lead.jobTitle?.toLowerCase().includes(t.toLowerCase()))) {
    score += 15;
    reasons.push("Executive title");
  }

  score = Math.min(100, score);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score,
      aiScoreReason: reasons.join("; "),
    },
  });

  await prisma.activity.create({
    data: {
      type: "SCORE_CHANGE",
      title: `Lead scored ${score}/100`,
      description: reasons.join("; "),
      leadId,
      metadata: JSON.stringify({ score, reasons }),
    },
  });
}

async function draftMessage(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
      messages: { orderBy: { sentAt: "desc" }, take: 10 },
    },
  });

  if (!conversation?.lead) return;

  const lead = conversation.lead;
  const recentMessages = conversation.messages || [];

  // Generate contextual draft
  const draft = generateContextualDraft(lead, recentMessages);

  // Store as activity
  await prisma.activity.create({
    data: {
      type: "AI_ACTION",
      title: "AI drafted message",
      description: draft,
      leadId: lead.id,
      conversationId,
      metadata: JSON.stringify({ draft, type: "outreach" }),
    },
  });
}

async function summarizeConversation(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "asc" },
  });

  if (messages.length === 0) return;

  const summary = {
    totalMessages: messages.length,
    agentMessages: messages.filter((m) => m.senderType === "AGENT").length,
    contactMessages: messages.filter((m) => m.senderType === "CONTACT").length,
    dateRange: {
      start: messages[0].sentAt,
      end: messages[messages.length - 1].sentAt,
    },
    recentTopics: messages.slice(-5).map((m) => m.content.slice(0, 100)),
  };

  await prisma.activity.create({
    data: {
      type: "AI_ACTION",
      title: "Conversation summarized",
      description: `${summary.totalMessages} messages, ${summary.contactMessages} from contact`,
      conversationId,
      metadata: JSON.stringify(summary),
    },
  });
}

async function detectIntent(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: 5,
  });

  if (messages.length === 0) return;

  const contactMessages = messages
    .filter((m) => m.senderType === "CONTACT")
    .map((m) => m.content.toLowerCase());

  const intent = {
    interested: contactMessages.some((m) =>
      m.includes("interested") || m.includes("tell me more") || m.includes("sounds good")
    ),
    pricing: contactMessages.some((m) =>
      m.includes("price") || m.includes("cost") || m.includes("how much")
    ),
    timeline: contactMessages.some((m) =>
      m.includes("when") || m.includes("timeline") || m.includes("deadline")
    ),
    objection: contactMessages.some((m) =>
      m.includes("but") || m.includes("concern") || m.includes("worried")
    ),
  };

  await prisma.activity.create({
    data: {
      type: "AI_ACTION",
      title: "Intent detected",
      conversationId,
      metadata: JSON.stringify(intent),
    },
  });
}

async function suggestFollowUp(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
    },
  });

  if (!lead) return;

  const lastConversation = lead.conversations[0];
  const daysSinceLastMessage = lastConversation?.lastMessageAt
    ? Math.floor((Date.now() - new Date(lastConversation.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let suggestion = "";

  if (!lastConversation) {
    suggestion = `New lead ${lead.firstName}. Suggest initial outreach via ${lead.platform}.`;
  } else if (daysSinceLastMessage && daysSinceLastMessage > 7) {
    suggestion = `No response in ${daysSinceLastMessage} days. Suggest follow-up message.`;
  } else {
    suggestion = "Continue monitoring conversation.";
  }

  await prisma.activity.create({
    data: {
      type: "AI_ACTION",
      title: "Follow-up suggested",
      description: suggestion,
      leadId,
      metadata: JSON.stringify({ suggestion, daysSinceLastMessage }),
    },
  });
}

function generateContextualDraft(
  lead: { firstName?: string | null; company?: string | null; jobTitle?: string | null; platform: string },
  messages: { content: string; senderType: string }[]
): string {
  const name = lead.firstName || "there";
  const company = lead.company;

  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderType === "CONTACT") {
      return `Thanks for your message! I'd love to learn more about your work${company ? ` at ${company}` : ""}. Would you be open to a quick chat this week?`;
    }
  }

  return `Hi ${name},\n\nI came across your profile${company ? ` and your work at ${company}` : ""} and thought it would be great to connect.\n\nWould you be open to a brief conversation?\n\nBest regards`;
}
