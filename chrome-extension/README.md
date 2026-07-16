# AI Sales OS - Chrome Extension

One-click cookie export for LinkedIn, Facebook, and Twitter.

## Install (30 seconds)

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. Done! The extension icon appears in your toolbar

## Usage

1. Log into LinkedIn (or Facebook/Twitter) in your browser
2. Click the **AI Sales OS** extension icon
3. Click the platform button
4. Cookies are sent to your local AI Sales OS automatically

## Why?

LinkedIn's important cookies (`li_at`, `JSESSIONID`) are `HttpOnly` — meaning `document.cookie` in the console can't see them. This extension uses Chrome's Cookie API to grab everything, including HttpOnly cookies.

## Troubleshooting

- **"No cookies found"** — Make sure you're logged into the platform in the CURRENT tab
- **Connection error** — Make sure AI Sales OS is running on `localhost:3000`
