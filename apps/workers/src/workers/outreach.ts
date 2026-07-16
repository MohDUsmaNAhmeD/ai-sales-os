import { prisma } from "@ai-sales-os/db";

interface OutreachJobData {
  campaignId?: string;
  leadId?: string;
  jobId?: string;
}

export async function outreachWorker(data: OutreachJobData) {
  const { campaignId, leadId } = data;

  if (campaignId) {
    await processCampaign(campaignId);
  } else if (leadId) {
    await processSingleOutreach(leadId);
  }
}

async function processCampaign(campaignId: string) {
  const campaign = await prisma.outreachCampaign.findUnique({
    where: { id: campaignId },
    include: {
      leads: {
        include: { lead: true },
        where: { status: "PENDING" },
      },
    },
  });

  if (!campaign) return;

  console.log(`[Outreach] Processing campaign ${campaign.name} with ${campaign.leads.length} pending leads`);

  await prisma.outreachCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", sentAt: new Date() },
  });

  for (const outreachLead of campaign.leads) {
    try {
      const personalizedMessage = personalizeTemplate(
        campaign.template,
        outreachLead.lead
      );

      // Create message in conversation or create new conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          leadId: outreachLead.leadId,
          platform: campaign.platform || outreachLead.lead.platform,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            platform: campaign.platform || outreachLead.lead.platform,
            leadId: outreachLead.leadId,
            subject: `Campaign: ${campaign.name}`,
            status: "OPEN",
          },
        });
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: personalizedMessage,
          senderType: "AGENT",
          isAiGenerated: true,
        },
      });

      await prisma.outreachLead.update({
        where: { id: outreachLead.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await prisma.activity.create({
        data: {
          type: "OUTREACH",
          title: `Outreach sent via ${campaign.platform || "default"}`,
          description: personalizedMessage.slice(0, 200),
          leadId: outreachLead.leadId,
          metadata: JSON.stringify({ campaignId, campaignName: campaign.name }),
        },
      });

      console.log(`[Outreach] Sent message to ${outreachLead.lead.firstName} ${outreachLead.lead.lastName}`);
    } catch (error) {
      console.error(`[Outreach] Failed to send to lead ${outreachLead.leadId}:`, error);

      await prisma.outreachLead.update({
        where: { id: outreachLead.id },
        data: { status: "FAILED" },
      });
    }
  }

  await prisma.outreachCampaign.update({
    where: { id: campaignId },
    data: { status: "COMPLETED" },
  });
}

async function processSingleOutreach(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  console.log(`[Outreach] Processing single outreach for ${lead.firstName} ${lead.lastName}`);
}

function personalizeTemplate(template: string, lead: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
}): string {
  return template
    .replace(/\{\{firstName\}\}/g, lead.firstName || "")
    .replace(/\{\{lastName\}\}/g, lead.lastName || "")
    .replace(/\{\{company\}\}/g, lead.company || "")
    .replace(/\{\{jobTitle\}\}/g, lead.jobTitle || "");
}
