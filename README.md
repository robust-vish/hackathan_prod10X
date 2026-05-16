# IndiaMART Project Planner — AI Productivity Copilot

> **Hackathon 2026** — An AI agent that replaces 15–30 minutes of manual ticket management with a single natural language prompt.

---

## What Is This?

**IndiaMART Project Planner** is an AI-powered engineering productivity agent built for IndiaMART's internal OpenProject platform. Engineering, QA, and product teams currently spend 20–30% of their time on manual ticket workflows — creating tickets, assigning people, writing descriptions, sending emails, and planning meetings. This agent automates all of it.

A single chat message like:

> *"Create a High priority bug in Android bucket — tender page goes blank on load. Assign to Vishal Bairagi, accountable Braj Mohan. Attach this screenshot."*

…automatically:
- Creates the OpenProject ticket with a structured description
- Uploads the screenshot to the ticket's Files section
- Resolves and assigns the correct team members
- Sends Gmail notifications to both assignee and accountable
- Schedules a Google Meet discussion for the next day at 2 PM–3 PM IST

And a message like:

> *"Analyse ticket #664712"*

…automatically:
- Fetches all ticket data (title, description, comments, attachments)
- Classifies the ticket as Bug or Story
- Generates a full RCA, 5+ test cases, edge cases, suggested fix, and regression checklist (for bugs)
- Or generates an A/B experiment design, metrics, success criteria, and risk analysis (for stories)

---

## The Problem

At IndiaMART, teams manage hundreds of tickets weekly in OpenProject. Every ticket involves multiple manual steps across different tools:

| Task | Manual Effort |
|---|---|
| Create a ticket (subject, description, type, priority, assignee) | 15–30 min |
| Send notification emails to assignee and accountable | 5–10 min |
| Schedule a Google Meet for discussion | 5–10 min |
| Write test cases for a bug ticket | 1–2 hours |
| Perform Root Cause Analysis | 1–2 hours |
| Design A/B experiment for a story ticket | 1–2 hours |

**Engineering teams spend 20–30% of their time on this overhead instead of building features.**

---

## The Solution

Two AI-powered capabilities, both accessible from a single chat interface:

### Capability 1 — Intelligent Ticket Creation

**Input:** Natural language prompt + optional file attachments

**What gets automated in one step:**
1. AI parses subject, description, project, assignee, accountable, type, and priority from free text
2. Fuzzy-matches project name against all 178 OpenProject buckets
3. Fuzzy-matches person names against actual project members
4. Creates the ticket in OpenProject with structured description
5. Uploads attached files to the ticket's Files section
6. Schedules a Google Meet (next day, 2 PM–3 PM IST) with a real Meet link
7. Sends Gmail notifications to assignee and accountable with ticket URL and Meet link

### Capability 2 — Ticket Analysis and Planning

**Input:** OpenProject ticket ID

