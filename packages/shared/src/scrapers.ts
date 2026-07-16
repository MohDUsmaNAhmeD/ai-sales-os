import { ScrapedProfile, ScrapedMessage } from "./browser";
import { camoufox, type BrowserPlatform } from "./camoufox";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Camoufox + Playwright helpers ───────────────────────────

async function connectBrowser(platform: BrowserPlatform): Promise<{ browser: any }> {
  const context = await camoufox.getContext(platform);
  return {
    browser: {
      pages: () => context.pages(),
      newPage: () => context.newPage(),
      disconnect: () => undefined,
    },
  };
}

async function isBrowserAvailable(platform: BrowserPlatform): Promise<boolean> {
  return (await camoufox.healthCheck(platform)).running;
}

async function isCDPAvailable(): Promise<boolean> {
  const platforms: BrowserPlatform[] = ["LINKEDIN", "FACEBOOK", "TWITTER", "PEOPLEPERHOUR"];
  const health = await Promise.all(platforms.map((platform) => camoufox.healthCheck(platform)));
  return health.some(({ running }) => running);
}

// ─── LinkedIn ───────────────────────────────────────────────

export async function scrapeLinkedInSearch(
  query: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  try {
    return await scrapeLinkedInSearchViaCDP(query);
  } catch (cdpError) {
    const msg = cdpError instanceof Error ? cdpError.message : String(cdpError);
    console.warn("[LinkedIn Search] CDP failed:", msg);
    throw cdpError;
  }
}

async function scrapeLinkedInSearchViaCDP(query: string): Promise<ScrapedProfile[]> {
  const { browser } = await connectBrowser("LINKEDIN");

  let page;
  let isNewPage = false;
  try {
    const pages = await browser.pages();
    const existingLinkedInPage = pages.find((p: any) => p.url().includes('linkedin.com'));
    if (existingLinkedInPage) {
      page = existingLinkedInPage;
      console.log(`[LinkedIn Search CDP] Reusing existing LinkedIn page`);
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/checkpoint")) {
      throw new Error("Not logged into LinkedIn. Please log in to the browser first.");
    }

    try {
      await page.waitForSelector('a[href*="/in/"], a[href*="/search/results/"]', { timeout: 15000 });
    } catch {
      await new Promise(r => setTimeout(r, 5000));
    }

    const profiles = await page.evaluate(() => {
      const results: { externalId: string; firstName: string; lastName: string; company?: string; jobTitle?: string; profileUrl: string; avatarUrl?: string; bio?: string; location?: string }[] = [];
      const cards = document.querySelectorAll(
        ".entity-result__item, .reusable-search__result-container li, [data-view-name='search-result'], .artdeco-list__item"
      );

      for (const card of Array.from(cards)) {
        try {
          const linkEl = card.querySelector("a[href*='/in/']");
          const href = linkEl?.getAttribute("href") || "";
          const profileMatch = href.match(/\/in\/([^?#/]+)/);
          const externalId = profileMatch?.[1] || "";
          if (!externalId) continue;

          const nameEl = card.querySelector(
            ".entity-result__title-text a span[aria-hidden='true'], .entity-result__title-text span, span.entity-result__title-text, .entity-result__title-text"
          );
          const fullName = nameEl?.textContent?.trim() || "";
          const nameParts = fullName.split(" ").filter(Boolean);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          const headlineEl = card.querySelector(
            ".entity-result__primary-subtitle, .entity-result__badge-subtitle"
          );
          const headline = headlineEl?.textContent?.trim() || "";
          let jobTitle: string | undefined;
          let company: string | undefined;
          if (headline.includes(" at ")) {
            const parts = headline.split(" at ");
            jobTitle = parts[0]?.trim();
            company = parts.slice(1).join(" at ")?.trim();
          } else if (headline) {
            jobTitle = headline;
          }

          const locationEl = card.querySelector(
            ".entity-result__secondary-subtitle, .entity-result__location"
          );
          const location = locationEl?.textContent?.trim() || undefined;

          const avatarEl = card.querySelector("img.presence-entity__image, img.EntityPhoto-circle-5, img[loading='lazy']");
          const avatarUrl = avatarEl?.getAttribute("src") || undefined;

          results.push({
            externalId,
            firstName,
            lastName,
            company,
            jobTitle,
            profileUrl: `https://www.linkedin.com/in/${externalId}`,
            avatarUrl,
            bio: headline || undefined,
            location,
          });
        } catch {}
      }
      return results;
    });

    console.log(`[LinkedIn Search CDP] Found ${profiles.length} results for "${query}"`);
    return profiles;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

// ─── LinkedIn Messages ──────────────────────────────────────

export async function scrapeLinkedInMessages(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapeLinkedInMessagesViaCDP();
    } catch (cdpError) {
      console.warn("[LinkedIn Messages] CDP failed:", cdpError);
    }
  }

  try {
    return await scrapeLinkedInMessagesViaAPI(cookies);
  } catch (apiError) {
    console.warn("[LinkedIn Messages] Voyager API failed:", apiError);
  }

  try {
    return await scrapeLinkedInMessagesViaWeb(cookies);
  } catch (webError) {
    console.error("[LinkedIn Messages] All methods failed:", webError);
    return [];
  }
}

async function scrapeLinkedInMessagesViaCDP(): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const { browser } = await connectBrowser("LINKEDIN");

  try {
    // Find existing LinkedIn tab or create new one
    const pages = await browser.pages();
    let page = pages.find((p: any) => p.url().includes("linkedin.com"));
    if (!page) {
      page = await browser.newPage();
    }

    await page.goto("https://www.linkedin.com/messaging/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector("[data-testid='msg-list'], .msg-conversation-list-item, .artdeco-list__item, .msg-conversations-container", {
      timeout: 15000,
    }).catch(() => {});

    // Scroll the conversation list to load more
    for (let i = 0; i < 8; i++) {
      const scrolled = await page.evaluate(() => {
        const list = document.querySelector('.msg-conversations-container__conversations-list') ||
                    document.querySelector('[data-testid="msg-list"]') ||
                    document.querySelector('.artdeco-list');
        if (list) {
          const prev = list.scrollTop;
          list.scrollTop = list.scrollHeight;
          return list.scrollTop !== prev;
        }
        return false;
      });
      if (!scrolled) break;
      await new Promise(r => setTimeout(r, 800));
    }

    // Extract conversation links
    const convLinks = await page.evaluate(() => {
      const links: { href: string; name: string; preview: string }[] = [];
      const seen = new Set<string>();

      const allLinks = document.querySelectorAll('a[href*="/messaging/thread/"]');
      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        const match = href.match(/\/thread\/([^?]+)/);
        if (!match) continue;
        const convId = match[1];
        if (seen.has(convId)) continue;
        seen.add(convId);

        // Find the conversation row
        let row = link.closest('.msg-conversation-list-item') || link.closest('.artdeco-list__item') || link.parentElement?.parentElement;

        let name = "";
        const nameEl = row?.querySelector('.msg-conversation-card__participant-names, .artdeco-entity-lockup__title, [data-testid="msg-conversation-card__participant-names"]');
        if (nameEl) name = nameEl.textContent?.trim() || "";
        if (!name) {
          // Try aria-label
          const ariaLabel = link.getAttribute("aria-label") || "";
          if (ariaLabel) name = ariaLabel.split(",")[0].split(" - ")[0].trim();
        }

        let preview = "";
        const previewEl = row?.querySelector('.msg-preview, .msg-overlay-list-item__preview, [data-testid="msg-preview"]');
        if (previewEl) preview = previewEl.textContent?.trim() || "";

        links.push({ href, name: name || "Unknown", preview });
      }
      return links;
    });

    console.log(`[LinkedIn] Found ${convLinks.length} conversations`);

    // Click into each conversation to get actual messages
    const results: { conversationId: string; messages: ScrapedMessage[] }[] = [];

    for (const conv of convLinks) {
      const match = conv.href.match(/\/thread\/([^?]+)/);
      const convId = match?.[1];
      if (!convId) continue;

      try {
        const fullUrl = conv.href.startsWith("http") ? conv.href : `https://www.linkedin.com${conv.href}`;
        await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 15000 });

        await page.waitForSelector('.msg-s-event-list, [data-testid="message-event-list"], .msg-list__livetext', {
          timeout: 8000,
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1500));

        const messages = await page.evaluate((senderName: string) => {
          const msgs: { externalId: string; content: string; senderId: string; senderName: string; sentAt: string }[] = [];
          const seen = new Set<string>();

          const messageEls = document.querySelectorAll('.msg-s-event-list__event, [data-testid="message-event-list"] > div');

          for (const el of messageEls) {
            const textEl = el.querySelector('.msg-s-event-list__event--content, .msg-textfeed-rayo__content');
            const content = textEl?.textContent?.trim() || "";
            if (!content || content.length < 1) continue;

            const key = content.substring(0, 50);
            if (seen.has(key)) continue;
            seen.add(key);

            const isOutgoing = el.closest('.msg-s-event-list__event--other') !== null ||
                              el.classList.contains('align-right') ||
                              el.querySelector('.msg-s-event-list__time--right') !== null;

            let sentAt = new Date().toISOString();
            const timeEl = el.querySelector('.msg-s-event-list__time, time, [datetime]');
            if (timeEl) {
              const dt = timeEl.getAttribute("datetime");
              if (dt) sentAt = dt;
            }

            msgs.push({
              externalId: `li_${convId}_${seen.size}_${Date.now()}`,
              content,
              senderId: isOutgoing ? "user" : "contact",
              senderName: isOutgoing ? "You" : senderName,
              sentAt,
            });
          }

          return msgs;
        }, conv.name);

        if (messages.length > 0) {
          results.push({ conversationId: convId, messages });
          console.log(`[LinkedIn] Conv ${convId}: ${messages.length} messages`);
        } else {
          results.push({
            conversationId: convId,
            messages: [{
              externalId: `msg_${convId}_${Date.now()}`,
              content: conv.preview || `Conversation with ${conv.name}`,
              senderId: "contact",
              senderName: conv.name,
              sentAt: new Date().toISOString(),
            }],
          });
        }
      } catch (err) {
        console.warn(`[LinkedIn] Failed to scrape conversation ${convId}:`, err);
        results.push({
          conversationId: convId,
          messages: [{
            externalId: `msg_${convId}_${Date.now()}`,
            content: conv.preview || `Conversation with ${conv.name}`,
            senderId: "contact",
            senderName: conv.name,
            sentAt: new Date().toISOString(),
          }],
        });
      }
    }

    return results;
  } finally {
    browser.disconnect();
  }
}

