# AI Sales OS - Complete Rebuild & Redesign (Sol 5.6 Prompt)

## Project Location
`C:\Users\User\Documents\AI-OS2`

## GitHub Repo
`https://github.com/MohDUsmaNAhmeD/ai-sales-os`

---

## Tech Stack (KEEP)
- Next.js 15 (App Router) + React 19
- Prisma ORM + SQLite
- Turborepo monorepo (apps/web, apps/workers, packages/shared, packages/db)
- Tailwind CSS 3.4
- TypeScript 5.7
- puppeteer-core for CDP browser automation

---

## Critical Issues to Fix

### 1. Camoufox Browser Integration (REPLACE current mock)

The current `packages/shared/src/camoufox.ts` is a SIMULATION - it doesn't actually launch Camoufox. Replace with real Camoufox integration:

```bash
pip install camoufox
```

Camoufox is a Python package. The Node.js app needs to spawn it as a child process:
- Use `python -m camoufox.launch` or the Camoufox CLI to launch browser instances
- Each platform (LinkedIn, Facebook, Twitter, PeoplePerHour, Threads) gets its own Camoufox profile with persistent cookies/storage
- Camoufox provides anti-detection fingerprinting built-in
- Connect puppeteer-core to the Camoufox browser via CDP port (Camoufox exposes remote debugging)
- Profile data stored in `./profiles/{platform}/` directory
- Each profile persists cookies, localStorage, sessionStorage across sessions

Replace `packages/shared/src/camoufox.ts` with real implementation that:
- Spawns `camoufox` process per profile
- Connects puppeteer-core via CDP
- Manages profile lifecycle (launch, close, reset, health check)
- Extracts cookies via CDP `Network.getAllCookies`
- Saves/loads browser state (cookies, localStorage) to JSON files

Replace `packages/shared/src/browser-launcher.ts` to use Camoufox instead of system Edge/Chrome.

### 2. Inbox Sync (BROKEN - Fix completely)

Current problems:
- Scrapers open new browser tabs instead of using existing logged-in sessions
- DOM selectors are outdated/wrong for current platform layouts
- Facebook `/messages/e2ee/t/` pattern not matched (only `/messages/t/`)
- LinkedIn and Twitter scrapers only get sidebar previews, not actual messages
- No scroll support to load all conversations
- Sync returns silently with no errors

