# Follow-up Tracker (PWA)

A tiny, installable web app that helps you log a client right after you send a WhatsApp message and get a reminder at the right time — **via Google Calendar**, which already pings both your phone and your PC.

- **Cost:** $0 (free hosting; optional custom domain ~$5/yr)
- **Reminder time:** events are created as all-day on the due date, so they notify at your Google Calendar's *default* reminder time. Open Google Calendar → Settings → your calendar → "Default notifications" and set, e.g., "1 day before at 9:00 AM".
- **Legit / ToS-safe:** never talks to WhatsApp, never sends messages, never scrapes. It only logs your own activity and uses your own calendar.
- **Offline-capable & installable** on Android and desktop Chrome/Edge.

## How it works

1. You send a message to a client in WhatsApp (app or desktop).
2. Switch to the app (home-screen icon on phone / bookmark on PC).
3. Tap **"Log a follow-up"**, enter client name + optional note + delay (1d / 2d / 3d / 1w / 2w / 1m / custom).
4. It saves the record on this device **and opens a pre-filled Google Calendar event** in a new tab.
5. Tap **"Save"** once in Calendar → the reminder is now in your calendar and will notify you on phone + PC on the due date.
6. When you follow up, mark it done (or snooze +3 days).

## Run locally (no setup)

```bash
cd client-followup
python3 -m http.server 8080
# open http://localhost:8080
```

## Host it for free (so it installs on your phone)

Pick one:

- **GitHub Pages:** push the folder to a repo → Settings → Pages → deploy from main branch.
- **Vercel / Netlify:** drag-and-drop the folder in their dashboard; you get a `https://...vercel.app` URL.

Then on your phone (Chrome for Android): open the URL → menu → **"Add to Home screen"** / **"Install app"**. On PC (Chrome/Edge): address bar install icon.

## Optional: automatic (no "Save" click) reminders

If you want events created *without* the manual "Save" step, use the Google Calendar API with OAuth:

1. Create a Google Cloud project → enable "Google Calendar API" → create an OAuth 2.0 Client ID (web).
2. Add the OAuth flow in `app.js` (`gapi`/Google Identity Services) and call `events.insert`.
3. This requires a Google account sign-in step but makes reminders 100% automatic.

The current default (TEMPLATE link) works with **zero setup** and is recommended for a personal tool.

## Ban-safety reminders

- ✅ Logging your own sent messages, using WhatsApp Business Labels, scheduling your own reminders.
- ❌ No `whatsapp-web.js` or any auto-sender. No mass outreach. No scraping chat content automatically.
- ❌ Don't mix an API-based WhatsApp account with the same number you use in the app.

## Troubleshooting

- **"Popup blocked" toast after logging:** allow pop-ups for the app/site, or tap "Open calendar" on the item. (Mobile often blocks new tabs; allowing pop-ups fixes it.)
- **Reminders not firing:** check Google Calendar's default notification settings for that calendar.
- **Lost data after clearing browser:** data is stored in `localStorage` on that device/browser. Use **Export (CSV)** occasionally as a backup, or self-host with a small backend if you need cross-device sync.

## Files

- `index.html` — UI
- `styles.css` — styling (mobile-first)
- `app.js` — logic, storage, calendar link builder
- `manifest.json` — PWA install metadata
- `sw.js` — service worker (offline cache)
- `icons/` — generated PWA icons