async function scrapeLinkedInMessagesViaAPI(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": cookies,
    "X-Requested-With": "XMLHttpRequest",
    "X-Restli-Protocol-Version": "2.0.0",
    "Li-Fabric": "com.linkedin.linkedin",
  };

  const res = await fetch("https://www.linkedin.com/voyager/api/messaging/conversations?count=20", {
    headers,
    redirect: "follow",
  });
  
  if (!res.ok) throw new Error(`LinkedIn messages returned ${res.status}`);

  const data = await res.json();
  const conversations = data?.elements || [];

  return conversations.map((conv: Record<string, unknown>) => ({
    conversationId: (conv.entityUrn as string)?.split(":").pop() || "",
    messages: ((conv.events as Record<string, unknown>[]) || []).map((ev) => ({
      externalId: (ev.entityUrn as string)?.split(":").pop() || "",
      content: String((ev.eventContent as Record<string, unknown>)?.body || ""),
      senderId: ((ev.actor as Record<string, unknown>)?.entityUrn as string)?.split(":").pop() || "",
      sentAt: new Date(Number(ev.createdAt) || Date.now()).toISOString(),
    })),
  }));
}

async function scrapeLinkedInMessagesViaWeb(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": cookies,
  };

  const res = await fetch("https://www.linkedin.com/messaging/", {
    headers,
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`LinkedIn messaging page returned ${res.status}`);

  const html = await res.text();
  return parseLinkedInMessagingPage(html);
}

