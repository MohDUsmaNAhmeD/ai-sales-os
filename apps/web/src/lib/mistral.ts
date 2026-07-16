export interface MistralConfig {
  apiKey: string;
  model?: string;
}

const MISTRAL_API_URL = "https://api.mistral.ai/v1";

export class MistralAI {
  private apiKey: string;
  private model: string;

  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "mistral-large-latest";
  }

  async chat(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string> {
    const res = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(`Mistral API error: ${res.status} - ${JSON.stringify(error)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: "system" | "user"; content: string }[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    return this.chat(messages);
  }

  async scoreLead(lead: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    bio?: string | null;
    platform: string;
    hasConversations: boolean;
  }): Promise<{ score: number; reason: string }> {
    const prompt = `Score this lead from 0-100 based on their profile. Return ONLY JSON with "score" (number) and "reason" (string).

Lead:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company || "Unknown"}
- Title: ${lead.jobTitle || "Unknown"}
- Bio: ${lead.bio || "No bio"}
- Platform: ${lead.platform}
- Has prior conversations: ${lead.hasConversations}

Consider: seniority, company relevance, profile completeness, engagement history.`;

    const response = await this.generate(prompt, "You are a lead scoring AI. Return only valid JSON.");
    try {
      const parsed = JSON.parse(response);
      return { score: Math.min(100, Math.max(0, parsed.score)), reason: parsed.reason };
    } catch {
      return { score: 50, reason: "AI scoring completed" };
    }
  }

  async draftMessage(params: {
    leadName: string;
    company?: string;
    jobTitle?: string;
    platform: string;
    context?: string;
    tone?: string;
  }): Promise<string> {
    const systemPrompt = `You are a sales outreach AI. Draft a concise, personalized message for ${params.platform}.
Rules:
- Be professional but warm
- Keep it under 150 words
- Reference their role/company
- Include a clear call to action
- No generic templates, make it personal`;

    const prompt = `Draft a ${params.tone || "professional"} outreach message to:
Name: ${params.leadName}
Company: ${params.company || "Unknown"}
Title: ${params.jobTitle || "Unknown"}
Platform: ${params.platform}
${params.context ? `Context: ${params.context}` : ""}

Write ONLY the message text, no quotes or explanation.`;

    return this.generate(prompt, systemPrompt);
  }

  async summarizeConversation(messages: { sender: string; content: string }[]): Promise<string> {
    const conversationText = messages.map((m) => `${m.sender}: ${m.content}`).join("\n");

    const prompt = `Summarize this conversation in 2-3 sentences. Highlight key points, decisions, and next steps.

${conversationText}

Summary:`;

    return this.generate(prompt, "You are a conversation analyst. Be concise and factual.");
  }

  async detectIntent(messages: { sender: string; content: string }[]): Promise<{
    intent: string;
    confidence: number;
    signals: string[];
  }> {
    const conversationText = messages.map((m) => `${m.sender}: ${m.content}`).join("\n");

    const prompt = `Analyze this conversation and detect the contact's intent. Return ONLY JSON:
{
  "intent": "interested|pricing|timeline|objection|neutral",
  "confidence": 0.0-1.0,
  "signals": ["signal1", "signal2"]
}

Conversation:
${conversationText}

JSON:`;

    const response = await this.generate(prompt, "You are an intent detection AI. Return only valid JSON.");
    try {
      return JSON.parse(response);
    } catch {
      return { intent: "neutral", confidence: 0.5, signals: [] };
    }
  }

  async suggestFollowUp(lead: {
    firstName?: string | null;
    company?: string | null;
    lastMessage?: string;
    daysSinceContact?: number;
  }): Promise<string> {
    const prompt = `Suggest a follow-up action for this lead:
Name: ${lead.firstName || "Unknown"}
Company: ${lead.company || "Unknown"}
${lead.lastMessage ? `Last message: ${lead.lastMessage}` : "No prior contact"}
${lead.daysSinceContact ? `Days since contact: ${lead.daysSinceContact}` : ""}

Give ONE specific, actionable suggestion. Be concise.`;

    return this.generate(prompt, "You are a sales follow-up advisor. Be specific and actionable.");
  }
}

let mistralInstance: MistralAI | null = null;

export function getMistralAI(apiKey?: string): MistralAI {
  if (!mistralInstance && apiKey) {
    mistralInstance = new MistralAI({ apiKey });
  }
  if (!mistralInstance) {
    throw new Error("Mistral API key not configured. Go to Settings to add it.");
  }
  return mistralInstance;
}

export function initMistral(apiKey: string): MistralAI {
  mistralInstance = new MistralAI({ apiKey });
  return mistralInstance;
}