**What gets generated in one step:**
- **Bug tickets** → Test cases, RCA, suggested fix, regression checklist, severity assessment
- **Story/UI tickets** → A/B hypothesis, variant design, experiment metrics, success criteria, risk analysis

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                React 18 + TypeScript + Vite                  │
│          ChatGPT-style chat interface with steps panel       │
│                  Tailwind CSS + Lucide Icons                 │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP REST  (:8000/api/*)
┌────────────────────────────▼─────────────────────────────────┐
│                          BACKEND                             │
│                     Python FastAPI                           │
│   POST /api/analyze          POST /api/create-ticket         │
│   GET  /api/projects         GET  /api/projects/{id}/members │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
┌──────────▼──────────┐          ┌────────────▼──────────────┐
│  OpenProject API    │          │       Groq LLM Layer       │
│  project.intermesh  │          │   Llama 3.3 70B (primary)  │
│  .net/api/v3        │          │   Llama 3.1 8B (fallback)  │
│  Basic Auth: apikey │          │   compound-beta-mini (last)│
└─────────────────────┘          └───────────────────────────┘
           │
┌──────────▼────────────────────────────────────────────────┐
│                  Google Services Layer                     │
│  Apps Script (Email)     Apps Script (Calendar + Meet)    │
│  → Gmail notifications   → Google Calendar API            │
│  → Assignee + accountable → Real Meet link generation     │
└───────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev, great ecosystem |
| Styling | Tailwind CSS + Lucide Icons | Rapid modern UI |
| Backend | Python FastAPI + Uvicorn | Best AI/ML ecosystem, async |
| AI / LLM | Groq — Llama 3.3 70B | Free, fast, works from India |
| Ticket API | OpenProject REST API v3 | IndiaMART's project tracker |
| Email | Google Apps Script + Gmail | No SMTP config needed |
| Calendar | Google Apps Script + Calendar API | Real Meet links, no OAuth flow |

---

## Prerequisites

Before running the project, you need:

- **Python 3.11+** — for the backend
- **Node.js 18+** — for the frontend
- **OpenProject API token** — from project.intermesh.net
- **Groq API key (free)** — from https://console.groq.com
- **Google account** — to deploy Apps Script web apps (for email + calendar)

---

## Quick Start

### Step 1 — Clone and configure

```bash
git clone <repo-url>
cd Hackathon
```

Create `backend/.env` from the template:

```bash
copy backend\.env.example backend\.env
```

Edit `backend/.env` and fill in your keys (see [Configuration](#configuration) below).

### Step 2 — One-click start (Windows)

Double-click `start.bat` — it opens two terminal windows and starts both servers.

```
Backend:  http://localhost:8000
Frontend: http://localhost:5173
```

### Step 3 — Manual start (any OS)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python run.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open your browser at **http://localhost:5173**

---

## Configuration

All configuration lives in `backend/.env`. The file is excluded from git — never commit it.

```env
# ── OpenProject ────────────────────────────────────────────────
OPENPROJECT_BASE_URL=https://project.intermesh.net
OPENPROJECT_API_KEY=<your_openproject_api_token>
# Get from: OpenProject → Profile → Access Tokens → Generate API Token

# ── LLM (AI Model) ────────────────────────────────────────────
GROQ_API_KEY=<your_groq_api_key>
# Get free key from: https://console.groq.com → API Keys → Create API Key
LLM_PROVIDER=groq
# Options: groq | gemini | claude

# ── Email Notifications ────────────────────────────────────────
APPS_SCRIPT_URL=<your_email_apps_script_web_app_url>
# Deploy apps_script/Code.gs as a Web App — see Google Apps Script Setup below
EMAIL_DOMAIN=indiamart.com

# ── Google Calendar + Meet ─────────────────────────────────────
GOOGLE_APPS_SCRIPT_URL=<your_calendar_apps_script_web_app_url>
# Deploy skills/indiamart-project-planner/references/apps-script.js as a Web App

# ── Server ─────────────────────────────────────────────────────
PORT=8000
HOST=0.0.0.0
```

---

## Google Apps Script Setup

The email and calendar features use Google Apps Script as a serverless bridge — no Google Cloud Console, no OAuth, no service accounts needed.

### Email Notifications (Code.gs)

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Paste the contents of `apps_script/Code.gs`
3. **Deploy → New Deployment**
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Copy the Web App URL → paste as `APPS_SCRIPT_URL` in `.env`

### Google Calendar + Meet (`apps-script.js`)

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Paste the contents of `skills/indiamart-project-planner/references/apps-script.js`
3. Click **Services (+)** → add **Google Calendar API** → Save
   *(This is required for real Meet links. Without it, the script falls back to basic CalendarApp.)*
4. **Deploy → New Deployment**
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Copy the Web App URL → paste as `GOOGLE_APPS_SCRIPT_URL` in `.env`

> **Note:** Any time you change Apps Script code, you must redeploy: **Deploy → Manage Deployments → Edit → New version → Deploy**

---

## How to Use

### Creating a Ticket

Type a natural language prompt in the chat box. Include:
- What the bug/story is about
- Which project/bucket it belongs to
- Who should be assigned and who is accountable
- Priority (High / Medium / Low)
- Optionally click the paperclip icon to attach screenshots or files

**Example prompts:**

```
Create a High priority bug in Android bucket — tender page goes blank on load.
Assign to Vishal Bairagi, accountable Braj Mohan.

New story in iOS bucket: redesign the profile screen for better UX.
Medium priority, assign Priyanshu Gaurav, accountable Soumya Sarkar.

Create a Low priority improvement in FCP/MDC — optimize search filter API response time.
Assign to Suraj Narayan.
```

The agent will:
1. Show a live progress panel with each step (Resolving members → Creating ticket → Scheduling Meet → Sending emails)
2. Return a result card with the ticket ID, a direct link to open it, meeting time, Join Meet link, and email delivery confirmation

### Analysing a Ticket

Type the ticket number with "analyse" or "RCA" in your message:

```
Analyse ticket #664712
RCA for ticket 663865
Generate test cases for ticket 664745
What's the A/B experiment design for ticket 665000?
```

The agent fetches the full ticket (title, description, all comments, attachments) and returns a structured analysis rendered directly in the chat.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyse a ticket by ID. Body: `{ "ticket_id": 664712 }` |
| `POST` | `/api/create-ticket` | Create a ticket. Multipart form: `prompt` (text) + `files` (optional uploads) |
| `GET` | `/api/projects` | List all available OpenProject projects |
| `GET` | `/api/projects/{id}/members` | List members of a specific project |
| `GET` | `/health` | Health check |

---

## Project Structure

```
Hackathon/
├── README.md                         ← This file
├── start.bat                         ← Windows: double-click to launch everything
│
├── skills/
│   └── indiamart-project-planner/   ← Agent skill definition (agentskills.io format)
│       ├── SKILL.md                  ← Main skill file (name, description, instructions)
│       └── references/
│           ├── apps-script.js        ← Google Calendar + Meet Apps Script (deploy to script.google.com)
│           └── calendar.js           ← Node.js calendar client module
│
├── wiki/
│   └── project.md                   ← Detailed technical specification
│
├── backend/
│   ├── .env                         ← Local only — never committed
│   ├── .env.example                 ← Template for new developers
│   ├── requirements.txt
│   ├── run.py                       ← Entry point: starts Uvicorn
│   └── app/
│       ├── main.py                  ← FastAPI app + CORS config
│       ├── config.py                ← Reads .env via pydantic-settings
│       ├── routes/
│       │   ├── analyze.py           ← POST /api/analyze
│       │   └── create_ticket.py     ← POST /api/create-ticket, GET /api/projects
│       ├── services/
│       │   ├── openproject_service.py  ← All OpenProject API calls
│       │   ├── llm_service.py          ← Groq/Gemini/Claude LLM calls + fallback chain
│       │   ├── notification_service.py ← Gmail notification via Apps Script
│       │   └── calendar_service.py     ← Google Meet scheduling via Apps Script
│       ├── prompts/
│       │   ├── bug_analysis.txt        ← LLM prompt for bug RCA + test cases
│       │   └── story_analysis.txt      ← LLM prompt for A/B hypothesis
│       └── utils/
│           └── parsers.py
│
└── frontend/
    ├── index.html
    ├── vite.config.ts               ← Proxies /api/* to localhost:8000
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                  ← Root: Header + ChatInterface
        ├── main.tsx
        ├── index.css                ← Tailwind base + custom animations
        ├── types/
        │   └── index.ts             ← TypeScript interfaces for all API responses
        ├── services/
        │   └── api.ts               ← axios API client (analyzeTicket, createTicket)
        └── components/
            ├── Header.tsx           ← Top navigation bar
            ├── ChatInterface.tsx    ← Main chat UI (landing, messages, steps panel)
            ├── BugAnalysisView.tsx  ← Renders bug analysis result (test cases, RCA, fix)
            └── StoryAnalysisView.tsx← Renders A/B analysis result (variants, metrics)
```

---

## Key Design Decisions

### Why prompt-only — no dropdowns for project or people?

An AI agent should understand context from natural language. Dropdowns remove the intelligence of the agent. The backend uses two LLM passes:
1. First pass extracts subject, project name, person names from the prompt
2. Second pass fuzzy-matches extracted names against real OpenProject member lists

This means partial names ("Vishal", "Braj"), initials, and minor typos all resolve correctly.

### Why Groq over Gemini or OpenAI?

Gemini's free tier has a rate limit of 0 RPM from Indian IP addresses. OpenAI requires a credit card. Groq is completely free, has no IP restrictions, and Llama 3.3 70B is comparable in quality for structured extraction tasks. The backend has a three-model fallback chain so if one model is rate-limited or decommissioned, the next is tried automatically.

### Why Google Apps Script for email and calendar?

Apps Script runs as the authenticated Google user — no OAuth flow, no service account, no Google Cloud Console setup. The entire integration is a single script file deployed as a Web App. It works on any `@gmail.com` or `@indiamart.com` account with zero infrastructure cost.

### Why is the OpenProject attachment API different from what you'd expect?

The OpenProject v3 API requires the binary upload field to be named `file` (not `attachment`) and the metadata to be a valid JSON string (not a Python dict). These two issues caused silent failures in early versions — the ticket was created but files were not attached.

---

## LLM Fallback Chain

The backend tries models in order and skips rate-limited or decommissioned ones automatically:

```
llama-3.3-70b-versatile  →  llama-3.1-8b-instant  →  compound-beta-mini
```

On rate-limit (HTTP 429): waits 5 seconds, tries next model.
On decommissioned model: skips immediately to the next.

---

## Known Issues and Fixes

| Issue | Root Cause | Fix |
|---|---|---|
| Email sent to wrong address | `construct_email()` adds a dot between first/last name but some users have no-dot emails | Added `_KNOWN_EMAILS` hardcoded dict; `resolve_email()` checks dict first |
| File not appearing in OpenProject Files tab | API field named `attachment` instead of `file`; metadata used Python `str(dict)` instead of `json.dumps()` | Fixed field name and serialization in `upload_attachment()` |
| Groq model decommissioned | `llama-3.1-70b-versatile` was removed by Groq | Removed from fallback list; added `compound-beta-mini` as last resort |
| Only 20 of 178 projects loading | Pagination bug: offset incremented by requested page size (100) instead of actual received count (20) | Fixed to `offset += len(elements)` |
| Android project not found via API | Token only has membership access to a subset of projects | Added `_KNOWN_PROJECTS_CATALOG` hardcoded dict as fallback |
| Calendar invite not appearing in attendee's calendar | Apps Script using `CalendarApp` fallback (no Google Calendar API Advanced Service added) | Added Calendar API under Services in Apps Script — now generates real Meet links |
| Emoji in email subject renders as ?????? | IndiaMART Gmail server strips emoji from subjects | Removed all emoji from `Code.gs` subject strings |

---

## Hackathon Context

This project was built for the **IndiaMART Hackathon 2026** under the theme of AI-powered engineering productivity. The agent skill is defined in `skills/indiamart-project-planner/SKILL.md` following the [agentskills.io](https://agentskills.io) open standard, making it portable across Claude, ChatGPT, Cursor, and VS Code Copilot.

**GitHub repository:** https://github.com/robust-vish/hackathan_prod10X