function parseLinkedInMessagingPage(html: string): { conversationId: string; messages: ScrapedMessage[] }[] {
  const results: { conversationId: string; messages: ScrapedMessage[] }[] = [];
  const jsonMatch = html.match(/"conversations":\s*(\[[\s\S]*?\])\s*[,}]/);
  if (jsonMatch) {
    try {
      const conversations = JSON.parse(jsonMatch[1]);
      for (const conv of conversations) {
        const convId = conv.id || conv.entityUrn?.split(":").pop() || "";
        const messages = (conv.events || []).map((ev: any) => ({
          externalId: ev.id || ev.entityUrn?.split(":").pop() || `msg_${Date.now()}`,
          content: String(ev.body || ev.eventContent?.body || ""),
          senderId: String(ev.actor?.entityUrn?.split(":").pop() || "unknown"),
          senderName: ev.actor?.name || undefined,
          sentAt: new Date(Number(ev.createdAt) || Date.now()).toISOString(),
        }));
        if (convId && messages.length > 0) {
          results.push({ conversationId: convId, messages });
        }
      }
    } catch { /* fall through */ }
  }
  return results;
}

// ─── LinkedIn Send Message via CDP ──────────────────────────

export async function sendLinkedInMessageViaCDP(
  conversationId: string,
  content: string
): Promise<boolean> {
  if (!(await isBrowserAvailable("LINKEDIN"))) {
    throw new Error("LinkedIn browser not running. Launch it and sign in first.");
  }

  const { browser } = await connectBrowser("LINKEDIN");
  let page;
  let isNewPage = false;

  try {
    const pages = await browser.pages();
    const existingMsgPage = pages.find((p: any) => p.url().includes('linkedin.com/messaging'));
    if (existingMsgPage) {
      page = existingMsgPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(`https://www.linkedin.com/messaging/thread/${conversationId}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });

    await page.waitForSelector("[contenteditable='true'], .msg-form__contenteditable, textarea", {
      timeout: 10000,
    });

    const editor = await page.$("[contenteditable='true'], .msg-form__contenteditable, textarea");
    if (!editor) throw new Error("Could not find message input");

    await editor.click();
    await page.keyboard.type(content, { delay: 30 });
    await new Promise(r => setTimeout(r, 500));

    const sendBtn = await page.$("button.msg-form__send-button, button[aria-label='Send']");
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log(`[LinkedIn] Message sent to conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error("[LinkedIn] Send message failed:", error);
    throw error;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

// ─── Facebook ────────────────────────────────────────────────

export async function scrapeFacebookGroup(
  groupUrl: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapeFacebookGroupViaCDP(groupUrl);
    } catch (cdpError) {
      console.warn("[Facebook] CDP scraping failed, falling back to HTTP:", cdpError);
    }
  }

  const headers: Record<string, string> = {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookies) headers["Cookie"] = cookies;

  try {
    const res = await fetch(groupUrl, { headers, redirect: "follow" });
    if (!res.ok) throw new Error(`Facebook returned ${res.status}`);
    const html = await res.text();
    return parseFacebookGroupMembers(html);
  } catch (error) {
    console.error("[Facebook Scraper] Error:", error);
    throw error;
  }
}

async function scrapeFacebookGroupViaCDP(groupUrl: string): Promise<ScrapedProfile[]> {
  const { browser } = await connectBrowser("FACEBOOK");

  let page;
  let isNewPage = false;
  try {
    const pages = await browser.pages();
    const existingFBPage = pages.find((p: any) => p.url().includes('facebook.com'));
    if (existingFBPage) {
      page = existingFBPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(groupUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const currentUrl = page.url();
    if (currentUrl.includes("login") || currentUrl.includes("checkpoint")) {
      throw new Error("Not logged into Facebook. Please log in to the browser first.");
    }

    // Scroll to load members
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1500));
    }

    const profiles = await page.evaluate(() => {
      const results: { externalId: string; firstName: string; lastName: string; profileUrl: string; avatarUrl?: string; bio?: string }[] = [];

      // Facebook group member cards
      const memberLinks = document.querySelectorAll('a[href*="facebook.com/profile.php"], a[href*="facebook.com/"]');
      const seen = new Set<string>();

      for (const link of Array.from(memberLinks)) {
        const href = link.getAttribute("href") || "";
        let externalId = "";
        let profileUrl = "";

        const idMatch = href.match(/id=(\d+)/);
        const usernameMatch = href.match(/facebook\.com\/([^/?]+)/);

        if (idMatch) {
          externalId = idMatch[1];
          profileUrl = `https://www.facebook.com/profile.php?id=${externalId}`;
        } else if (usernameMatch && !["groups", "pages", "events", "marketplace", "watch", "gaming", "news", "fundraiser"].includes(usernameMatch[1])) {
          externalId = usernameMatch[1];
          profileUrl = `https://www.facebook.com/${externalId}`;
        }

        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);

        // Get name from nearby text
        const container = link.closest('[class*="member"], [class*="profile"], [role="listitem"], div');
        const nameEl = container?.querySelector('[class*="name"], [class*="Name"], span, strong') || link;
        const fullName = nameEl?.textContent?.trim() || "";
        const nameParts = fullName.split(" ").filter(Boolean);

        const avatarEl = container?.querySelector("img[src*='fbcdn'], img[src*='profile']");
        const avatarUrl = avatarEl?.getAttribute("src") || undefined;

        if (fullName.length > 1) {
          results.push({
            externalId,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            profileUrl,
            avatarUrl,
          });
        }
      }
      return results;
    });

    console.log(`[Facebook CDP] Found ${profiles.length} members from group`);
    return profiles;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

function parseFacebookGroupMembers(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];
  const jsonMatch = html.match(/"profile":{"id":"(\d+)","name":"([^"]+)"/g);
  if (jsonMatch) {
    for (const match of jsonMatch) {
      const idMatch = match.match(/"id":"(\d+)"/);
      const nameMatch = match.match(/"name":"([^"]+)"/);
      if (idMatch && nameMatch) {
        const parts = nameMatch[1].split(" ");
        results.push({
          externalId: idMatch[1],
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          profileUrl: `https://www.facebook.com/profile.php?id=${idMatch[1]}`,
        });
      }
    }
  }
  return results;
}

// ─── Facebook Messages ──────────────────────────────────────

export async function scrapeFacebookMessages(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapeFacebookMessagesViaCDP();
    } catch (cdpError) {
      console.warn("[Facebook Messages] CDP failed:", cdpError);
    }
  }

  // HTTP-based fallback using Graph API-style endpoints
  try {
    return await scrapeFacebookMessagesViaHTTP(cookies);
  } catch (httpError) {
    console.error("[Facebook Messages] All methods failed:", httpError);
    return [];
  }
}

