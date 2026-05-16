---
name: google-calendar-meet
description: This skill should be used when the user wants to integrate Google Calendar or Google Meet into a project, schedule meetings programmatically, create calendar events with Meet links, set up the Apps Script webhook approach (no Google Cloud Console needed), add meeting scheduling to a Node.js/Express app, or asks about "calendar integration", "meet link", "schedule meeting via API", "Apps Script calendar", or "create Google Meet without OAuth".
version: 1.0.0
---

# Google Calendar + Meet Integration Skill

Adds real Google Calendar event creation with Google Meet links to any Node.js project — **no Google Cloud Console or OAuth setup required**. Uses a Google Apps Script Web App as the bridge.

## How It Works

```
Your Server  →  POST JSON  →  Apps Script Web App  →  Google Calendar API  →  Event + Meet link returned
```

- The Apps Script runs **as the deployer's Google account** — no OAuth flow needed in your app
- Google Calendar API v3 is available inside Apps Script as a built-in Advanced Service
- Meet links are generated automatically via `conferenceData`
- Attendee invites are sent automatically on event creation

---

## Step 1 — Deploy the Apps Script

1. Go to **https://script.google.com** → New Project
2. Paste the full Apps Script code (see `references/apps-script.js`)
3. In the editor: **Services** (+ icon) → add **Google Calendar API** → Save
4. **Deploy → New Deployment**
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Click **Deploy** → authorize when prompted (allows Calendar access)
6. Copy the **Web App URL** — looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`
7. Add to your `.env`:
   ```
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```

> **Re-deploy required** after any Apps Script code changes:
> Deploy → Manage Deployments → Edit → New version → Deploy

---

## Step 2 — Add `calendar.js` to Your Project

Copy `references/calendar.js` into your server directory. It:
- Accepts an action object with meeting details
- Builds correct IST (`+05:30`) timestamps
- Guards against AI-hallucinated past dates (auto-corrects to tomorrow)
- Filters attendees to your domain only
- Backfills missing fields (title, attendees) from payload if Apps Script doesn't echo them
- Returns structured result with `meetLink`, `eventLink`, `attendees`

```js
const { createCalendarEvent } = require('./calendar');

// action.details must include:
// date (YYYY-MM-DD), time (HH:MM), duration_min, attendees ([]), 
// description, agenda, doc_links ([]), fallback_title
const result = await createCalendarEvent(action);
// result: { status, title, meetLink, eventLink, attendees, attendeeCount }
```

---

## Step 3 — Handle the Response

```js
if (result.status === 'done') {
  // result.meetLink  — e.g. https://meet.google.com/abc-defg-hij
  // result.eventLink — link to the event in Google Calendar
  // result.attendees — array of emails that were invited
  // result.attendeeCount
}

if (result.status === 'done_no_meet') {
  // Event created but no Meet link (Calendar API Advanced Service not added)
  // result.note contains the reason
}

if (result.status === 'fallback') {
  // Apps Script fell back to CalendarApp (basic event, no Meet)
}

if (result.status === 'error') {
  // result.message — error details
}
```

---

## Payload Schema (sent to Apps Script)

```json
{
  "title":          "Meeting title",
  "description":    "Full context of why this meeting is happening",
  "agenda":         "• Point 1\n• Point 2",
  "start":          "2026-05-17T10:00:00+05:30",
  "end":            "2026-05-17T10:30:00+05:30",
  "attendees":      ["user@yourdomain.com", "other@yourdomain.com"],
  "doc_links":      ["https://your-project-tracker/ticket/123"],
  "fallback_title": "Discussion: Problem summary"
}
```

### Rules
- **Attendee domain lock**: Filter attendees to your org domain before sending (prevents external spam)
- **Timezone**: Always use `+05:30` (IST) offset in timestamps for India-based teams
- **Past date guard**: Validate `start` is in the future before calling Apps Script
- **fallback_title**: Always include — used if primary creation fails

---

## .env Variables Required

```
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyhgtTiz4HgIjWJKbVZr4hU7uSgAQb9-q1WeArRbFIHjEpHKImxjqWtxvT4wGGykOib/exec
```

No other Google credentials needed.

---

## Failure Modes & Fallbacks

| Scenario | Behaviour |
|---|---|
| Calendar API not added as Service | Falls back to `CalendarApp` — event created, no Meet link |
| Invalid date/time | Apps Script returns `status: error` |
| Past date from AI | `calendar.js` corrects to tomorrow before sending |
| Apps Script unreachable | `node-fetch` throws — wrap in try/catch in your execute route |
| Attendee not in domain | Filtered out before sending — never passed to Apps Script |

---

## Integrating with AI Agent Actions

When using with an LLM agent, include this in your system prompt:

```
For calendar_invite actions, always include:
- date: YYYY-MM-DD (use actual today's date injected at runtime for reference)
- time: HH:MM 24h format
- duration_min: integer
- attendees: domain-filtered email array
- description: full context paragraph
- agenda: newline-separated bullet points  
- doc_links: any ticket/doc URLs relevant to the meeting
- fallback_title: "Discussion: <topic>" or "Sync: <name1>/<name2>"
```

Inject today's date into the system prompt at request time to prevent the model from hallucinating past dates:
```js
const today = new Date().toISOString().split('T')[0];
// Include in system prompt: `TODAY'S DATE: ${today}`
```

---

## Files in This Skill

| File | Purpose |
|---|---|
| `SKILL.md` | This guide |
| `references/apps-script.js` | Full Apps Script code — paste into script.google.com |
| `references/calendar.js` | Node.js calendar client module — copy into your project |