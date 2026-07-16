export interface AIProvider {
  generateText(prompt: string, options?: { model?: string; maxTokens?: number; temperature?: number }): Promise<string>;
  generateStructured<T>(prompt: string, schema: unknown): Promise<T>;
}

export interface LeadScore {
  score: number;
  reasons: string[];
  confidence: number;
}

export interface OutreachDraft {
  subject?: string;
  body: string;
  tone: "professional" | "casual" | "friendly" | "formal";
  followUpDays?: number;
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
  nextActions: string[];
}

export interface IntentDetection {
  interested: boolean;
  pricing: boolean;
  timeline: boolean;
  objection: boolean;
  decision: boolean;
  confidence: number;
}

export function scoreLead(data: {
  hasEmail: boolean;
  hasPhone: boolean;
  hasCompany: boolean;
  hasJobTitle: boolean;
  hasBio: boolean;
  hasProfileUrl: boolean;
  hasConversations: boolean;
  isExecutive: boolean;
}): LeadScore {
  let score = 0;
  const reasons: string[] = [];

  if (data.hasEmail) { score += 15; reasons.push("Has email address"); }
  if (data.hasPhone) { score += 10; reasons.push("Has phone number"); }
  if (data.hasCompany) { score += 15; reasons.push("Has company affiliation"); }
  if (data.hasJobTitle) { score += 10; reasons.push("Has job title"); }
  if (data.hasBio) { score += 10; reasons.push("Detailed bio"); }
  if (data.hasProfileUrl) { score += 5; reasons.push("Has profile URL"); }
  if (data.hasConversations) { score += 20; reasons.push("Active in conversations"); }
  if (data.isExecutive) { score += 15; reasons.push("Executive position"); }

  score = Math.min(100, score);

  return {
    score,
    reasons,
    confidence: score > 50 ? 0.8 : score > 25 ? 0.6 : 0.4,
  };
}

export function generateDraft(params: {
  leadName: string;
  company?: string;
  jobTitle?: string;
  platform: string;
  conversationHistory?: string;
  tone?: string;
}): OutreachDraft {
  const { leadName, company, jobTitle, platform, conversationHistory, tone = "professional" } = params;

  if (conversationHistory) {
    return {
      body: `Thanks for your message! I'd love to learn more about your work${company ? ` at ${company}` : ""}. Would you be open to a quick chat this week?`,
      tone: tone as OutreachDraft["tone"],
      followUpDays: 3,
    };
  }

  let body = "";
  if (platform === "LINKEDIN") {
    body = `Hi ${leadName},\n\nI came across your profile and was impressed by your work${jobTitle ? ` as ${jobTitle}` : ""}${company ? ` at ${company}` : ""}. I'd love to connect and explore potential collaboration opportunities.\n\nLooking forward to hearing from you!`;
  } else {
    body = `Hi ${leadName},\n\nI hope this message finds you well. I noticed your work${company ? ` at ${company}` : ""} and thought it would be great to connect.\n\nWould you be open to a brief conversation about potential synergies?\n\nBest regards`;
  }

  return {
    body,
    tone: tone as OutreachDraft["tone"],
    followUpDays: 7,
  };
}

export function detectIntent(messages: { content: string; senderType: string }[]): IntentDetection {
  const contactMessages = messages
    .filter((m) => m.senderType === "CONTACT")
    .map((m) => m.content.toLowerCase());

  const allText = contactMessages.join(" ");

  return {
    interested: /interested|tell me more|sounds good|great|yes/i.test(allText),
    pricing: /price|cost|how much|budget|expensive|affordable/i.test(allText),
    timeline: /when|timeline|deadline|asap|urgently|soon/i.test(allText),
    objection: /but|concern|worried|unsure|hesitant|however/i.test(allText),
    decision: /decide|decision|approve|sign|commit|go ahead/i.test(allText),
    confidence: contactMessages.length > 3 ? 0.7 : 0.4,
  };
}

export function summarizeConversation(messages: { content: string; senderType: string; sentAt: Date }[]): ConversationSummary {
  const totalMessages = messages.length;
  const agentMessages = messages.filter((m) => m.senderType === "AGENT").length;
  const contactMessages = messages.filter((m) => m.senderType === "CONTACT").length;

  const recentMessages = messages.slice(-5);
  const keyPoints = recentMessages.map((m) => m.content.slice(0, 100));

  const allText = messages.map((m) => m.content).join(" ").toLowerCase();
  const positiveWords = ["great", "good", "thanks", "excellent", "perfect", "love"];
  const negativeWords = ["bad", "poor", "hate", "terrible", "awful", "no"];

  const positiveCount = positiveWords.filter((w) => allText.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => allText.includes(w)).length;

  const sentiment = positiveCount > negativeCount ? "positive" : negativeCount > positiveCount ? "negative" : "neutral";

  return {
    summary: `${totalMessages} messages exchanged (${agentMessages} from agent, ${contactMessages} from contact)`,
    keyPoints,
    sentiment,
    nextActions: sentiment === "positive" ? ["Schedule call", "Send proposal"] : ["Follow up", "Address concerns"],
  };
}