async function scrapeFacebookMessagesViaCDP(): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const { browser } = await connectBrowser("FACEBOOK");

  try {
    // Find existing Facebook tab or create new one
    const pages = await browser.pages();
    let page = pages.find((p: any) => p.url().includes("facebook.com"));
    if (!page) {
      page = await browser.newPage();
    }

    await page.goto("https://www.facebook.com/messages/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const currentUrl = page.url();
    if (currentUrl.includes("login")) {
      throw new Error("Not logged into Facebook");
    }

    // Wait for conversation list
    await page.waitForSelector('[role="grid"], [role="list"], [role="row"], [data-testid="mwthreadlist"]', {
      timeout: 15000,
    }).catch(() => {});

    // Scroll sidebar to load all conversations
    for (let scrollAttempt = 0; scrollAttempt < 10; scrollAttempt++) {
      const scrolled = await page.evaluate(() => {
        const sidebar = document.querySelector('[role="grid"], [role="list"], [role="row"]')?.closest('[role="navigation"]') || 
                        document.querySelector('[role="grid"]')?.parentElement?.parentElement;
        if (sidebar) {
          const prevScrollTop = sidebar.scrollTop;
          sidebar.scrollTop = sidebar.scrollHeight;
          return sidebar.scrollTop !== prevScrollTop;
        }
        // Fallback: scroll window
        window.scrollBy(0, 800);
        return true;
      });
      if (!scrolled) break;
      await new Promise(r => setTimeout(r, 800));
    }

    // Extract all conversation links with names
    const convLinks = await page.evaluate(() => {
      const links: { href: string; name: string; preview: string }[] = [];
      const seen = new Set<string>();

      // Find all links to conversations (includes /messages/t/ and /messages/e2ee/t/)
      const allLinks = document.querySelectorAll('a[href*="/messages/t/"], a[href*="/messages/e2ee/t/"]');
      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        const match = href.match(/\/messages\/(?:e2ee\/)?t\/(\d+)/);
        if (!match) continue;
        const convId = match[1];
        if (seen.has(convId)) continue;
        seen.add(convId);

        // Walk up to find the conversation row container
        let row = link.closest('[role="row"]') || link.closest('[role="listitem"]') || link.parentElement?.parentElement?.parentElement;
        if (!row) row = link;

        // Get name - try multiple strategies
        let name = "";
        // Strategy 1: aria-label on the link
        const ariaLabel = link.getAttribute("aria-label");
        if (ariaLabel) {
          name = ariaLabel.split(",")[0].split(" - ")[0].trim();
        }
        // Strategy 2: span with font-weight bold or specific classes
        if (!name || name === "Unknown") {
          const spans = row.querySelectorAll("span");
          for (const span of spans) {
            const text = span.textContent?.trim() || "";
            const style = window.getComputedStyle(span);
            const fontWeight = parseInt(style.fontWeight) || 0;
            if (text && fontWeight >= 600 && text.length > 1 && text.length < 60 && !text.includes("Messages") && !text.includes("secured")) {
              name = text;
              break;
            }
          }
        }
        // Strategy 3: first substantial text that's not the preview
        if (!name || name === "Unknown") {
          const allText = row.querySelectorAll("span[dir='auto']");
          for (const el of allText) {
            const t = el.textContent?.trim() || "";
            if (t.length > 1 && t.length < 60 && !t.includes("Messages and calls") && !t.includes("secured")) {
              name = t;
              break;
            }
          }
        }

        // Get preview text
        let preview = "";
        const previewSpans = row.querySelectorAll("span[dir='auto']");
        for (const span of previewSpans) {
          const t = span.textContent?.trim() || "";
          if (t.includes("Messages and calls are secured") || t.includes("·")) {
            preview = t;
            break;
          }
        }
        if (!preview) {
          const lastSpan = row.querySelectorAll("span[dir='auto']");
          if (lastSpan.length > 1) preview = lastSpan[lastSpan.length - 1]?.textContent?.trim() || "";
        }

        links.push({ href, name: name || "Unknown", preview });
      }
      return links;
    });

    console.log(`[Facebook] Found ${convLinks.length} conversations in sidebar`);

    // Now click into each conversation and extract actual messages
    const results: { conversationId: string; messages: ScrapedMessage[] }[] = [];

    for (const conv of convLinks) {
      const convIdMatch = conv.href.match(/\/messages\/(?:e2ee\/)?t\/(\d+)/);
      const convId = convIdMatch?.[1];
      if (!convId) continue;

      try {
        // Click into this conversation
        const fullUrl = conv.href.startsWith("http") ? conv.href : `https://www.facebook.com${conv.href}`;
        await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

        // Wait for messages to load
        await page.waitForSelector('[role="row"], [data-testid="message-container"], [role="listitem"]', {
          timeout: 8000,
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1500));

        // Extract messages from the conversation view
        const messages = await page.evaluate((senderName: string) => {
          const msgs: { externalId: string; content: string; senderId: string; senderName: string; sentAt: string }[] = [];
          const seen = new Set<string>();

          // Facebook message bubbles
          const messageEls = document.querySelectorAll('[data-testid="message-container"], [role="row"]');

          for (const el of messageEls) {
            // Get message text
            const textEl = el.querySelector('[data-testid="message-text"], [data-testid="message-text-block"]');
            const content = textEl?.textContent?.trim() || "";
            if (!content || content.length < 1) continue;

            // Deduplicate
            const key = content.substring(0, 50);
            if (seen.has(key)) continue;
            seen.add(key);

            // Determine if sent by user or contact
            // User messages are typically on the right, contact messages on the left
            const isOutgoing = el.querySelector('[data-testid="outgoing_group"]') !== null ||
                              el.closest('[data-testid=" outgoing_group"]') !== null ||
                              el.querySelector('div[style*="text-align: right"]') !== null ||
                              el.querySelector('[aria-label*="You"]') !== null;

            // Try to get sender name from the element
            let msgSender = isOutgoing ? "user" : senderName;
            const nameEl = el.querySelector('[data-testid="message-sender"], [role="link"]');
            if (nameEl && !isOutgoing) {
              const nameText = nameEl.textContent?.trim();
              if (nameText && nameText.length < 60) msgSender = nameText;
            }

            // Try to get timestamp
            let sentAt = new Date().toISOString();
            const timeEl = el.querySelector('[data-testid="message-timestamp"], abbr, [aria-label]');
            if (timeEl) {
              const timeText = timeEl.getAttribute("aria-label") || timeEl.textContent || "";
              // Try parsing relative time like "17w", "3d", "2h"
              const relMatch = timeText.match(/(\d+)([smhdw])/);
              if (relMatch) {
                const num = parseInt(relMatch[1]);
                const unit = relMatch[2];
                const now = Date.now();
                const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
                sentAt = new Date(now - num * (multipliers[unit] || 86400000)).toISOString();
              }
            }

            msgs.push({
              externalId: `fb_${convId}_${seen.size}_${Date.now()}`,
              content,
              senderId: isOutgoing ? "user" : "contact",
              senderName: msgSender,
              sentAt,
            });
          }

          return msgs;
        }, conv.name);

        if (messages.length > 0) {
          results.push({ conversationId: convId, messages });
          console.log(`[Facebook] Conv ${convId} (${conv.name}): ${messages.length} messages`);
        } else {
          // At minimum, save the preview as a message
          results.push({
            conversationId: convId,
            messages: [{
              externalId: `fb_msg_${convId}_${Date.now()}`,
              content: conv.preview || `Conversation with ${conv.name}`,
              senderId: "contact",
              senderName: conv.name,
              sentAt: new Date().toISOString(),
            }],
          });
        }
      } catch (err) {
        console.warn(`[Facebook] Failed to scrape conversation ${convId}:`, err);
        // Save at least the preview
        results.push({
          conversationId: convId,
          messages: [{
            externalId: `fb_msg_${convId}_${Date.now()}`,
            content: conv.preview || `Conversation with ${conv.name}`,
            senderId: "contact",
            senderName: conv.name,
            sentAt: new Date().toISOString(),
          }],
        });
      }
    }

    // Don't close the page - leave it for the user
    return results;
  } finally {
    browser.disconnect();
  }
}