Fix `packages/shared/src/scrapers.ts`:
- Find existing platform tab in Camoufox browser (don't open new tabs)
- For each platform, use correct DOM selectors for current 2026 layouts:
  - Facebook: `[role="row"]` with `a[href*="/messages/t/"], a[href*="/messages/e2ee/t/"]`, name in `span[dir="auto"]`
  - LinkedIn: `.msg-conversation-list-item` with `a[href*="/messaging/thread/"]`
  - Twitter: `[data-testid="conversation"]` with `a[href*="/messages/"]`
- Scroll conversation sidebar to load ALL conversations (not just visible ones)
- Click into each conversation to extract actual message content (not just preview)
- Extract real sender names, timestamps, message content
- Handle pagination/infinite scroll
- Run all platform scrapers in PARALLEL for speed

Fix `apps/web/src/app/api/inbox/sync/route.ts`:
- Return detailed results per platform (count, errors)
- Show proper error messages when cookies are missing
- Support single-platform or all-platform sync

### 3. Lead Discovery (BROKEN - Fix completely)

Current problems:
- Discovery search endpoint exists but scrapers fail without cookies
- No proper error handling
- Results not saved to DB correctly

Fix `apps/web/src/app/api/discovery/search/route.ts`:
- Use Camoufox profiles with stored cookies for each platform
- Search LinkedIn, Facebook, Twitter, PeoplePerHour in parallel
- Parse and save leads with proper deduplication (by platform + externalId)
- Return real results with names, companies, profile URLs
- Handle errors gracefully per platform (one failing shouldn't stop others)

Fix scraper functions:
- `scrapeLinkedInSearch`: Use CDP to navigate to LinkedIn search, extract profiles from DOM
- `scrapeFacebookGroup`: Navigate to group member list, extract profiles
- `scrapeTwitterSearch`: Navigate to X search, extract user cells
- `scrapePeoplePerHour`: Navigate to freelancer search, extract profiles
- All should use existing browser tab + scroll to load more results

### 4. Complete UI Redesign (REDESIGN everything)

The current UI is ugly and non-responsive. Redesign ALL pages with a modern, clean, professional design.

#### Design System
- Color scheme: Dark sidebar (#0f172a), white content area, blue accents (#3b82f6)
- Typography: Inter font (import from Google Fonts)
- Spacing: Consistent 4px grid system
- Border radius: 12px for cards, 8px for buttons/inputs
- Shadows: Subtle layered shadows for depth
- Animations: Smooth 200ms transitions, no jarring movements
- Responsive: Mobile-first, works on 320px to 2560px screens

#### Layout (apps/web/src/app/layout.tsx)
- Collapsible sidebar (hamburger on mobile, full on desktop)
- Top header bar with search, notifications, user avatar
- Main content area with proper padding and max-width
- Loading skeletons for all data-fetching pages

#### Sidebar (apps/web/src/components/Sidebar.tsx)
- Collapsible on mobile (slide-in overlay)
- Active state with blue accent
- Icons + labels
- User info at bottom
- Smooth collapse/expand animation

#### Dashboard Page
- Stats cards (total leads, conversations, campaigns, deals)
- Recent activity feed
- Quick actions (New Discovery, Sync Inbox, etc.)
- Charts/graphs for lead sources and conversion rates

#### Leads Page (apps/web/src/components/pages/LeadsPage.tsx)
- Search bar with platform filter dropdown
- Lead cards in a grid/list view toggle
- Each card shows: avatar, name, company, platform icon, score badge, status
- Bulk actions (select multiple, assign, tag, delete)
- Discovery modal: select platforms, enter search query, see live results
- Infinite scroll or pagination
- Loading skeletons while fetching

#### Inbox Page (apps/web/src/components/pages/InboxPage.tsx)
- Split view: conversation list (left) + message thread (right)
- Conversation list: avatar, name, platform icon, last message preview, timestamp, unread badge
- Message thread: full message history with proper sender alignment (outgoing right, incoming left)
- Message input with AI draft button, emoji picker, file attachment
- Platform filter and status filter in header
- Sync Now button with progress indicator
- Empty state with clear CTA when no conversations
- Mobile: full-width conversation list, tap to open thread

#### Settings Page (apps/web/src/components/pages/SettingsPage.tsx)
- Cards for each section (AI Config, Connected Platforms, Browser Profiles)
- Platform connection cards with status indicators
- Browser Login flow: Launch → Log in → Extract Cookies → Connected
- Cookie paste modal with instructions
- Clear status messages for each action

#### CRM Page
- Deal pipeline (Kanban board view)
- Contact list with search/filter
- Activity timeline per contact

#### Campaigns Page
- Campaign cards with status (Draft, Sending, Completed)
- Create campaign wizard
- Template editor with variable placeholders

#### Browsers Page
- Profile cards showing platform, status, last active
- Launch/Close/Reset buttons per profile
- Health check indicators

#### Monitoring Page
- System health dashboard
- Job queue status
- Error logs

### 5. Performance Optimizations

- **Parallel scraping**: Run all platform scrapers simultaneously with `Promise.all()`
- **Database indexing**: Ensure all query fields are indexed (already mostly done)
- **API response caching**: Cache dashboard stats, platform status for 30 seconds
- **Lazy loading**: Load page components dynamically
- **Image optimization**: Use Next.js Image component for avatars
- **Debounced search**: Debounce lead/inbox search inputs by 300ms
- **Optimistic updates**: Update UI immediately on user actions, rollback on error
- **Virtual scrolling**: For large conversation/lead lists (use windowing)

### 6. Platform Support Matrix

| Platform | Search/Discovery | Inbox Sync | Send Message | Status |
|----------|-----------------|------------|--------------|--------|
| LinkedIn | CDP scrape | CDP scrape + API fallback | CDP type+send | Working (needs selector fix) |
| Facebook | CDP scrape groups | CDP scrape messages | CDP type+enter | Partial (e2ee URLs) |
| Twitter/X | CDP scrape | CDP scrape DMs | CDP type+send | Partial (selectors) |
| PeoplePerHour | CDP + HTTP fallback | N/A (no messaging) | N/A | Working (needs cookies) |
| Threads | HTTP scrape | N/A (no messaging) | N/A | Basic |

### 7. Database Schema (KEEP existing, no changes needed)

The Prisma schema at `packages/db/prisma/schema.prisma` is well-designed with 20+ models. Keep it as-is. Just ensure:
- `ConnectorState` table stores cookies per platform
- `Conversation` and `Message` tables store synced data
- `Lead` table stores discovered leads
- Proper indexes exist for query performance

### 8. File Structure (KEEP monorepo structure)

```
ai-sales-os/
├── apps/
│   ├── web/                    # Next.js frontend + API routes
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/        # API routes
│   │   │   │   │   ├── browser/{platform}/{launch,extract,status,close}/
│   │   │   │   │   ├── inbox/sync/
│   │   │   │   │   ├── leads/
│   │   │   │   │   ├── conversations/
│   │   │   │   │   ├── discovery/search/
│   │   │   │   │   └── settings/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── PlatformIcons.tsx
│   │   │   │   └── pages/
│   │   │   │       ├── DashboardPage.tsx
│   │   │   │       ├── LeadsPage.tsx
│   │   │   │       ├── InboxPage.tsx
│   │   │   │       ├── CrmPage.tsx
│   │   │   │       ├── CampaignsPage.tsx
│   │   │   │       ├── BrowsersPage.tsx
│   │   │   │       ├── MonitoringPage.tsx
│   │   │   │       └── SettingsPage.tsx
│   │   │   └── lib/
│   │   │       ├── api.ts
│   │   │       ├── utils.ts
│   │   │       └── mistral.ts
│   │   └── tailwind.config.js
│   └── workers/                # Background job workers
│       └── src/
│           ├── index.ts
│           └── workers/
│               ├── inbox-sync.ts
│               ├── lead-discovery.ts
│               ├── ai-jobs.ts
│               ├── outreach.ts
│               ├── browser-profile.ts
│               ├── monitoring.ts
│               └── cleanup.ts
├── packages/
│   ├── shared/                 # Shared utilities
│   │   └── src/
│   │       ├── scrapers.ts     # Platform scraping functions (FIX)
│   │       ├── connectors.ts   # Platform connector classes
│   │       ├── camoufox.ts     # Camoufox browser manager (REWRITE)
│   │       ├── browser.ts      # Browser profile types + CamoufoxManager
│   │       ├── browser-launcher.ts  # Browser launch/extract (REWRITE to use Camoufox)
│   │       ├── ai.ts           # Mistral AI integration
│   │       ├── types.ts        # Shared type definitions
│   │       └── index.ts        # Exports
│   └── db/                     # Database
│       ├── prisma/
│       │   ├── schema.prisma   # KEEP as-is
│       │   └── seed.ts
│       └── src/index.ts
├── package.json
├── turbo.json
└── tsconfig.json
```

### 9. Implementation Order

1. **First**: Rewrite `camoufox.ts` and `browser-launcher.ts` for real Camoufox integration
2. **Second**: Fix all scrapers in `scrapers.ts` with correct DOM selectors
3. **Third**: Fix inbox sync API and lead discovery API
4. **Fourth**: Redesign all UI components with new design system
5. **Fifth**: Add performance optimizations (parallel scraping, caching, lazy loading)
6. **Last**: Test end-to-end on all platforms

### 10. Key Constraints

- Keep SQLite (don't switch to PostgreSQL)
- Keep puppeteer-core for CDP connection (Camoufox exposes CDP)
- Keep Mistral AI for LLM features
- Keep Turborepo monorepo structure
- All files must compile with TypeScript strict mode
- No new major dependencies unless absolutely necessary
- Must work on Windows (current dev environment)

---

## Summary

This prompt covers:
1. **Real Camoufox integration** replacing the current mock implementation
2. **Fixed inbox sync** with correct DOM selectors for all platforms (Facebook, LinkedIn, Twitter, PeoplePerHour, Threads)
3. **Fixed lead discovery** with proper error handling and parallel platform search
4. **Complete UI redesign** with modern design system, responsive layout, and professional components
5. **Performance optimizations** including parallel scraping, caching, and lazy loading
6. **All platforms supported**: LinkedIn, Facebook, Twitter/X, PeoplePerHour, Threads

The rebuild preserves the existing tech stack (Next.js, Prisma, SQLite, Tailwind) and monorepo structure while fixing all broken features and creating a modern, responsive UI.
