# AI Sales OS

A comprehensive AI-powered sales operating system with lead discovery, unified inbox, AI-assisted outreach, CRM, browser automation, background workers, analytics, and monitoring.

## Features

- **Lead Discovery** - Find leads across LinkedIn, Facebook, Twitter, Threads, PeoplePerHour
- **Unified Inbox** - All conversations from all platforms in one place
- **AI Engine** - Lead scoring, message drafting, conversation summarization, intent detection
- **CRM Pipeline** - Visual deal pipeline with drag-and-drop
- **Outreach Campaigns** - AI-personalized mass outreach
- **Browser Profiles** - Isolated Camoufox profiles per account
- **Background Workers** - Durable job processing with BullMQ
- **Real-time Monitoring** - System health, worker status, queue depth
- **Analytics** - Lead metrics, conversion tracking, activity logs

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Queue**: BullMQ (Redis)
- **Browser**: Camoufox (persistent profiles)
- **Monorepo**: Turborepo

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Setup

```bash
# Install dependencies
npm install

# Setup database
cp apps/web/.env.example apps/web/.env
# Edit .env with your database URL

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database
npm run db:seed

# Start development
npm run dev
```

### Services

- **Web App**: http://localhost:3000
- **Workers**: Background process (starts with `npm run dev`)

## Architecture

```
ai-sales-os/
├── apps/
│   ├── web/          # Next.js frontend + API
│   └── workers/      # BullMQ background workers
├── packages/
│   ├── shared/       # Shared types, utilities
│   ├── db/           # Prisma schema + client
│   └── ui/           # Shared UI components
```

## Database Schema

Core entities:
- **Lead** - Discovered contacts from all platforms
- **Conversation** - Unified conversation threads
- **Message** - Individual messages
- **Deal** - CRM pipeline deals
- **Activity** - Activity log
- **OutreachCampaign** - Mass outreach campaigns
- **BrowserProfile** - Camoufox browser profiles
- **BackgroundJob** - Durable job queue
- **ConnectorState** - Platform connector status
- **SystemHealth** - Monitoring telemetry

## Background Workers

- **Lead Discovery** - Searches platforms for leads
- **Browser Profile** - Creates/resets Camoufox profiles
- **Inbox Sync** - Syncs messages from platforms
- **AI Jobs** - Scoring, drafting, summarization
- **Outreach** - Processes campaign sends
- **Monitoring** - System health checks
- **Cleanup** - Old data cleanup

## API Endpoints

- `GET/POST /api/leads` - List/create leads
- `GET/PATCH /api/leads/[id]` - Get/update lead
- `GET /api/conversations` - List conversations
- `GET/PATCH /api/conversations/[id]` - Get/update conversation
- `POST /api/conversations/[id]/messages` - Send message
- `GET/POST /api/deals` - List/create deals
- `PATCH /api/deals/[id]` - Update deal
- `GET/POST /api/campaigns` - List/create campaigns
- `GET/POST /api/browser-profiles` - List/create profiles
- `POST /api/browser-profiles/[id]/reset` - Reset profile
- `POST /api/ai/draft` - AI message drafting
- `POST /api/ai/summarize` - AI conversation summary
- `POST /api/ai/score` - AI lead scoring
- `POST /api/discovery/search` - Discover leads
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/monitoring/health` - System health
- `GET /api/monitoring/jobs` - Background jobs
- `GET/PUT /api/settings` - App settings