async function scrapeFacebookMessagesViaHTTP(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const headers: Record<string, string> = {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": cookies,
  };

  const res = await fetch("https://www.facebook.com/messages/", {
    headers,
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`Facebook messages returned ${res.status}`);

  const html = await res.text();
  return parseFacebookMessagesPage(html);
}

function parseFacebookMessagesPage(html: string): { conversationId: string; messages: ScrapedMessage[] }[] {
  const results: { conversationId: string; messages: ScrapedMessage[] }[] = [];

  // Extract conversation data from embedded JSON
  const jsonMatch = html.match(/"message_threads":\s*(\{[\s\S]*?\})\s*[,}]/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const threads = data?.threads || [];
      for (const thread of threads) {
        const convId = thread.thread_id || "";
        const messages = (thread.messages || []).map((msg: Record<string, unknown>) => ({
          externalId: String(msg.message_id || `fb_${Date.now()}`),
          content: String(msg.text || ""),
          senderId: String(msg.sender || "unknown"),
          senderName: String(msg.sender_name || ""),
          sentAt: new Date(Number(msg.timestamp) || Date.now()).toISOString(),
        }));
        if (convId && messages.length > 0) {
          results.push({ conversationId: convId, messages });
        }
      }
    } catch { /* fall through */ }
  }

  return results;
}

// ─── Facebook Send Message via CDP ──────────────────────────

export async function sendFacebookMessageViaCDP(
  conversationId: string,
  content: string
): Promise<boolean> {
  if (!(await isBrowserAvailable("FACEBOOK"))) {
    throw new Error("Facebook browser not running. Launch it and sign in first.");
  }

  const { browser } = await connectBrowser("FACEBOOK");
  let page;
  let isNewPage = false;

  try {
    const pages = await browser.pages();
    const existingMsgPage = pages.find((p: any) => p.url().includes('facebook.com/messages'));
    if (existingMsgPage) {
      page = existingMsgPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(`https://www.facebook.com/messages/t/${conversationId}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });

    await page.waitForSelector('[contenteditable="true"], [role="textbox"], form textarea', {
      timeout: 10000,
    });

    const editor = await page.$('[contenteditable="true"], [role="textbox"], form textarea');
    if (!editor) throw new Error("Could not find message input");

    await editor.click();
    await page.keyboard.type(content, { delay: 30 });
    await new Promise(r => setTimeout(r, 500));

    await page.keyboard.press("Enter");

    await new Promise(r => setTimeout(r, 1000));
    console.log(`[Facebook] Message sent to conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error("[Facebook] Send message failed:", error);
    throw error;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

// ─── Twitter/X ──────────────────────────────────────────────

export async function scrapeTwitterSearch(
  query: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapeTwitterSearchViaCDP(query);
    } catch (cdpError) {
      console.warn("[Twitter Search] CDP failed, trying HTTP:", cdpError);
    }
  }

  const headers: Record<string, string> = {
    "User-Agent": randomUA(),
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookies) headers["Cookie"] = cookies;

  try {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers, redirect: "follow" });

    if (!res.ok) {
      const altUrl = `https://nitter.poast.org/search?f=users&q=${encodeURIComponent(query)}`;
      const altRes = await fetch(altUrl, { headers });
      if (altRes.ok) {
        const html = await altRes.text();
        return parseNitterResults(html);
      }
      throw new Error(`Twitter returned ${res.status}`);
    }

    const html = await res.text();
    return parseTwitterResults(html);
  } catch (error) {
    console.error("[Twitter Scraper] Error:", error);
    throw error;
  }
}

