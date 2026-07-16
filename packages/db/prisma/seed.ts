import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "User",
      passwordHash: "$2b$10$placeholder",
      role: "ADMIN",
    },
  });

  // Create user settings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      defaultModel: "gpt-4o",
      timezone: "UTC",
    },
  });

  // Create sample leads
  const leads = [
    {
      platform: "LINKEDIN" as const,
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@techcorp.com",
      company: "TechCorp",
      jobTitle: "VP of Engineering",
      bio: "Engineering leader with 15+ years of experience building scalable systems. Passionate about AI and developer productivity.",
      profileUrl: "https://linkedin.com/in/sarahchen",
      score: 75,
      status: "QUALIFIED" as const,
      tags: JSON.stringify(["ai", "engineering", "vp"]),
    },
    {
      platform: "LINKEDIN" as const,
      firstName: "Michael",
      lastName: "Johnson",
      email: "m.johnson@innovateco.com",
      company: "InnovateCo",
      jobTitle: "CTO",
      bio: "Technology executive driving digital transformation. Previously at Google and Meta.",
      profileUrl: "https://linkedin.com/in/michaeljohnson",
      score: 85,
      status: "CONTACTED" as const,
      tags: JSON.stringify(["enterprise", "cto", "transformation"]),
    },
    {
      platform: "FACEBOOK" as const,
      firstName: "Emily",
      lastName: "Williams",
      company: "GrowthLab",
      jobTitle: "Head of Growth",
      bio: "Growth marketing expert. Scaled 3 startups from 0 to $10M ARR.",
      score: 60,
      status: "NEW" as const,
      tags: JSON.stringify(["growth", "marketing", "startup"]),
    },
    {
      platform: "TWITTER" as const,
      firstName: "James",
      lastName: "Anderson",
      company: "DataDriven",
      jobTitle: "Data Scientist",
      bio: "ML engineer and data scientist. Building the future of predictive analytics.",
      score: 45,
      status: "NEW" as const,
      tags: JSON.stringify(["data", "ml", "analytics"]),
    },
    {
      platform: "LINKEDIN" as const,
      firstName: "Lisa",
      lastName: "Martinez",
      email: "lisa@digitalagency.com",
      company: "DigitalAgency",
      jobTitle: "Marketing Director",
      bio: "Digital marketing strategist with expertise in B2B SaaS.",
      score: 55,
      status: "NEW" as const,
      tags: JSON.stringify(["marketing", "b2b", "saas"]),
    },
  ];

  for (const leadData of leads) {
    const existing = await prisma.lead.findFirst({
      where: { email: leadData.email || undefined },
    });

    if (!existing) {
      await prisma.lead.create({
        data: {
          ...leadData,
          ownerId: user.id,
          createdBy: user.id,
        },
      });
    }
  }

  // Create sample conversations
  const sarahLead = await prisma.lead.findFirst({ where: { firstName: "Sarah" } });
  const michaelLead = await prisma.lead.findFirst({ where: { firstName: "Michael" } });

  if (sarahLead) {
    let conv = await prisma.conversation.findFirst({
      where: { leadId: sarahLead.id, subject: "AI Sales Automation Discussion" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          platform: "LINKEDIN",
          leadId: sarahLead.id,
          subject: "AI Sales Automation Discussion",
          status: "OPEN",
          lastMessageAt: new Date(),
          lastMessagePreview: "That sounds great! Let me know when you're free.",
        },
      });
    }

    const sarahMsgCount = await prisma.message.count({ where: { conversationId: conv.id } });
    if (sarahMsgCount === 0) {
      await prisma.message.createMany({
        data: [
          {
            conversationId: conv.id,
            content: "Hi Sarah, I noticed your work at TechCorp. Would love to connect!",
            senderType: "AGENT",
            sentAt: new Date(Date.now() - 86400000 * 2),
          },
          {
            conversationId: conv.id,
            content: "Thanks for reaching out! I'm always interested in learning about new tools.",
            senderType: "CONTACT",
            sentAt: new Date(Date.now() - 86400000),
          },
          {
            conversationId: conv.id,
            content: "That sounds great! Let me know when you're free for a quick call.",
            senderType: "CONTACT",
            sentAt: new Date(),
          },
        ],
      });
    }
  }

  if (michaelLead) {
    let conv = await prisma.conversation.findFirst({
      where: { leadId: michaelLead.id, subject: "Partnership Opportunity" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          platform: "LINKEDIN",
          leadId: michaelLead.id,
          subject: "Partnership Opportunity",
          status: "PENDING",
          lastMessageAt: new Date(Date.now() - 3600000 * 5),
          lastMessagePreview: "I'll review the proposal and get back to you.",
        },
      });
    }

    const michaelMsgCount = await prisma.message.count({ where: { conversationId: conv.id } });
    if (michaelMsgCount === 0) {
      await prisma.message.createMany({
        data: [
          {
            conversationId: conv.id,
            content: "Hi Michael, we have a partnership opportunity that might interest InnovateCo.",
            senderType: "AGENT",
            sentAt: new Date(Date.now() - 86400000 * 3),
          },
          {
            conversationId: conv.id,
            content: "Interesting. Can you send more details?",
            senderType: "CONTACT",
            sentAt: new Date(Date.now() - 86400000 * 2),
          },
          {
            conversationId: conv.id,
            content: "I'll review the proposal and get back to you.",
            senderType: "CONTACT",
            sentAt: new Date(Date.now() - 3600000 * 5),
          },
        ],
      });
    }
  }

  // Create sample deals
  let sarahContact = sarahLead
    ? await prisma.contact.findUnique({ where: { leadId: sarahLead.id } })
    : null;
  if (!sarahContact && sarahLead) {
    sarahContact = await prisma.contact.create({
      data: { leadId: sarahLead.id, userId: user.id },
    });
  }

  if (sarahContact && sarahLead) {
    const existingDeal = await prisma.deal.findFirst({
      where: { leadId: sarahLead.id },
    });
    if (!existingDeal) {
      await prisma.deal.create({
        data: {
          contactId: sarahContact.id,
          leadId: sarahLead.id,
          title: "TechCorp Enterprise License",
          value: 50000,
          stage: "PROPOSAL",
          probability: 60,
        },
      });
    }
  }

  // Create sample campaigns
  const existingCampaign = await prisma.outreachCampaign.findFirst({
    where: { name: "Q1 LinkedIn Outreach" },
  });
  if (!existingCampaign) {
    await prisma.outreachCampaign.create({
      data: {
        name: "Q1 LinkedIn Outreach",
        template: "Hi {{firstName}},\n\nI noticed your work at {{company}} and thought it would be great to connect.\n\nWould you be open to a brief conversation about potential synergies?\n\nBest regards",
        platform: "LINKEDIN",
        status: "DRAFT",
        createdBy: user.id,
      },
    });
  }

  // Create browser profiles (only if none exist for this user)
  const existingProfiles = await prisma.browserProfile.count({ where: { userId: user.id } });
  if (existingProfiles === 0) {
    await prisma.browserProfile.createMany({
      data: [
        {
          name: "LinkedIn Account 1",
          platform: "LINKEDIN",
          profilePath: "./profiles/linkedin/1",
          userId: user.id,
          status: "ACTIVE",
        },
        {
          name: "Facebook Account 1",
          platform: "FACEBOOK",
          profilePath: "./profiles/facebook/1",
          userId: user.id,
          status: "ACTIVE",
        },
      ],
    });
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
