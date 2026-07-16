const PLATFORM_DOMAINS = {
  LINKEDIN: [".linkedin.com", "www.linkedin.com", "linkedin.com"],
  FACEBOOK: [".facebook.com", "www.facebook.com", "facebook.com", "m.facebook.com"],
  TWITTER: [".twitter.com", "www.twitter.com", "twitter.com", "x.com", ".x.com", "www.x.com"],
};

async function exportCookies(platform) {
  const btn = document.getElementById(`btn-${platform.toLowerCase()}`);
  const result = document.getElementById("result");

  btn.innerHTML = `<div class="icon" style="background: #0a66c2"><span class="spinner"></span></div><div class="text"><div class="name">Exporting...</div><div class="desc">Reading cookies...</div></div>`;
  btn.disabled = true;
  result.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let hostname = "";
    if (tab?.url) {
      try { hostname = new URL(tab.url).hostname; } catch {}
    }

    const allCookies = [];

    for (const domain of PLATFORM_DOMAINS[platform] || []) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        if (cookies.length) allCookies.push(...cookies);
      } catch {}
    }

    if (allCookies.length === 0 && hostname) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: "." + hostname });
        if (cookies.length) allCookies.push(...cookies);
      } catch {}
      try {
        const cookies = await chrome.cookies.getAll({ domain: hostname });
        if (cookies.length) allCookies.push(...cookies);
      } catch {}
    }

    if (allCookies.length === 0) {
      try {
        const all = await chrome.cookies.getAll({});
        const filtered = all.filter(c => {
          const d = c.domain.toLowerCase();
          return (platform === "LINKEDIN" && d.includes("linkedin")) ||
                 (platform === "FACEBOOK" && d.includes("facebook")) ||
                 (platform === "TWITTER" && (d.includes("twitter") || d.includes("x.com")));
        });
        allCookies.push(...filtered);
      } catch {}
    }

    if (allCookies.length === 0) {
      throw new Error(`No cookies found for ${platform}. 
Are you on a ${platform.toLowerCase()} page and logged in?
Current page: ${hostname || "unknown"}`);
    }

    const unique = [];
    const seen = new Set();
    for (const c of allCookies) {
      const key = `${c.name}|${c.domain}|${c.path}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }

    const cookieString = unique
      .filter(c => c.name && c.value)
      .map(c => `${c.name}=${c.value}`)
      .join("; ");

    const cookieNames = unique.map(c => c.name).join(", ");
    btn.innerHTML = `<div class="icon" style="background: #f59e0b"><span class="spinner"></span></div><div class="text"><div class="name">Sending ${unique.length} cookies...</div><div class="desc">${cookieNames}</div></div>`;

    let response;
    try {
      response = await fetch("http://localhost:3000/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accessToken: cookieString }),
      });
    } catch {
      throw new Error("Cannot reach localhost:3000. Is `npm run dev` running in apps/web?");
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server ${response.status}`);
    }

    result.className = "result success";
    result.innerHTML = `<strong>Connected!</strong> ${unique.length} cookies saved<div class="cookies">${cookieNames}</div>`;
    result.style.display = "block";

    btn.innerHTML = `<div class="icon" style="background: #22c55e">✓</div><div class="text"><div class="name">${platform} Connected</div><div class="desc">${unique.length} cookies exported</div></div>`;

    await chrome.storage.local.set({ [`lastExport_${platform}`]: new Date().toISOString() });
  } catch (err) {
    result.className = "result error";
    result.innerHTML = `<strong>Error</strong> ${err.message}`;
    result.style.display = "block";

    const names = { LINKEDIN: "LinkedIn", FACEBOOK: "Facebook", TWITTER: "Twitter / X" };
    btn.innerHTML = `<div class="icon" style="background: #0a66c2">in</div><div class="text"><div class="name">${names[platform]}</div><div class="desc">Click to export ${names[platform]} cookies</div></div>`;
  }

  btn.disabled = false;
}

// Add event listeners after function is defined
document.getElementById('btn-linkedin').addEventListener('click', () => exportCookies('LINKEDIN'));
document.getElementById('btn-facebook').addEventListener('click', () => exportCookies('FACEBOOK'));
document.getElementById('btn-twitter').addEventListener('click', () => exportCookies('TWITTER'));