async function scrapeTwitterSearchViaCDP(query: string): Promise<ScrapedProfile[]> {
  const { browser } = await connectBrowser("TWITTER");

  let page;
  let isNewPage = false;
  try {
    const pages = await browser.pages();
    const existingXPage = pages.find((p: any) => p.url().includes('x.com') || p.url().includes('twitter.com'));
    if (existingXPage) {
      page = existingXPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=user`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/i/flow/login")) {
      throw new Error("Not logged into X/Twitter. Please log in to the browser first.");
    }

    // Wait for search results
    await page.waitForSelector('[data-testid="UserCell"], [data-testid="cellInnerDiv"], article', {
      timeout: 15000,
    }).catch(() => {});

    // Scroll to load more results
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 1500));
    }

    const profiles = await page.evaluate(() => {
      const results: { externalId: string; firstName: string; lastName: string; profileUrl: string; avatarUrl?: string; bio?: string; jobTitle?: string }[] = [];
      const seen = new Set<string>();

      // X/Twitter user cells
      const userCells = document.querySelectorAll('[data-testid="UserCell"], [data-testid="cellInnerDiv"]');

      for (const cell of Array.from(userCells)) {
        try {
          // Get profile link
          const linkEl = cell.querySelector('a[href*="/"]');
          const href = linkEl?.getAttribute("href") || "";
          const usernameMatch = href.match(/\/([A-Za-z0-9_]+)$/);
          if (!usernameMatch) continue;

          const username = usernameMatch[1];
          if (seen.has(username) || ["search", "explore", "home", "notifications", "messages", "settings"].includes(username)) continue;
          seen.add(username);

          // Get display name
          const nameEl = cell.querySelector('[data-testid="UserName"], span[class*="css-"]');
          const fullName = nameEl?.textContent?.trim() || "";
          const nameParts = fullName.replace(/@.*/, "").trim().split(" ").filter(Boolean);

          // Get bio
          const bioEl = cell.querySelector('[data-testid="UserDescription"], [dir="auto"]');
          const bio = bioEl?.textContent?.trim() || undefined;

          // Get avatar
          const avatarEl = cell.querySelector('img[src*="pbs.twimg.com"], img[src*="profile_images"]');
          const avatarUrl = avatarEl?.getAttribute("src") || undefined;

          results.push({
            externalId: username,
            firstName: nameParts[0] || username,
            lastName: nameParts.slice(1).join(" ") || "",
            profileUrl: `https://x.com/${username}`,
            avatarUrl,
            bio,
          });
        } catch {}
      }
      return results;
    });

    console.log(`[Twitter CDP] Found ${profiles.length} results for "${query}"`);
    return profiles;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

function parseTwitterResults(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];
  const userRegex = /data-user-id="(\d+)"[\s\S]*?class="[^"]*username[^"]*"[^>]*>@?([^<]+)<[\s\S]*?class="[^"]*FullName[^"]*"[^>]*>([^<]+)</gi;
  let match;
  while ((match = userRegex.exec(html)) !== null) {
    const parts = match[3].trim().split(" ");
    results.push({
      externalId: match[1],
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      profileUrl: `https://x.com/${match[2].trim()}`,
    });
  }
  return results;
}

function parseNitterResults(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];
  const cardRegex = /<div[^>]*class="[^"]*user-card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const linkRegex = /<a[^>]*href="\/([^"]+)"[^>]*class="[^"]*fullname[^"]*"[^>]*>([^<]+)<\/a>/gi;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const linkMatch = linkRegex.exec(match[1]);
    if (linkMatch) {
      const parts = linkMatch[2].trim().split(" ");
      results.push({
        externalId: linkMatch[1],
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        profileUrl: `https://x.com/${linkMatch[1]}`,
      });
    }
  }
  return results;
}

// ─── Twitter/X Messages ─────────────────────────────────────

export async function scrapeTwitterMessages(
  cookies: string
): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapeTwitterMessagesViaCDP();
    } catch (cdpError) {
      console.warn("[Twitter Messages] CDP failed:", cdpError);
    }
  }

  // HTTP fallback is very limited for Twitter DMs without API v2
  console.warn("[Twitter Messages] DM sync requires browser login or API v2 bearer token");
  return [];
}

async function scrapeTwitterMessagesViaCDP(): Promise<{ conversationId: string; messages: ScrapedMessage[] }[]> {
  const { browser } = await connectBrowser("TWITTER");

  try {
    // Find existing X/Twitter tab or create new one
    const pages = await browser.pages();
    let page = pages.find((p: any) => p.url().includes("x.com") || p.url().includes("twitter.com"));
    if (!page) {
      page = await browser.newPage();
    }

    await page.goto("https://x.com/messages", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/i/flow/login")) {
      throw new Error("Not logged into X/Twitter");
    }

    await page.waitForSelector('[data-testid="conversation"], [role="listitem"], [data-testid="cellInnerDiv"]', {
      timeout: 15000,
    }).catch(() => {});

    // Scroll to load more conversations
    for (let i = 0; i < 8; i++) {
      const scrolled = await page.evaluate(() => {
        const sidebar = document.querySelector('[aria-label="Search and accounts"]')?.parentElement ||
                        document.querySelector('[data-testid="cellInnerDiv"]')?.parentElement?.parentElement;
        if (sidebar) {
          const prev = sidebar.scrollTop;
          sidebar.scrollTop = sidebar.scrollHeight;
          return sidebar.scrollTop !== prev;
        }
        return false;
      });
      if (!scrolled) break;
      await new Promise(r => setTimeout(r, 800));
    }

    // Extract conversation links
    const convLinks = await page.evaluate(() => {
      const links: { href: string; name: string; preview: string }[] = [];
      const seen = new Set<string>();

      const allLinks = document.querySelectorAll('a[href*="/messages/"]');
      for (const link of allLinks) {
        const href = link.getAttribute("href") || "";
        const match = href.match(/\/messages\/(\d+-\d+)/);
        if (!match) continue;
        const convId = match[1];
        if (seen.has(convId)) continue;
        seen.add(convId);

        let row = link.closest('[role="listitem"]') || link.closest('[data-testid="conversation"]') || link.parentElement?.parentElement;

        let name = "";
        const nameEl = row?.querySelector('[data-testid="conversationName"]');
        if (nameEl) name = nameEl.textContent?.trim() || "";
        if (!name) {
          const spans = row?.querySelectorAll('span[aria-hidden="true"]');
          if (spans && spans.length > 0) name = spans[0].textContent?.trim() || "";
        }

        let preview = "";
        const previewEl = row?.querySelector('[data-testid="lastMessage"]');
        if (previewEl) preview = previewEl.textContent?.trim() || "";

        links.push({ href, name: name || "Unknown", preview });
      }
      return links;
    });

    console.log(`[Twitter] Found ${convLinks.length} conversations`);

    // Click into each conversation to get actual messages
    const results: { conversationId: string; messages: ScrapedMessage[] }[] = [];

    for (const conv of convLinks) {
      const match = conv.href.match(/\/messages\/(\d+-\d+)/);
      const convId = match?.[1];
      if (!convId) continue;

      try {
        const fullUrl = conv.href.startsWith("http") ? conv.href : `https://x.com${conv.href}`;
        await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 15000 });

        await page.waitForSelector('[data-testid="messageEntry"], [data-testid="message-text"]', {
          timeout: 8000,
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1500));

        const messages = await page.evaluate((senderName: string) => {
          const msgs: { externalId: string; content: string; senderId: string; senderName: string; sentAt: string }[] = [];
          const seen = new Set<string>();

          const messageEls = document.querySelectorAll('[data-testid="messageEntry"]');

          for (const el of messageEls) {
            const textEl = el.querySelector('[data-testid="message-text"]');
            const content = textEl?.textContent?.trim() || "";
            if (!content || content.length < 1) continue;

            const key = content.substring(0, 50);
            if (seen.has(key)) continue;
            seen.add(key);

            // X shows user messages on the right side (check for specific testid or alignment)
            const isOutgoing = el.querySelector('[data-testid="outgoing_group"]') !== null;

            let sentAt = new Date().toISOString();
            const timeEl = el.querySelector('time, [datetime]');
            if (timeEl) {
              const dt = timeEl.getAttribute("datetime");
              if (dt) sentAt = dt;
            }

            msgs.push({
              externalId: `x_${convId}_${seen.size}_${Date.now()}`,
              content,
              senderId: isOutgoing ? "user" : "contact",
              senderName: isOutgoing ? "You" : senderName,
              sentAt,
            });
          }

          return msgs;
        }, conv.name);

        if (messages.length > 0) {
          results.push({ conversationId: convId, messages });
          console.log(`[Twitter] Conv ${convId}: ${messages.length} messages`);
        } else {
          results.push({
            conversationId: convId,
            messages: [{
              externalId: `x_msg_${convId}_${Date.now()}`,
              content: conv.preview || `Conversation with ${conv.name}`,
              senderId: "contact",
              senderName: conv.name,
              sentAt: new Date().toISOString(),
            }],
          });
        }
      } catch (err) {
        console.warn(`[Twitter] Failed to scrape conversation ${convId}:`, err);
        results.push({
          conversationId: convId,
          messages: [{
            externalId: `x_msg_${convId}_${Date.now()}`,
            content: conv.preview || `Conversation with ${conv.name}`,
            senderId: "contact",
            senderName: conv.name,
            sentAt: new Date().toISOString(),
          }],
        });
      }
    }

    return results;
  } finally {
    browser.disconnect();
  }
}

// ─── Twitter/X Send Message via CDP ─────────────────────────

export async function sendTwitterMessageViaCDP(
  conversationId: string,
  content: string
): Promise<boolean> {
  if (!(await isBrowserAvailable("TWITTER"))) {
    throw new Error("Twitter browser not running. Launch it and sign in first.");
  }

  const { browser } = await connectBrowser("TWITTER");
  let page;
  let isNewPage = false;

  try {
    const pages = await browser.pages();
    const existingMsgPage = pages.find((p: any) => p.url().includes('x.com/messages'));
    if (existingMsgPage) {
      page = existingMsgPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(`https://x.com/messages/${conversationId}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });

    await page.waitForSelector('[data-testid="tweetTextarea_0"], [role="textbox"], form [contenteditable="true"]', {
      timeout: 10000,
    });

    const editor = await page.$('[data-testid="tweetTextarea_0"], [role="textbox"], form [contenteditable="true"]');
    if (!editor) throw new Error("Could not find message input");

    await editor.click();
    await page.keyboard.type(content, { delay: 30 });
    await new Promise(r => setTimeout(r, 500));

    const sendBtn = await page.$('[data-testid="dmComposerSendButton"], [data-testid="tweetButtonInline"]');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log(`[Twitter] Message sent to conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error("[Twitter] Send message failed:", error);
    throw error;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

// ─── Threads ────────────────────────────────────────────────

export async function scrapeThreadsSearch(
  query: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  const headers: Record<string, string> = {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (cookies) headers["Cookie"] = cookies;

  try {
    const url = `https://www.threads.net/search?q=${encodeURIComponent(query)}&serp_type=default`;
    const res = await fetch(url, { headers, redirect: "follow" });
    if (!res.ok) throw new Error(`Threads returned ${res.status}`);
    const html = await res.text();
    return parseThreadsResults(html);
  } catch (error) {
    console.error("[Threads Scraper] Error:", error);
    throw error;
  }
}

function parseThreadsResults(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];
  const jsonMatch = html.match(/"user":\{"username":"([^"]+)"[^}]*"full_name":"([^"]+)"/g);
  if (jsonMatch) {
    for (const match of jsonMatch) {
      const usernameMatch = match.match(/"username":"([^"]+)"/);
      const nameMatch = match.match(/"full_name":"([^"]+)"/);
      if (usernameMatch && nameMatch) {
        const parts = nameMatch[1].split(" ");
        results.push({
          externalId: usernameMatch[1],
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          profileUrl: `https://www.threads.net/@${usernameMatch[1]}`,
        });
      }
    }
  }
  return results;
}

// ─── PeoplePerHour ──────────────────────────────────────────

export async function scrapePeoplePerHour(
  query: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  if (await isCDPAvailable()) {
    try {
      return await scrapePeoplePerHourViaCDP(query);
    } catch (cdpError) {
      console.warn("[PeoplePerHour] CDP failed, trying HTTP:", cdpError);
    }
  }

  const headers: Record<string, string> = {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookies) headers["Cookie"] = cookies;

  try {
    // Search for freelancers
    const url = `https://www.peopleperhour.com/freelancers?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers, redirect: "follow" });
    if (!res.ok) {
      // Fallback to job search
      const jobUrl = `https://www.peopleperhour.com/freelance-jobs?keyword=${encodeURIComponent(query)}`;
      const jobRes = await fetch(jobUrl, { headers, redirect: "follow" });
      if (!jobRes.ok) throw new Error(`PeoplePerHour returned ${res.status}`);
      const jobHtml = await jobRes.text();
      return parsePeoplePerHourJobs(jobHtml);
    }

    const html = await res.text();
    return parsePeoplePerHourFreelancers(html);
  } catch (error) {
    console.error("[PeoplePerHour Scraper] Error:", error);
    throw error;
  }
}

async function scrapePeoplePerHourViaCDP(query: string): Promise<ScrapedProfile[]> {
  const { browser } = await connectBrowser("PEOPLEPERHOUR");

  let page;
  let isNewPage = false;
  try {
    const pages = await browser.pages();
    const existingPPHPage = pages.find((p: any) => p.url().includes('peopleperhour.com'));
    if (existingPPHPage) {
      page = existingPPHPage;
    } else {
      page = await browser.newPage();
      isNewPage = true;
    }

    await page.goto(`https://www.peopleperhour.com/freelancers?keyword=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait for freelancer cards to load
    await page.waitForSelector('[class*="freelancer"], [class*="provider"], [data-provider-id], .profile-card', {
      timeout: 10000,
    }).catch(() => {});

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 1500));
    }

    const profiles = await page.evaluate(() => {
      const results: { externalId: string; firstName: string; lastName: string; jobTitle?: string; profileUrl: string; avatarUrl?: string; location?: string; bio?: string }[] = [];
      const seen = new Set<string>();

      // PeoplePerHour freelancer cards - multiple selector strategies
      const cards = document.querySelectorAll('[class*="freelancer"], [class*="provider"], [data-provider-id], .profile-card, [class*="SearchResult"]');

      for (const card of Array.from(cards)) {
        try {
          // Get profile link
          const linkEl = card.querySelector('a[href*="/freelancer/"], a[href*="/freelancer"]');
          const href = linkEl?.getAttribute("href") || "";
          const idMatch = href.match(/\/freelancer\/([^/?]+)/);
          const externalId = idMatch?.[1] || "";

          if (!externalId || seen.has(externalId)) continue;
          seen.add(externalId);

          // Get name
          const nameEl = card.querySelector('[class*="name"], [class*="Name"], h3, h4, .title');
          const fullName = nameEl?.textContent?.trim() || "";
          const nameParts = fullName.split(" ").filter(Boolean);

          // Get job title/skills
          const titleEl = card.querySelector('[class*="title"], [class*="skill"], [class*="speciality"]');
          const jobTitle = titleEl?.textContent?.trim() || undefined;

          // Get avatar
          const avatarEl = card.querySelector('img[src*="pph"], img[class*="avatar"], img');
          const avatarUrl = avatarEl?.getAttribute("src") || undefined;

          // Get location
          const locationEl = card.querySelector('[class*="location"], [class*="country"]');
          const location = locationEl?.textContent?.trim() || undefined;

          // Get rate
          const rateEl = card.querySelector('[class*="rate"], [class*="price"]');
          const rate = rateEl?.textContent?.trim() || undefined;

          const profileUrl = href.startsWith("http") ? href : `https://www.peopleperhour.com${href}`;

          if (fullName.length > 1) {
            results.push({
              externalId,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              jobTitle: jobTitle || rate,
              profileUrl,
              avatarUrl,
              location,
              bio: rate ? `Rate: ${rate}` : undefined,
            });
          }
        } catch {}
      }
      return results;
    });

    console.log(`[PeoplePerHour CDP] Found ${profiles.length} freelancers for "${query}"`);
    return profiles;
  } finally {
    if (page && isNewPage) await page.close().catch(() => {});
    browser.disconnect();
  }
}

function parsePeoplePerHourFreelancers(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];

  // Strategy 1: JSON-LD structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      const jsonStr = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
      try {
        const data = JSON.parse(jsonStr);
        if (data["@type"] === "Person" || data["@type"] === "Freelancer") {
          const name = data.name || "";
          const parts = name.split(" ");
          results.push({
            externalId: data.identifier || data.url?.match(/\/freelancer\/([^/?]+)/)?.[1] || "",
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
            jobTitle: data.jobTitle || data.occupation?.name,
            profileUrl: data.url || "",
            avatarUrl: data.image || undefined,
            location: data.address?.addressLocality || undefined,
          });
        }
      } catch {}
    }
  }

  // Strategy 2: Data attributes
  if (results.length === 0) {
    const cardRegex = /data-provider-id="(\d+)"[\s\S]*?class="[^"]*name[^"]*"[^>]*>([^<]+)<[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]+)</gi;
    let match;
    while ((match = cardRegex.exec(html)) !== null) {
      const parts = match[2].trim().split(" ");
      results.push({
        externalId: match[1],
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        jobTitle: match[3].trim(),
        profileUrl: `https://www.peopleperhour.com/freelancer/${match[1]}`,
      });
    }
  }

  // Strategy 3: Generic HTML parsing
  if (results.length === 0) {
    const linkRegex = /<a[^>]*href="[^"]*\/freelancer\/([^"?/]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const id = match[1];
      const text = match[2].replace(/<[^>]+>/g, "").trim();
      const parts = text.split(" ").filter(Boolean);
      if (parts.length >= 2 && !results.find(r => r.externalId === id)) {
        results.push({
          externalId: id,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          profileUrl: `https://www.peopleperhour.com/freelancer/${id}`,
        });
      }
    }
  }

  return results;
}

function parsePeoplePerHourJobs(html: string): ScrapedProfile[] {
  const results: ScrapedProfile[] = [];

  // Extract job posters from PeoplePerHour job listings
  const jobRegex = /data-buyer-id="(\d+)"[\s\S]*?class="[^"]*name[^"]*"[^>]*>([^<]+)<[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]+)</gi;
  let match;
  while ((match = jobRegex.exec(html)) !== null) {
    const parts = match[2].trim().split(" ");
    results.push({
      externalId: `pph_buyer_${match[1]}`,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      jobTitle: match[3].trim(),
      profileUrl: `https://www.peopleperhour.com/freelancer/${match[1]}`,
    });
  }

  // Fallback: generic link extraction
  if (results.length === 0) {
    const linkRegex = /<a[^>]*href="[^"]*\/freelancer\/([^"?/]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match2;
    while ((match2 = linkRegex.exec(html)) !== null) {
      const id = match2[1];
      const text = match2[2].replace(/<[^>]+>/g, "").trim();
      const parts = text.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        results.push({
          externalId: id,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          profileUrl: `https://www.peopleperhour.com/freelancer/${id}`,
        });
      }
    }
  }

  return results;
}

// ─── Unified Scraper ────────────────────────────────────────

export async function scrape(
  platform: string,
  query: string,
  cookies?: string
): Promise<ScrapedProfile[]> {
  switch (platform) {
    case "LINKEDIN":
      return scrapeLinkedInSearch(query, cookies);
    case "FACEBOOK":
      return scrapeFacebookGroup(query, cookies);
    case "TWITTER":
      return scrapeTwitterSearch(query, cookies);
    case "THREADS":
      return scrapeThreadsSearch(query, cookies);
    case "PEOPLEPERHOUR":
      return scrapePeoplePerHour(query, cookies);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
